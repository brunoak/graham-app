import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMarketQuote } from "@/lib/services/market-service"

/**
 * API endpoint to get the total investment market value.
 * This is used to sync the investment card across all dashboard pages.
 * Returns market value (current prices) rather than cost basis.
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get tenant
        const { data: profile } = await supabase
            .from("users")
            .select("tenant_id")
            .eq("id", user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ total: 0 })
        }

        // Get all assets with quantity > 0
        const { data: assets } = await supabase
            .from("assets")
            .select("ticker, quantity, average_price")
            .eq("tenant_id", profile.tenant_id)
            .gt("quantity", 0)

        if (!assets || assets.length === 0) {
            return NextResponse.json({
                total: 0,
                costBasis: 0,
                gain: 0,
                gainPercent: 0
            })
        }

        // Fetch quotes in parallel
        const quotePromises = assets.map(a => getMarketQuote(a.ticker))
        const quotes = await Promise.all(quotePromises)

        let totalMarketValue = 0
        let totalCostBasis = 0

        assets.forEach((asset, index) => {
            const quantity = Number(asset.quantity)
            const avgPrice = Number(asset.average_price)
            const quote = quotes[index]
            const currentPrice = quote?.regularMarketPrice ?? avgPrice

            totalCostBasis += quantity * avgPrice
            totalMarketValue += quantity * currentPrice
        })

        const gain = totalMarketValue - totalCostBasis
        const gainPercent = totalCostBasis > 0 ? (gain / totalCostBasis) * 100 : 0

        return NextResponse.json({
            total: totalMarketValue,
            costBasis: totalCostBasis,
            gain,
            gainPercent
        })

    } catch (error) {
        console.error("[API] Error fetching investment total:", error)
        return NextResponse.json({ total: 0, error: "Failed to fetch data" })
    }
}
