import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InvestmentsContent } from "@/components/investments/investments-content"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"
import { getAssets, getInvestedCapitalHistory, getDividendHistory } from "@/lib/actions/investment-actions"
import { getMarketQuote, getGlobalIndices, MarketQuote } from "@/lib/services/market-service"

export default async function InvestmentsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const [assets, history, dividends, globalIndices] = await Promise.all([
        getAssets(),
        getInvestedCapitalHistory(),
        getDividendHistory(),
        getGlobalIndices()
    ])

    // Fetch Real-Time Quotes for all assets (Parallel)
    const quotePromises = assets.map(asset => getMarketQuote(asset.ticker))
    const quotesResults = await Promise.all(quotePromises)

    const quotesMap: Record<string, MarketQuote> = {}

    // Build Map & Calculate Total Balance
    let totalRealBalance = 0

    assets.forEach((asset, index) => {
        const quote = quotesResults[index]
        if (quote) {
            quotesMap[asset.ticker] = quote
            totalRealBalance += asset.quantity * quote.regularMarketPrice
        } else {
            // Fallback to average price if quote fails
            totalRealBalance += asset.quantity * asset.average_price
        }
    })

    // If no assets, balance is 0
    if (assets.length === 0) totalRealBalance = 0

    return (
        <InvestmentsContent
            summary={<DashboardSummary investmentsValue={totalRealBalance} />}
            initialAssets={assets}
            historyData={history}
            dividendData={dividends}
            quotes={quotesMap}
            globalIndices={globalIndices}
        />
    )
}
