import { getInvestmentTransactions } from "@/lib/actions/investment-actions"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AssetTransactionRow } from "./asset-transaction-row"

interface AssetTransactionsProps {
    ticker: string
    currency?: string
    tab?: "history" | "dividends"
}

export async function AssetTransactions({ ticker, currency = 'BRL', tab = "history" }: AssetTransactionsProps) {
    const allTransactions = await getInvestmentTransactions(ticker)

    // Filter based on tab
    const transactions = allTransactions.filter(tx => {
        if (tab === "dividends") {
            return tx.type === "dividend"
        } else {
            // History tab: show everything EXCEPT dividends
            return tx.type !== "dividend"
        }
    })

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('pt-BR')
    }

    const formatCurrency = (val: number) => {
        const locale = currency === 'USD' ? 'en-US' : 'pt-BR'
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val)
    }

    return (
        <div className="rounded-md border border-gray-100 dark:border-zinc-800 overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50 dark:bg-zinc-900">
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Operação</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                Nenhuma transação encontrada.
                            </TableCell>
                        </TableRow>
                    ) : (
                        transactions.map((tx) => (
                            <AssetTransactionRow
                                key={tx.id || Math.random().toString()}
                                transaction={tx}
                                currency={currency}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
