'use server'

import { createClient } from "@/lib/supabase/server"

/**
 * Represents a closed/sold position with P&L calculations
 */
export interface ClosedPosition {
    id: string
    ticker: string
    assetName: string
    type: string          // stock_br, reit_br, etc
    sellDate: string      // Data da venda
    quantity: number      // Qtd vendida
    buyPrice: number      // PM de compra
    sellPrice: number     // Preço de venda
    fees: number          // Taxas
    result: number        // Lucro/Prejuízo em R$
    resultPercent: number // % de ganho/perda
    totalSold: number     // Valor total vendido
    totalCost: number     // Custo total (PM × Qtd)
}

/**
 * Summary of closed positions for IRPF/DARF
 */
export interface ClosedPositionsSummary {
    totalProfit: number       // Soma dos lucros
    totalLoss: number         // Soma dos prejuízos (negativo)
    netResult: number         // Resultado líquido
    totalSold: number         // Total vendido no período
    estimatedTax: number      // Imposto estimado
    isExempt: boolean         // Se vendas < R$ 20k no mês (para ações)
    byType: {
        type: string
        profit: number
        loss: number
        tax: number
    }[]
}

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

/**
 * Fetches all closed (sold) positions with P&L calculations
 * 
 * @param filters - Optional filters for month and year
 * @returns Array of closed positions sorted by date (newest first)
 */
export async function getClosedPositions(filters?: {
    month?: number
    year?: number
}): Promise<ClosedPosition[]> {
    const { supabase } = await getAuthenticatedUser()

    // 1. Fetch all SELL transactions
    let query = supabase
        .from("investment_transactions")
        .select(`
            id,
            ticker,
            type,
            date,
            quantity,
            price,
            fees,
            total,
            asset_id
        `)
        .eq("type", "sell")
        .order("date", { ascending: false })

    // Apply date filters if provided
    if (filters?.year) {
        const startDate = new Date(filters.year, filters.month ?? 0, 1)
        const endDate = filters.month !== undefined
            ? new Date(filters.year, filters.month + 1, 0)
            : new Date(filters.year, 11, 31)

        query = query
            .gte("date", startDate.toISOString().split('T')[0])
            .lte("date", endDate.toISOString().split('T')[0])
    }

    const { data: sellTransactions, error } = await query

    if (error) {
        console.error("Error fetching sell transactions:", error)
        return []
    }

    if (!sellTransactions || sellTransactions.length === 0) {
        return []
    }

    // 2. Get unique asset IDs to fetch their average prices
    const assetIds = [...new Set(sellTransactions.map(tx => tx.asset_id))]

    const { data: assets } = await supabase
        .from("assets")
        .select("id, ticker, name, type, average_price")
        .in("id", assetIds)

    const assetMap = new Map(assets?.map(a => [a.id, a]) || [])

    // 3. Calculate P&L for each sell transaction
    const closedPositions: ClosedPosition[] = sellTransactions.map(tx => {
        const asset = assetMap.get(tx.asset_id)

        // Get buy price (average price from asset)
        // Note: This is the current PM, which may differ from PM at time of sale
        // For V1, we use current PM as approximation
        const buyPrice = asset?.average_price || 0
        const sellPrice = tx.price
        const quantity = tx.quantity
        const fees = tx.fees || 0

        // Calculate costs and revenue
        const totalCost = buyPrice * quantity
        const totalSold = sellPrice * quantity
        const result = totalSold - totalCost - fees

        // Calculate percentage
        const resultPercent = totalCost > 0
            ? ((sellPrice / buyPrice) - 1) * 100
            : 0

        return {
            id: tx.id,
            ticker: tx.ticker,
            assetName: asset?.name || tx.ticker,
            type: asset?.type || tx.type || 'stock_br',
            sellDate: tx.date,
            quantity,
            buyPrice,
            sellPrice,
            fees,
            result,
            resultPercent,
            totalSold,
            totalCost
        }
    })

    return closedPositions
}

/**
 * Calculates summary of closed positions for IRPF/DARF purposes
 * 
 * Tax Rules (Brazil):
 * - Ações (swing trade): 15% sobre lucro líquido
 * - Ações (day trade): 20% sobre lucro líquido
 * - FIIs: 20% sobre lucro (sem isenção)
 * - Isenção: Vendas < R$ 20.000/mês para ações (não vale para FIIs)
 * - Prejuízos podem ser compensados com lucros futuros (mesmo tipo)
 */
export async function getClosedPositionsSummary(filters?: {
    month?: number
    year?: number
}): Promise<ClosedPositionsSummary> {
    const positions = await getClosedPositions(filters)

    // Group by asset type
    const byType: Record<string, { profit: number; loss: number; totalSold: number }> = {}

    positions.forEach(pos => {
        const type = pos.type
        if (!byType[type]) {
            byType[type] = { profit: 0, loss: 0, totalSold: 0 }
        }

        if (pos.result > 0) {
            byType[type].profit += pos.result
        } else {
            byType[type].loss += pos.result // Already negative
        }
        byType[type].totalSold += pos.totalSold
    })

    // Calculate totals
    let totalProfit = 0
    let totalLoss = 0
    let totalSold = 0
    let estimatedTax = 0

    const byTypeArray = Object.entries(byType).map(([type, data]) => {
        totalProfit += data.profit
        totalLoss += data.loss
        totalSold += data.totalSold

        // Calculate tax based on type
        let taxRate = 0
        let isExemptType = false

        if (type === 'reit_br' || type === 'etf_br') {
            // FIIs and ETFs: 20% tax, no exemption
            taxRate = 0.20
        } else if (type.includes('stock')) {
            // Stocks: 15% tax (swing trade), exempt if < R$ 20k/month sold
            taxRate = 0.15
            isExemptType = data.totalSold < 20000
        } else {
            // Other types: assume 15%
            taxRate = 0.15
        }

        // Only pay tax on net profit
        const netProfit = data.profit + data.loss // loss is negative
        const tax = (!isExemptType && netProfit > 0) ? netProfit * taxRate : 0
        estimatedTax += tax

        return {
            type,
            profit: data.profit,
            loss: data.loss,
            tax
        }
    })

    // Check if stocks are exempt (total stock sales < R$ 20k)
    const stockSales = byType['stock_br']?.totalSold || 0
    const isExempt = stockSales < 20000

    return {
        totalProfit,
        totalLoss,
        netResult: totalProfit + totalLoss,
        totalSold,
        estimatedTax,
        isExempt,
        byType: byTypeArray
    }
}

/**
 * Get available years from transactions for filter dropdown
 */
export async function getAvailableSellYears(): Promise<number[]> {
    const { supabase } = await getAuthenticatedUser()

    const { data } = await supabase
        .from("investment_transactions")
        .select("date")
        .eq("type", "sell")
        .order("date", { ascending: false })

    if (!data) return [new Date().getFullYear()]

    const years = [...new Set(data.map(tx => new Date(tx.date).getFullYear()))]
    return years.length > 0 ? years : [new Date().getFullYear()]
}
