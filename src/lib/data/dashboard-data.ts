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

    let totalBalance = 0  // Total acumulado (todas as transações)
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

        // Total Balance (All time) - Saldo atual total
        totalBalance += amount

        // Current Month (Fluxo do mês)
        if (tMonth === targetMonth && tYear === targetYear) {
            if (amount > 0) monthIncome += amount
            else monthExpense += Math.abs(amount)
        }

        // Previous Month (Para calcular %)
        if (tMonth === prevMonth && tYear === prevYear) {
            if (amount > 0) lastMonthIncome += amount
            else lastMonthExpense += Math.abs(amount)
        }
    })

    // Saldo do mês anterior (até o final do mês anterior)
    const lastMonthEndBalance = allTransactions
        .filter(t => {
            const tDate = new Date(t.date)
            const endOfPrevMonth = new Date(targetYear, targetMonth, 0) // Last day of prev month
            return tDate <= endOfPrevMonth
        })
        .reduce((sum, t) => sum + Number(t.amount), 0)

    // 3. Get Investments Total (Current Market Value)
    // Uses real-time market quotes for consistency across all screens
    const { data: assets } = await supabase
        .from("assets")
        .select("ticker, quantity, average_price")
        .eq("tenant_id", profile.tenant_id)

    let totalInvestments = 0
    if (assets && assets.length > 0) {
        // Import market service dynamically to avoid circular deps
        const { getMarketQuote } = await import("@/lib/services/market-service")

        // Fetch market quotes in parallel
        const quotePromises = assets.map(asset => getMarketQuote(asset.ticker))
        const quotes = await Promise.all(quotePromises)

        totalInvestments = assets.reduce((sum, asset, index) => {
            const quote = quotes[index]
            // Use market price if available, fallback to average_price
            const price = quote?.regularMarketPrice ?? Number(asset.average_price)
            return sum + (Number(asset.quantity) * price)
        }, 0)
    }

    return {
        balance: totalBalance,  // Saldo = Total acumulado (como no DashPlan)
        income: monthIncome,    // Entradas = Fluxo do mês selecionado
        expenses: monthExpense, // Saídas = Fluxo do mês selecionado
        investments: totalInvestments, // Investimentos = Valor de mercado atual
        // Percentages
        balanceChange: calculateChange(totalBalance, lastMonthEndBalance),
        incomeChange: calculateChange(monthIncome, lastMonthIncome),
        expensesChange: calculateChange(monthExpense, lastMonthExpense),
        investmentsChange: 0
    }
}

/**
 * Returns data for the Revenue/Expense Bar Chart (Last N months, default 12).
 */
