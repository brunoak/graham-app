import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InvestmentsContent } from "@/components/investments/investments-content"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"
import { getAssets, getInvestedCapitalHistory, getDividendHistory } from "@/lib/actions/investment-actions"

export default async function InvestmentsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const [assets, history, dividends] = await Promise.all([
        getAssets(),
        getInvestedCapitalHistory(),
        getDividendHistory()
    ])

    return (
        <InvestmentsContent
            summary={<DashboardSummary />}
            initialAssets={assets}
            historyData={history}
            dividendData={dividends}
        />
    )
}
