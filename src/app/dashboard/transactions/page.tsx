import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { TransactionDialog } from "@/components/transactions/transaction-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SummaryCards } from "@/components/dashboard/summary-cards" // Reusing
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Upload, Wallet, LineChart, PieChart } from "lucide-react"

export default async function TransactionsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    // Mock data for top cards (reuse or consistent)
    const financialData = {
        balance: 0.00,
        income: 0.00,
        expenses: 0.00,
        investments: 0.00
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                {/* <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Controle Financeiro</h2> */}
            </div>

            {/* Top Cards - Keeping them consistent or simplified? Layout shows them. */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-4">
                <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Saldo</CardTitle>
                        <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">R$ 00,00</div>
                        <p className="text-xs text-emerald-500 mt-1 bg-emerald-100 dark:bg-emerald-900/30 w-fit px-1.5 rounded">0.0%</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Renda total</CardTitle>
                        <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                            <LineChart className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">R$ 00,00</div>
                        <p className="text-xs text-emerald-500 mt-1 bg-emerald-100 dark:bg-emerald-900/30 w-fit px-1.5 rounded">0.0%</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Despesas totais</CardTitle>
                        <div className="h-8 w-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600">
                            <PieChart className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">R$ 00,00</div>
                        <p className="text-xs text-red-500 mt-1 bg-red-100 dark:bg-red-900/30 w-fit px-1.5 rounded">0.0%</p>
                    </CardContent>
                </Card>
                <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Investimentos</CardTitle>
                        <div className="h-8 w-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600">
                            <Wallet className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">R$ 00,00</div>
                        <p className="text-xs text-emerald-500 mt-1 bg-emerald-100 dark:bg-emerald-900/30 w-fit px-1.5 rounded">0.0%</p>
                    </CardContent>
                </Card>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="pesquisar"
                        className="pl-9 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" className="border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 w-full md:w-auto">
                        <Upload className="mr-2 h-4 w-4" /> Importar
                    </Button>
                    <TransactionDialog>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Criar transação
                        </Button>
                    </TransactionDialog>
                </div>
            </div>

            {/* Transactions Table */}
            <TransactionsTable />
        </div>
    )
}
