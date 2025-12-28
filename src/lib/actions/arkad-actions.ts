
"use server"

import { createClient } from "@/lib/supabase/server"

export async function getRecentChats(limit = 10) {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Fetch history with context_json to identify threads
    const { data, error } = await supabase
        .from('ia_history')
        .select('id, question, created_at, answer, context_json')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) // Fetch more to allow for client-side deduplication

    if (error) {
        console.error("Error fetching recent chats:", error)
        return []
    }

    // Deduplicate by conversation_id (if present) or id
    // We want the LATEST message of each conversation to represent the chat
    // Deduplicate logic
    const seenIds = new Set<string>()
    const uniqueChats = []

    for (const chat of data) {
        const context = chat.context_json as any
        const conversationId = context?.conversation_id

        // Determine the effective ID for this chat item
        // If it's a threaded chat, use conversation_id
        // If it's a legacy chat, use the database ID (stringified)
        const effectiveId = conversationId ? String(conversationId) : String(chat.id)
        const title = context?.thread_title || chat.question

        if (!seenIds.has(effectiveId)) {
            seenIds.add(effectiveId)
            // Push the chat with the effective ID and preserved title
            uniqueChats.push({ ...chat, id: effectiveId, question: title })
        }

        if (uniqueChats.length >= limit) break
    }

    return uniqueChats
}

export async function getChatThread(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Fetch all messages for this conversation_id
    const { data, error } = await supabase
        .from('ia_history')
        .select('id, question, created_at, answer')
        .eq('user_id', user.id)
        .contains('context_json', { conversation_id: conversationId })
        .order('created_at', { ascending: true })

    if (error) {
        console.error("Error fetching chat thread:", error)
        return []
    }

    return data
}

export async function getAIUsage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { count: 0, limit: 100 } // Default limit

    // Count usage for current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count, error } = await supabase
        .from('ia_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString())

    if (error) {
        console.error("Error fetching usage:", error)
        return { count: 0, limit: 100 }
    }

    return {
        count: count || 0,
        limit: 100 // Arbitrary free tier limit for display
    }
}

export async function deleteChat(chatId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('ia_history')
        .delete()
        .eq('id', chatId)
        .eq('user_id', user.id)

    if (error) {
        console.error("Error deleting chat:", error)
        return { error: 'Failed to delete chat' }
    }

    return { success: true }
}

export async function renameChat(chatId: string, newTitle: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('ia_history')
        .update({ question: newTitle }) // Using question as title for now
        .eq('id', chatId)
        .eq('user_id', user.id)

    if (error) {
        console.error("Error renaming chat:", error)
        return { error: 'Failed to rename chat' }
    }

    return { success: true }
}

// --- AI Tools ---

export async function getFinancialSummaryTool() {
    try {
        const { getTransactions } = await import("@/lib/data/transaction-data")
        const { data } = await getTransactions(1, 50)

        // Simple calculation for context
        const recentIncome = data.filter(t => t.type === 'income').reduce((acc, t) => acc + t.value, 0)
        const recentExpense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.value), 0)

        return {
            recent_income: recentIncome,
            recent_expense: recentExpense,
            balance_snapshot: recentIncome - recentExpense,
            last_transactions_count: data.length
        }
    } catch (error) {
        console.error("Tool Error (getFinancialSummary):", error)
        return `Error accessing financial summary: ${error instanceof Error ? error.message : "Unknown error"}`
    }
}

export async function getInvestmentPortfolioTool() {
    try {
        const { getAssets } = await import("./investment-actions")
        const assets = await getAssets()

        // Simplify for LLM
        return assets.map(a => ({
            ticker: a.ticker,
            qty: a.quantity,
            avg_price: a.average_price,
            currency: a.currency,
            type: a.type
        }))
    } catch (error) {
        console.error("Tool Error (getInvestmentPortfolio):", error)
        return `Error accessing investment portfolio: ${error instanceof Error ? error.message : "Unknown error"}`
    }
}

export async function getRecentTransactionsTool(limit = 10, month?: number, year?: number) {
    try {
        console.log(`[Arkad Tool Debug] getRecentTransactionsTool CALLED. limit=${limit}, month=${month}, year=${year}`)
        console.log(`[Arkad Tool] getRecentTransactions request: limit=${limit}, month=${month}, year=${year}`)

        let targetMonth = month
        // Heuristic: If month is 1-12, usually user/LLM means Jan=1. But JS Date is Jan=0.
        // If LLM sends 12 (Dec), and we use it as 12, it is Jan next year.
        // We will assume LLMs might send 1-indexed. e.g. "December" -> 12.
        // If month > 11, it's definitely 1-indexed (or wrong).
        // Safest bet: If LLM is good, it sends 0-11 for "month index".
        // But let's check input range.
        if (typeof month === 'number') {
            // If month is 12, force to 11 (Dec)?
            if (month === 12) targetMonth = 11
        }

        const { getTransactions } = await import("@/lib/data/transaction-data")
        const { data } = await getTransactions(1, limit, targetMonth, year)

        if (!data || data.length === 0) {
            // console.log(`[Arkad Tool] No transactions found.`)
            return "No transactions found matching the criteria."
        }

        // Optimize for LLM Consumption: Return a clear, concise text summary
        // instead of raw JSON which might confuse the model or token limit.
        const header = `Encontrei ${data.length} transações recentes:\n`
        const rows = data.map(t =>
            `- ${t.date}: ${t.name} (${t.category}) | ${t.type === 'expense' ? 'Despesa' : 'Receita'} de R$ ${t.value.toFixed(2)}`
        ).join('\n')

        return header + rows
    } catch (error) {
        console.error("Tool Error (getRecentTransactions):", error)
        return `Error accessing transactions: ${error instanceof Error ? error.message : "Unknown error"}`
    }
}

