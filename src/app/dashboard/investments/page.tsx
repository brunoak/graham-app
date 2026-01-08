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

    // Fetch Real-Time Quotes for tradable assets only (skip fixed income)
    // Fixed income like TESOURO-*, LCI-*, CDB-* don't have market quotes
    const tradableAssets = assets.filter(asset =>
        !['treasure', 'fixed_income'].includes(asset.type)
    )

    const quotePromises = tradableAssets.map(asset => getMarketQuote(asset.ticker))
    const quotesResults = await Promise.all(quotePromises)

    const quotesMap: Record<string, MarketQuote> = {}

    // Build Map from tradable assets
    tradableAssets.forEach((asset, index) => {
        const quote = quotesResults[index]
        if (quote) {
            quotesMap[asset.ticker] = quote
        }
    })

    // Calculate Total Balance (all assets)
    let totalRealBalance = 0

    assets.forEach((asset) => {
        const quote = quotesMap[asset.ticker]
        if (quote) {
            totalRealBalance += asset.quantity * quote.regularMarketPrice
        } else {
            // Fixed income or failed quote: use average price
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
