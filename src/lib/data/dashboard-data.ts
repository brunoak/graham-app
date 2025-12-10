import { createClient } from "@/lib/supabase/server"

export interface FinancialSummary {
    balance: number
    income: number
    expenses: number
    investments: number
    balanceChange: number
    incomeChange: number
    expensesChange: number
    investmentsChange: number
}

export interface MonthlyMetric {
    month: string
    income: number
    expense: number
}

export interface CategoryMetric {
    name: string
    value: number
    color: string
}

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

// Helper to calculate percentage change
function calculateChange(current: number, previous: number): number {
    if (Math.abs(previous) < 0.01) return current === 0 ? 0 : 100 // 100% growth if started from ~0
    return ((current - previous) / previous) * 100
}

/**
 * Returns the total balance, income and expense for a given month (or overall if no month provided, theoretically).
 * Currently implemented to return TOTAL BALANCE (all time) and CURRENT MONTH Income/Expense.
 */
export async function getFinancialSummary(date: Date = new Date()): Promise<FinancialSummary> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { balance: 0, income: 0, expenses: 0, investments: 0, balanceChange: 0, incomeChange: 0, expensesChange: 0, investmentsChange: 0 }

    // 1. Get Tenant
    const { data: profile } = await supabase.from("users").select("tenant_id").eq("id", user.id).single()
    if (!profile) return { balance: 0, income: 0, expenses: 0, investments: 0, balanceChange: 0, incomeChange: 0, expensesChange: 0, investmentsChange: 0 }

    // 2. Get All Transactions for Balance and History
    const { data: allTransactions } = await supabase
        .from("transactions")
        .select("amount, type, date")
        .eq("tenant_id", profile.tenant_id)

    if (!allTransactions) return { balance: 0, income: 0, expenses: 0, investments: 0, balanceChange: 0, incomeChange: 0, expensesChange: 0, investmentsChange: 0 }

    let totalBalance = 0
    let monthIncome = 0
    let monthExpense = 0
    let lastMonthIncome = 0
    let lastMonthExpense = 0

    const targetMonth = date.getMonth()
    const targetYear = date.getFullYear()

    // Calculate Previous Month Date
    const prevDate = new Date(targetYear, targetMonth - 1, 1)
    const prevMonth = prevDate.getMonth()
    const prevYear = prevDate.getFullYear()

    allTransactions.forEach(t => {
        const amount = Number(t.amount)
        const tDate = new Date(t.date)
        const tMonth = tDate.getMonth()
        const tYear = tDate.getFullYear()

        // Total Balance (All time)
        totalBalance += amount

        // Current Month
        if (tMonth === targetMonth && tYear === targetYear) {
            if (amount > 0) monthIncome += amount
            else monthExpense += Math.abs(amount)
        }

        // Previous Month
        if (tMonth === prevMonth && tYear === prevYear) {
            if (amount > 0) lastMonthIncome += amount
            else lastMonthExpense += Math.abs(amount)
        }
    })

    // Calculate Net Flow for current month to find Start Balance
    const monthNetFlow = monthIncome - monthExpense
    const startBalance = Number((totalBalance - monthNetFlow).toFixed(2)) // Balance before this month's activity

    return {
        balance: totalBalance,
        income: monthIncome,
        expenses: monthExpense,
        investments: 0,
        // Percentages
        balanceChange: calculateChange(totalBalance, startBalance),
        incomeChange: calculateChange(monthIncome, lastMonthIncome),
        expensesChange: calculateChange(monthExpense, lastMonthExpense),
        investmentsChange: 0
    }
}

/**
 * Returns data for the Revenue/Expense Bar Chart (Last 6 months).
 */
export async function getMonthlyHistory(): Promise<MonthlyMetric[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from("users").select("tenant_id").eq("id", user.id).single()
    if (!profile) return []

    // Calculate start date (6 months ago)
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth() - 5, 1) // Start of 6th month ago

    const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, date")
        .eq("tenant_id", profile.tenant_id)
        .gte("date", startDate.toISOString())
        .order("date", { ascending: true })

    if (!transactions) return []

    // Initialize last 6 months buckets
    const historyMap = new Map<string, MonthlyMetric>()

    for (let i = 0; i < 6; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
        const key = `${MONTHS_PT[d.getMonth()]}`
        historyMap.set(key, { month: key, income: 0, expense: 0 })
    }

    transactions.forEach(t => {
        const d = new Date(t.date)
        const key = MONTHS_PT[d.getMonth()]

        if (historyMap.has(key)) {
            const entry = historyMap.get(key)!
            const val = Number(t.amount)
            if (val > 0) entry.income += val
            else entry.expense += Math.abs(val)
        }
    })

    return Array.from(historyMap.values())
}

/**
 * Returns expenses grouped by category for the Expense Widget.
 */
// Returns expenses grouped by category for the Expense Widget.
export async function getCategoryBreakdown(date: Date = new Date()): Promise<CategoryMetric[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from("users").select("tenant_id").eq("id", user.id).single()
    if (!profile) return []

    // Filter for current month and expenses only
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString()

    const { data: transactions } = await supabase
        .from("transactions")
        .select(`
            amount,
            categories (
                name,
                color,
                icon
            )
        `)
        .eq("tenant_id", profile.tenant_id)
        .lt("amount", 0) // Expenses only
        .gte("date", startOfMonth)
        .lte("date", endOfMonth)

    if (!transactions) return []

    const categoryMap = new Map<string, CategoryMetric>()
    let totalExpenses = 0

    transactions.forEach((t: any) => {
        const amount = Math.abs(Number(t.amount))
        // Use Optional Chaining carefully for joined data
        const catName = t.categories?.name || "Outros"
        // DB stores tailwind class (e.g. text-red-500). Recharts needs Hex usually, OR we handle it in the component. 
        // The `RevenueWidget` (PieChart) likely expects a specific color format. 
        // If it uses Tailwind classes via a custom renderer, that's fine. 
        // But Recharts defaults to 'fill'.
        // Let's assume the UI handles the class, or we pass the class string.
        const catColor = t.categories?.color || "text-gray-500"

        totalExpenses += amount

        if (categoryMap.has(catName)) {
            categoryMap.get(catName)!.value += amount
        } else {
            categoryMap.set(catName, {
                name: catName,
                value: amount,
                color: catColor
            })
        }
    })

    // Convert to array and sort by value desc
    return Array.from(categoryMap.values())
        .sort((a, b) => b.value - a.value)
        .slice(0, 5) // Top 5 categories
}
