'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
    investmentTransactionSchema,
    assetSchema,
    type InvestmentTransaction,
    type Asset
} from "@/lib/schemas/investment-schema"

// Helper to get authorized user and tenant
async function getAuthenticatedUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

    if (!profile) throw new Error("Profile not found")

    return { supabase, user, tenant_id: profile.tenant_id }
}

export async function getAssets() {
    const { supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
        .from("assets")
        .select("*")
        .gt("quantity", 0) // Hide sold/zero positions
        .order("quantity", { ascending: false })

    if (error) {
        console.error("Error fetching assets:", error)
        return []
    }

    return data as Asset[]
}

export async function getAssetByTicker(ticker: string) {
    const { supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("ticker", ticker.toUpperCase())
        .single()

    if (error) return null
    return data as Asset
}

export async function createInvestmentTransaction(input: InvestmentTransaction & { assetType?: string, assetName?: string, currency?: string }) {
    const { supabase, tenant_id } = await getAuthenticatedUser()

    // 1. Validate Input
    const validation = investmentTransactionSchema.safeParse(input)
    if (!validation.success) {
        throw new Error(`Dados inválidos: ${validation.error.issues[0].message}`)
    }
    const tx = validation.data

    // 2. Fetch Existing Asset to Calculate Updates
    const { data: existingAsset } = await supabase
        .from("assets")
        .select("*")
        .eq("ticker", tx.ticker)
        .single()

    let newQuantity = 0
    let newAvgPrice = 0
    let assetId = existingAsset?.id

    // 3. Logic: Buy vs Sell
    // 3. Logic: Buy vs Sell vs Dividend
    if (tx.type === 'buy') {
        const currentQty = existingAsset?.quantity || 0
        const currentAvg = existingAsset?.average_price || 0

        const totalCostOld = currentQty * currentAvg
        const totalCostNew = (tx.quantity * tx.price) + (tx.fees || 0) // Include fees in cost base

        newQuantity = currentQty + tx.quantity
        newAvgPrice = (totalCostOld + totalCostNew) / newQuantity
    } else if (tx.type === 'dividend') {
        // Dividend Logic
        if (!existingAsset || existingAsset.quantity <= 0) throw new Error("Não é possível adicionar dividendos para um ativo que você não possui na carteira.")

        // Asset Quantity/Price do NOT change
        newQuantity = existingAsset.quantity
        newAvgPrice = existingAsset.average_price
    } else {
        // Sell
        if (!existingAsset) throw new Error("Não é possível vender um ativo que você não possui.")

        if (existingAsset.quantity < tx.quantity) throw new Error("Quantidade insuficiente para venda.")

        newQuantity = existingAsset.quantity - tx.quantity
        newAvgPrice = existingAsset.average_price // PM does NOT change on sell
    }

    // 4. Update or Create Asset
    if (existingAsset) {
        if (newQuantity === 0 && tx.type !== 'dividend') {
            // Optional: Delete asset or keep with 0? usually keep with 0 for history.
            // Updating to 0
        }

        const { error: assetError } = await supabase
            .from("assets")
            .update({
                quantity: newQuantity,
                average_price: newAvgPrice,
                // Update type and currency to fix any legacy/mismatched data
                type: input.assetType || existingAsset.type,
                currency: input.currency || existingAsset.currency,
                last_update: new Date(),
                updated_at: new Date()
            })
            .eq("id", existingAsset.id)

        if (assetError) throw new Error("Erro ao atualizar carteira: " + assetError.message)
    } else {
        // Create new Asset (only possible if Buy)
        if (tx.type === 'sell' || tx.type === 'dividend') throw new Error("Erro lógico: Operação sem ativo.")

        const { data: newAsset, error: createError } = await supabase
            .from("assets")
            .insert({
                tenant_id,
                ticker: tx.ticker,
                name: input.assetName || tx.ticker,
                type: input.assetType || 'stock_br', // Default fallback
                quantity: newQuantity,
                average_price: newAvgPrice,
                currency: input.currency || 'BRL',
                last_update: new Date()
            })
            .select()
            .single()

        if (createError) throw new Error("Erro ao criar ativo: " + createError.message)
        if (!newAsset) throw new Error("Erro crítico: Ativo criado mas retorno nulo.")

        assetId = newAsset.id
    }

    // 5. Insert Transaction Record
    const { error: txError } = await supabase
        .from("investment_transactions")
        .insert({
            tenant_id,
            asset_id: assetId,
            ticker: tx.ticker,
            type: tx.type,
            date: tx.date,
            quantity: tx.quantity,
            price: tx.price,
            fees: tx.fees,
            total: (tx.quantity * tx.price) + (tx.fees || 0),
            currency: input.currency || 'BRL'
        })

    if (txError) {
        // Critical: Asset Updated but Tx failed. Data inconsistency.
        // In a real app we need rollback. 
        console.error("Critical Error: Asset updated but Transaction failed.", txError)
        throw new Error(`Erro ao salvar transação: ${txError.message} (${txError.code})`)
    }

    // 6. SPECIAL: If Dividend, create Financial Transaction (Income)
    if (tx.type === 'dividend') {
        const { createTransaction } = await import("./transaction-actions")
        try {
            await createTransaction({
                type: "income",
                amount: (tx.quantity * tx.price), // Total Dividend
                name: `${tx.ticker} - Proventos`,
                date: tx.date,
                category: "Dividendos", // Will find or create
                via: "Conta Investimento", // Fallback or need to ask user? Dialog has 'institution' but generic.
                currency: (input.currency as "BRL" | "USD") || 'BRL'
            })
        } catch (e) {
            console.error("Erro ao criar transação financeira para dividendo:", e)
            // Non-blocking? User might want to know.
            // Let's non-block but log. Or throw? 
            // Better to throw so they know 'Proventos' chart might miss it.
            // But main asset logic worked.
            // Let's log prominent warning.
        }
    }

    revalidatePath("/dashboard/investments")
    return { success: true }
}

export async function getInvestmentTransactions(ticker?: string) {
    const { supabase } = await getAuthenticatedUser()

    let query = supabase
        .from("investment_transactions")
        .select("*")
        .order("date", { ascending: false })

    if (ticker) {
        query = query.eq("ticker", ticker)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching transactions:", error)
        return []
    }

    return data as InvestmentTransaction[]
}

export async function deleteInvestmentTransaction(transactionId: string) {
    const { supabase } = await getAuthenticatedUser()

    // 1. Fetch Transaction
    const { data: tx, error: txError } = await supabase
        .from("investment_transactions")
        .select("*")
        .eq("id", transactionId)
        .single()

    if (txError || !tx) throw new Error("Transação não encontrada.")

    // 2. Fetch Asset
    const { data: asset, error: assetError } = await supabase
        .from("assets")
        .select("*")
        .eq("id", tx.asset_id)
        .single()

    if (assetError || !asset) throw new Error("Ativo não encontrado.")

    let newQuantity = 0
    let newAvgPrice = 0

    // 3. Logic to Revert (Inverse of Create)
    if (tx.type === 'buy') {
        // Reverting a Buy: Reduce Qty, Recalculate PM
        // Current Total Cost = Asset.Qty * Asset.Avg
        // Tx Cost = Tx.Qty * Tx.Price + Fees
        // Original Total Cost (Before Buy) = Current Total - Tx Cost
        // Original Qty = Asset.Qty - Tx.Qty

        newQuantity = asset.quantity - tx.quantity

        if (newQuantity < 0) {
            throw new Error("Não é possível excluir esta compra pois as ações já foram vendidas (Saldo ficaria negativo).")
        }

        if (newQuantity === 0) {
            newAvgPrice = 0
        } else {
            const currentTotalCost = asset.quantity * asset.average_price
            const txCost = (tx.quantity * tx.price) + (tx.fees || 0)
            const originalTotalCost = currentTotalCost - txCost

            // Protection against negative cost due to floating point or data errors
            newAvgPrice = originalTotalCost > 0 ? originalTotalCost / newQuantity : 0
        }

    } else {
        // Reverting a Sell: Increase Qty, Keep PM (mostly)
        // Actually, strictly speaking, if we sell, PM doesn't change.
        // So if we "un-sell" (buy back effectively but at original price?), PM still shouldn't change...
        // Wait, if I sell 10 @ 20, PM was 10.
        // I undo that. I have +10 shares. They should come back at PM 10.
        // So Yes, PM stays the same.

        newQuantity = asset.quantity + tx.quantity
        newAvgPrice = asset.average_price
    }

    // 4. Update Asset
    const { error: updateError } = await supabase
        .from("assets")
        .update({
            quantity: newQuantity,
            average_price: newAvgPrice,
            last_update: new Date(),
            updated_at: new Date()
        })
        .eq("id", asset.id)

    if (updateError) throw new Error("Erro ao atualizar ativo: " + updateError.message)

    // 5. Delete Transaction
    const { error: deleteError } = await supabase
        .from("investment_transactions")
        .delete()
        .eq("id", transactionId)

    if (deleteError) throw new Error("Erro ao excluir transação: " + deleteError.message)

    revalidatePath("/dashboard/investments")
    return { success: true }
}

export async function updateInvestmentTransaction(transactionId: string, input: InvestmentTransaction) {
    // Strategy: Revert old (Delete Logic without DB delete) + Apply New (Create Logic without DB insert)
    // To be safe and atomic, we could wrap in a transaction, but Supabase HTTP api doesn't support complex transactions easily.
    // We will do "Optimistic" calculation.

    // For V1 MVP: simple "Delete then Create" is safer for logic correctness, even if ID changes?
    // User requested "Edit" which implies ID stays same.
    // Let's implement manually.

    // 1. Revert Old
    // ... call revert logic ... (Code duplication is bad, but extracting revert logic is cleaner)
    // For now, I'll call deleteInvestmentTransaction to revert state, then update the row, then re-apply state.
    // BUT deleteInvestmentTransaction deletes the row.
    // Let's copy the "Revert Math" part.

    const { supabase } = await getAuthenticatedUser()

    const { data: oldTx } = await supabase.from("investment_transactions").select("*").eq("id", transactionId).single()
    if (!oldTx) throw new Error("Transação original não encontrada")

    const { data: asset } = await supabase.from("assets").select("*").eq("id", oldTx.asset_id).single()
    if (!asset) throw new Error("Ativo não encontrado")

    // --- STEP A: REVERT OLD STATE (In Memory) ---
    let tempQuantity = asset.quantity
    let tempAvgPrice = asset.average_price
    let tempTotalCost = tempQuantity * tempAvgPrice

    if (oldTx.type === 'buy') {
        tempQuantity = tempQuantity - oldTx.quantity
        if (tempQuantity < 0) throw new Error("Impossível editar: Saldo ficaria negativo ao remover a compra original.")

        const oldTxCost = (oldTx.quantity * oldTx.price) + (oldTx.fees || 0)
        let tempOriginalCost = tempTotalCost - oldTxCost

        // Correct floating point drift?
        if (tempOriginalCost < 0.01) tempOriginalCost = 0

        tempAvgPrice = tempQuantity > 0 ? tempOriginalCost / tempQuantity : 0

    } else {
        // Revert Sell = Add back
        tempQuantity = tempQuantity + oldTx.quantity
        // PM stays same
    }

    // --- STEP B: APPLY NEW STATE (In Memory) ---
    let finalQuantity = tempQuantity
    let finalAvgPrice = tempAvgPrice
    let tempCost = finalQuantity * finalAvgPrice

    if (input.type === 'buy') {
        const newTxCost = (input.quantity * input.price) + (input.fees || 0)

        finalQuantity = tempQuantity + input.quantity
        finalAvgPrice = (tempCost + newTxCost) / finalQuantity

    } else {
        // Apply Sell
        if (tempQuantity < input.quantity) throw new Error("Quantidade insuficiente para a nova venda.")

        finalQuantity = tempQuantity - input.quantity
        // PM stays same
    }

    // --- STEP C: UPDATE DB ---
    // Update Asset
    const { error: assetUpdateError } = await supabase
        .from("assets")
        .update({
            quantity: finalQuantity,
            average_price: finalAvgPrice,
            updated_at: new Date()
        })
        .eq("id", asset.id)

    if (assetUpdateError) throw new Error("Erro ao atualizar ativo: " + assetUpdateError.message)

    // Update Transaction
    const { error: txUpdateError } = await supabase
        .from("investment_transactions")
        .update({
            ticker: input.ticker,
            type: input.type, // Usually shouldn't change type but... permission granted
            date: input.date,
            quantity: input.quantity,
            price: input.price,
            fees: input.fees,
            total: (input.quantity * input.price) + (input.fees || 0),
            // currency? if input has it
        })
        .eq("id", transactionId)

    if (txUpdateError) throw new Error("Erro ao atualizar transação: " + txUpdateError.message)

    return { success: true }
}

export async function getInvestedCapitalHistory() {
    const { supabase } = await getAuthenticatedUser()

    // Fetch all buy/sell transactions ordered by date
    const { data: transactions, error } = await supabase
        .from("investment_transactions")
        .select("*")
        .order("date", { ascending: true })

    if (error) {
        console.error("Error fetching history:", error)
        return []
    }

    // Bucket by Month
    const monthlyData: Record<string, number> = {}
    let currentInvested = 0

    // Initialize last 12 months with 0 (or previous value) to ensure continuity?
    // For "Invested Capital", it is a cumulative state.
    // Better strategy: Calculate the state for EVERY transaction, then sample the END of each month.

    // 1. Calculate running total for every transaction
    const timeline = transactions.map(tx => {
        const amount = (tx.quantity * tx.price) + (tx.fees || 0)

        if (tx.type === 'buy') {
            currentInvested += amount
        } else if (tx.type === 'sell') {
            // Sell reduces invested capital (releasing cash)
            currentInvested -= amount
        }
        // Dividend strings are ignored for Capital Invested calculation
        return { date: new Date(tx.date), value: currentInvested }
    })

    // 2. Group by Month (Last value of the month)
    // Generate timestamps for the last 12 months
    const now = new Date()
    const result = []

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = d.toLocaleString('pt-BR', { month: 'short' })
        const monthKey = monthName.charAt(0).toUpperCase() + monthName.slice(1) // Jan, Fev...

        // Find the last value BEFORE or IN this month
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0)

        let lastValue = 0
        // Find latest transaction before endOfMonth
        const relevant = timeline.filter(t => t.date <= endOfMonth)
        if (relevant.length > 0) {
            lastValue = relevant[relevant.length - 1].value
        }

        result.push({ name: monthKey, value: lastValue })
    }

    return result
}

