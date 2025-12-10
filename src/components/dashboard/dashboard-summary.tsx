import { getFinancialSummary } from "@/lib/data/dashboard-data"
import { SummaryCards } from "@/components/dashboard/summary-cards"

export async function DashboardSummary() {
    const summary = await getFinancialSummary()

    return (
        <SummaryCards
            balance={summary.balance}
            income={summary.income}
            expenses={summary.expenses}
            investments={summary.investments}
            balanceChange={summary.balanceChange}
            incomeChange={summary.incomeChange}
            expensesChange={summary.expensesChange}
            investmentsChange={summary.investmentsChange}
        />
    )
}
