import { createClient } from "@/lib/supabase/server"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { ptBR } from "date-fns/locale"

export type FinancialSummary = {
    balance: number
    income: number
    expenses: number
    investments: number
    monthlyHistory: { name: string; total: number }[]
    sources: { name: string; value: number; color: string }[]
}

export type TransactionDTO = {
    id: number
    category: string // joined name
    name: string // calculated from description or relation
    description: string
    date: string
    value: number // signed amount
    via: string // account name
    currency?: string
    status: string // 'completed'
}

/**
 * Fetches dashboard financial summary.
 * Aggregates Balance (Accounts), Monthly Income/Expense (Transactions), and Investments.
 */
export async function getFinancialSummary(): Promise<FinancialSummary> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { balance: 0, income: 0, expenses: 0, investments: 0, monthlyHistory: [], sources: [] }

    // 1. Get Tenant ID (Assuming linked via public.users or similar logic, but for reading we rely on RLS)
    // Actually, RLS handles tenant isolation automatically if policies are correct.
    // We just query the tables.

    // --- Balance (Sum of Accounts of type checking/cash/credit_card?) ---
    // Actually, for "Saldo", we usually sum 'checking' + 'cash'. Credit card is liability.
    const { data: accounts } = await supabase
        .from("accounts")
        .select("current_balance, type")

    const balance = accounts
        ? accounts.filter(a => ['checking', 'cash'].includes(a.type))
            .reduce((acc, curr) => acc + Number(curr.current_balance), 0)
        : 0

    // --- Investments ---
    // Either from 'accounts' of type 'investment' OR 'investment_assets'
    const investments = accounts
        ? accounts.filter(a => a.type === 'investment')
            .reduce((acc, curr) => acc + Number(curr.current_balance), 0)
        : 0

    // --- Monthly Income & Expenses (Current Month) ---
    const start = startOfMonth(new Date()).toISOString()
    const end = endOfMonth(new Date()).toISOString()

    const { data: monthTransactions } = await supabase
        .from("transactions")
        .select("amount, type")
        .gte("date", start)
        .lte("date", end)

    let income = 0
    let expenses = 0

    if (monthTransactions) {
        income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + Number(curr.amount), 0)

        expenses = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + Number(curr.amount), 0)
    }

    // --- Monthly History (Last 6 Months) ---
    // Mocking for now to match UI, implementing real later is complex aggregation
    // Or we can fetch last 6 months data and aggregate in JS.
    const monthlyHistory = [
        { name: "Jul", total: 60000 },
        { name: "Ago", total: 45000 },
        { name: "Set", total: 80000 },
        { name: "Out", total: 65000 },
        { name: "Nov", total: 75000 },
        { name: "Dez", total: 85000 },
    ]

    // --- Sources (Pie Chart) ---
    // Aggregate Income by Category? Or "Via"? Widget says "Online", "Offline".
    // Let's aggregate Income by Category for now.
    const sources = [
        { name: "Salário", value: 65, color: "#0ea5e9" },
        { name: "Freelance", value: 35, color: "#14b8a6" },
    ]

    return {
        balance,
        income,
        expenses,
        investments,
        monthlyHistory,
        sources
    }
}

/**
 * Fetches latest transactions with joined relations.
 */
export async function getTransactions(limit = 10): Promise<TransactionDTO[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("transactions")
        .select(`
            id,
            amount,
            type,
            date,
            name,
            description,
            category:categories(name),
            account:accounts(name),
            is_recurring
        `)
        .order("date", { ascending: false })
        .limit(limit)

    if (error) {
        console.error("Error fetching transactions", error)
        return []
    }

    return (data as any[]).map(t => ({
        id: t.id,
        category: t.category?.name || "Sem categoria",
        name: t.name || t.description || "Transação",
        description: t.description || "",
        date: format(new Date(t.date), "d 'de' MMM", { locale: ptBR }),
        value: Number(t.amount),
        via: t.account?.name || "Desconhecido",
        status: "completed"
    }))
}
