import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TransactionsPageClient } from "@/components/transactions/transactions-page-client"
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
        <TransactionsPageClient
            initialTransactions={transactions}
            totalCount={total}
        />
    )
}
