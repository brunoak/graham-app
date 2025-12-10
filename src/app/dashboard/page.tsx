import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"
import { RevenueWidget } from "@/components/dashboard/revenue-widget"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { ArkadWidget } from "@/components/dashboard/arkad-widget"
import { InvestmentsOverview } from "@/components/dashboard/investments-overview"
import { getFinancialSummary, getMonthlyHistory, getCategoryBreakdown } from "@/lib/data/dashboard-data"
import { getTransactions } from "@/lib/data/transaction-data"

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // const summary = await getFinancialSummary() // Moved to DashboardSummary component
    const monthlyHistory = await getMonthlyHistory()
    const categoryBreakdown = await getCategoryBreakdown()
    const { data: transactions } = await getTransactions(1, 5)

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                {/* <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboards</h2> */}
            </div>

            {/* Top Cards */}
            {/* Top Cards */}
            <DashboardSummary />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Row 1: Revenue & Arkad */}
                <RevenueWidget
                    monthlyData={monthlyHistory}
                    categoryData={categoryBreakdown}
                />
                <ArkadWidget />

                {/* Row 2: Investments */}
                <div className="col-span-12">
                    <InvestmentsOverview />
                </div>

                {/* Row 3: Recent Transactions */}
                <div className="col-span-12">
                    {/* Row 3: Recent Transactions */}
                    <div className="col-span-12">
                        <TransactionsTable mode="widget" transactions={transactions} />
                    </div>
                </div>
            </div>
        </div>
    )
}
