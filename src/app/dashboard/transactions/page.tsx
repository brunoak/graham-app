import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { DashboardSummary } from "@/components/dashboard/dashboard-summary"
import { ArkadWidget } from "@/components/arkad/arkad-widget"
import { getTransactions } from "@/lib/data/transaction-data"

export default async function TransactionsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }


    const { data: transactions, total } = await getTransactions(1, 10)

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col space-y-2">
                {/* <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Controle Financeiro</h2> */}
            </div>

            {/* Top Cards */}
            {/* Top Cards */}
            <DashboardSummary />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Transactions Table - 75% width */}
                <div className="lg:col-span-3">
                    <TransactionsTable transactions={transactions} totalCount={total} />
                </div>

                {/* Arkad AI Widget - 25% width */}
                <div className="lg:col-span-1">
                    <ArkadWidget type="finance" />
                </div>
            </div>
        </div>
    )
}
