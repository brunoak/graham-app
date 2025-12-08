import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RevenueWidget } from "@/components/dashboard/revenue-widget"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { ArkadWidget } from "@/components/dashboard/arkad-widget"
import { InvestmentsOverview } from "@/components/dashboard/investments-overview"
import { mockFinancialData } from "@/lib/mock-data"

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                {/* <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboards</h2> */}
            </div>

            {/* Top Cards */}
            <SummaryCards
                balance={mockFinancialData.balance}
                income={mockFinancialData.income}
                expenses={mockFinancialData.expenses}
                investments={mockFinancialData.investments}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Row 1: Revenue & Arkad */}
                <RevenueWidget />
                <ArkadWidget />

                {/* Row 2: Investments */}
                <div className="col-span-12">
                    <InvestmentsOverview />
                </div>

                {/* Row 3: Recent Transactions */}
                <div className="col-span-12">
                    <TransactionsTable mode="widget" />
                </div>
            </div>
        </div>
    )
}