export async function getDividendHistory() {
    const { supabase } = await getAuthenticatedUser()

    // 1. Fetch Dividend Transactions directly from Investments
    // Decoupled from Financial Control (transactions table)
    const { data: dividendTxs, error } = await supabase
        .from("investment_transactions")
        .select("total, date, ticker")
        .eq("type", "dividend")
        .order("date", { ascending: true })

    if (error) {
        console.error("Error fetching dividends:", error)
        return []
    }

    const result = []
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = d.toLocaleString('pt-BR', { month: 'short' })
        const monthKey = monthName.charAt(0).toUpperCase() + monthName.slice(1)

        // Filter txs for this month
        const monthlyTxs = dividendTxs.filter((tx: any) => {
            const txDate = new Date(tx.date)
            return txDate.getMonth() === d.getMonth() && txDate.getFullYear() === d.getFullYear()
        })

        // Calculate Total
        const total = monthlyTxs.reduce((sum: number, tx: any) => sum + tx.total, 0)

        // Calculate Breakdown
        const breakdownMap: Record<string, number> = {}
        monthlyTxs.forEach((tx: any) => {
            const t = tx.ticker || "Outros"
            breakdownMap[t] = (breakdownMap[t] || 0) + tx.total
        })

        const breakdown = Object.entries(breakdownMap)
            .map(([ticker, value]) => ({ ticker, value }))
            .sort((a, b) => b.value - a.value) // Highest payers first

        result.push({ name: monthKey, value: total, breakdown })
    }

    return result
}
