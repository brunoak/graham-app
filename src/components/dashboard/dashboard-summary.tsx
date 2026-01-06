import { getFinancialSummary } from "@/lib/data/dashboard-data"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { getAssets } from "@/lib/actions/investment-actions"
import { getMarketQuote } from "@/lib/services/market-service"

interface DashboardSummaryProps {
    investmentsValue?: number
    /** Month (0-11) to fetch data for. Defaults to current month */
    month?: number
    /** Year to fetch data for. Defaults to current year */
    year?: number
}

export async function DashboardSummary({ investmentsValue, month, year }: DashboardSummaryProps) {
    // Use provided month/year or default to current
    const targetMonth = month ?? new Date().getMonth()
    const targetYear = year ?? new Date().getFullYear()

    // Create date from month/year for the function
    const targetDate = new Date(targetYear, targetMonth, 1)
    const summary = await getFinancialSummary(targetDate)

    // If no override provided, fetch market value from assets
    let finalInvestmentsValue = investmentsValue

    if (finalInvestmentsValue === undefined) {
        try {
            const assets = await getAssets()

            if (assets && assets.length > 0) {
                // Fetch quotes in parallel
                const quotePromises = assets.map(a => getMarketQuote(a.ticker))
                const quotes = await Promise.all(quotePromises)

                let totalMarketValue = 0
                assets.forEach((asset, index) => {
                    const quantity = Number(asset.quantity)
                    const avgPrice = Number(asset.average_price)
                    const quote = quotes[index]
                    const currentPrice = quote?.regularMarketPrice ?? avgPrice
                    totalMarketValue += quantity * currentPrice
                })

                finalInvestmentsValue = totalMarketValue
            } else {
                finalInvestmentsValue = 0
            }
        } catch (error) {
            console.error("[DashboardSummary] Error fetching market value:", error)
            finalInvestmentsValue = summary.investments // Fallback to cost basis
        }
    }

    return (
        <SummaryCards
            balance={summary.balance}
            income={summary.income}
            expenses={summary.expenses}
            investments={finalInvestmentsValue}
            balanceChange={summary.balanceChange}
            incomeChange={summary.incomeChange}
            expensesChange={summary.expensesChange}
            investmentsChange={summary.investmentsChange}
        />
    )
}