export async function getMonthlyHistory(months: number = 12): Promise<MonthlyMetric[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase.from("users").select("tenant_id").eq("id", user.id).single()
    if (!profile) return []

    // Calculate start date (N months ago)
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)

    const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, date")
        .eq("tenant_id", profile.tenant_id)
        .gte("date", startDate.toISOString())
        .order("date", { ascending: true })

    if (!transactions) return []

    // Initialize N months buckets
    const historyMap = new Map<string, MonthlyMetric>()

    for (let i = 0; i < months; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
        const key = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
        historyMap.set(key, { month: key, income: 0, expense: 0 })
    }

    transactions.forEach(t => {
        const d = new Date(t.date)
        const key = `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`

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

export interface PortfolioAsset {
    ticker: string
    name: string
    variation: number    // Ex: 1.94 (percentage)
    price: number        // Current market price
    logourl?: string     // Official logo from Brapi
}

export interface PortfolioPerformance {
    gainers: PortfolioAsset[]  // Top 4 em alta
    losers: PortfolioAsset[]   // Top 4 em baixa
}

/**
 * Returns portfolio top gainers and losers with real-time market quotes.
 * Fetches up to 4 assets per category.
 */
export async function getPortfolioPerformance(): Promise<PortfolioPerformance> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { gainers: [], losers: [] }

    const { data: profile } = await supabase.from("users").select("tenant_id").eq("id", user.id).single()
    if (!profile) return { gainers: [], losers: [] }

    // Fetch assets with positive quantity
    const { data: assets } = await supabase
        .from("assets")
        .select("ticker, name")
        .eq("tenant_id", profile.tenant_id)
        .gt("quantity", 0)

    if (!assets || assets.length === 0) return { gainers: [], losers: [] }

    // Fetch real-time quotes in parallel
    const { getMarketQuote } = await import("@/lib/services/market-service")
    const quoteResults = await Promise.all(
        assets.map(asset => getMarketQuote(asset.ticker))
    )

    // Merge assets with their quotes
    const assetsWithQuotes: PortfolioAsset[] = (assets
        .map((asset, i): PortfolioAsset | null => {
            const quote = quoteResults[i]
            if (!quote) return null
            return {
                ticker: asset.ticker,
                name: asset.name || asset.ticker,
                variation: quote.regularMarketChangePercent ?? 0,
                price: quote.regularMarketPrice ?? 0,
                logourl: quote.logourl,
            }
        })
        .filter(Boolean) as PortfolioAsset[])

    // Sort: gainers descending, losers ascending
    const sorted = [...assetsWithQuotes].sort((a, b) => b.variation - a.variation)
    const gainers = sorted.filter(a => a.variation >= 0).slice(0, 4)
    const losers = sorted.filter(a => a.variation < 0).slice(-4).reverse() // worst first

    return { gainers, losers }
}

export interface MarketItem {
    name: string
    ticker: string
    variation: number  // percentage, e.g. 1.23
    price: number      // in local currency
    currency: string   // 'BRL' or 'USD'
}

// Definitions of market items to show in the Mercado widget
const MARKET_DEFINITIONS = [
    { ticker: "USDBRL=X", name: "Dólar (Comercial)", currency: "BRL" },
    { ticker: "EURBRL=X", name: "Euro (Comercial)",  currency: "BRL" },
    { ticker: "^BVSP",    name: "Ibovespa (Ibov)",   currency: "BRL" },
    { ticker: "IFIX",     name: "Ifix (IND FDO)",    currency: "BRL" },
    { ticker: "BTC",      name: "Bitcoin (BTC)",      currency: "BRL" },
]

/**
 * Returns live market quotes for the Mercado widget.
 * Uses Brapi as primary source; Yahoo Finance as fallback.
 * Bitcoin special-case: Brapi returns BRL price directly. If Brapi fails,
 * Yahoo returns USD price which is multiplied by USDBRL=X rate.
 */
export async function getMarketOverview(): Promise<MarketItem[]> {
    const { getMarketQuote } = await import("@/lib/services/market-service")

    // Fetch all definitions + BTC-USD in parallel (for fallback conversion)
    const nonBtcDefs = MARKET_DEFINITIONS.filter(d => d.ticker !== "BTC")
    const [nonBtcQuotes, btcBrapi, btcUsd] = await Promise.all([
        Promise.all(nonBtcDefs.map(d => getMarketQuote(d.ticker).catch(() => null))),
        getMarketQuote("BTC").catch(() => null),
        getMarketQuote("BTC-USD").catch(() => null),
    ])

    // Determine USDBRL rate from already-fetched quotes
    const usdQuote = nonBtcQuotes[nonBtcDefs.findIndex(d => d.ticker === "USDBRL=X")]
    const usdBrl = usdQuote?.regularMarketPrice ?? 5.85

    // Build Bitcoin item — always show in USD
    let btcItem: MarketItem | null = null
    if (btcUsd && btcUsd.regularMarketPrice > 100) {
        // Yahoo BTC-USD is reliable and already in USD
        btcItem = {
            name: "Bitcoin (BTC)",
            ticker: "BTC-USD",
            variation: btcUsd.regularMarketChangePercent ?? 0,
            price: btcUsd.regularMarketPrice,
            currency: "USD",
        }
    } else if (btcBrapi && btcBrapi.regularMarketPrice > 100) {
        // Brapi returns BRL price — convert back to USD using our USDBRL rate
        btcItem = {
            name: "Bitcoin (BTC)",
            ticker: "BTC",
            variation: btcBrapi.regularMarketChangePercent ?? 0,
            price: btcBrapi.regularMarketPrice / usdBrl,
            currency: "USD",
        }
    }

    // Build all non-BTC items
    const items: MarketItem[] = nonBtcDefs
        .map((def, i): MarketItem | null => {
            const q = nonBtcQuotes[i]
            if (!q) return null
            return {
                name: def.name,
                ticker: def.ticker,
                variation: q.regularMarketChangePercent ?? 0,
                price: q.regularMarketPrice ?? 0,
                currency: def.currency,
            }
        })
        .filter(Boolean) as MarketItem[]

    if (btcItem) items.push(btcItem)

    // Keep original order
    const order = MARKET_DEFINITIONS.map(d => d.ticker)
    return items.sort((a, b) => order.indexOf(a.ticker) - order.indexOf(b.ticker))
}
