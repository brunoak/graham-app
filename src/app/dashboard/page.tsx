import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RevenueWidget } from "@/components/dashboard/revenue-widget"
import { TransactionsTable } from "@/components/dashboard/transactions-table"
import { ArkadWidget } from "@/components/dashboard/arkad-widget"
import { InvestmentsOverview } from "@/components/dashboard/investments-overview"

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Mock data - In the future we will fetch this from the database
    const financialData = {
        balance: 12500.00,
        income: 8500.00,
        expenses: 3200.00,
        investments: 150000.00
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboards</h2>
            </div>

            {/* Top Cards */}
            <SummaryCards
                balance={financialData.balance}
                income={financialData.income}
                expenses={financialData.expenses}
                investments={financialData.investments}
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
                    <TransactionsTable />
                </div>
            </div>
        </div>
    )
}