/**
 * Generates context-aware insights for the application widgets without using external AI tokens.
 * 
 * @param type - The context where the widget is displayed ('dashboard', 'finance', 'investments')
 * @returns A string with the insight or null if no insight is relevant.
 */
export async function generateSmartInsight(type: 'dashboard' | 'finance' | 'investments') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    // Fetch Tenant ID (Critical for RLS/Filtering)
    const { data: dbUser } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    const tenant_id = dbUser?.tenant_id
    if (!tenant_id) return null

    try {
        if (type === 'dashboard') {
            // Logic: Compare current month expense vs last month
            const now = new Date()
            const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]

            // Get all transactions since last month
            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount, date, type')
                .eq('tenant_id', tenant_id)
                .gte('date', startOfLastMonth)

            if (!transactions || transactions.length === 0) return "Ainda não tenho dados suficientes para analisar seus gastos."

            // Robust Filter: Check for type='expense' OR negative amount
            const isExpense = (t: any) => t.type === 'expense' || t.amount < 0

            const currentMonthExpenses = transactions
                .filter(t => isExpense(t) && t.date >= startOfCurrentMonth)
                .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0)

            const lastMonthExpenses = transactions
                .filter(t => isExpense(t) && t.date >= startOfLastMonth && t.date < startOfCurrentMonth)
                .reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0)

            if (lastMonthExpenses === 0 && currentMonthExpenses === 0) return "Suas finanças estão tranquilas. Nenhuma despesa recente."

            if (lastMonthExpenses === 0) return `Você já gastou R$ ${currentMonthExpenses.toFixed(2)} este mês. Continue acompanhando.`

            const diff = currentMonthExpenses - lastMonthExpenses
            const percent = ((diff / lastMonthExpenses) * 100)

            // Dynamic Thresholds: Only comment on significant changes (> 10%)
            if (diff > 0) {
                if (percent > 10) {
                    return `Atenção: Seus gastos subiram ${percent.toFixed(0)}% em relação ao mês anterior.`
                }
                return `Seus gastos estão estáveis (+${percent.toFixed(0)}%). Mantenha o controle.`
            } else {
                return `Ótimo trabalho! Você reduziu seus gastos em ${Math.abs(percent).toFixed(0)}% comparado ao mês passado.`
            }
        }

        if (type === 'finance') {
            // Logic: Top Expense Category
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount, categories(name)')
                .eq('tenant_id', tenant_id)
                .lt('amount', 0) // Expenses
                .gte('date', startOfMonth)

            if (!transactions || transactions.length === 0) return "Sua fatura está limpa este mês. Nenhuma despesa registrada."

            const categoryTotals: Record<string, number> = {}
            transactions.forEach(t => {
                // @ts-ignore
                const catName = t.categories?.name || 'Outros'
                categoryTotals[catName] = (categoryTotals[catName] || 0) + Math.abs(Number(t.amount))
            })

            const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

            if (topCategory && topCategory[1] > 0) {
                return `Seu maior foco de gastos é ${topCategory[0]} (R$ ${topCategory[1].toLocaleString('pt-BR')}).`
            } else {
                return "Gastos bem distribuídos."
            }
        }

        if (type === 'investments') {
            // Logic: Asset Count / Diversification
            const { data: assets } = await supabase
                .from('assets')
                .select('id, type, quantity')
                .eq('tenant_id', tenant_id)
                .gt('quantity', 0)

            const count = assets?.length || 0

            if (count === 0) return "Sua carteira está vazia. Que tal começar a investir hoje?"

            // Analyze Diversification
            const types = new Set(assets?.map(a => a.type)).size

            if (count > 2 && types < 2) {
                return `Você possui ${count} ativos, mas pouca diversificação de tipos. Considere variar sua carteira.`
            }

            return `Você possui ${count} ativos em carteira. Lembre-se: diversificação é a chave para segurança.`
        }

    } catch (err) {
        console.error("Smart Insight Error:", err)
        return null
    }

    return null
}
