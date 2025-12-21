import { getFinancialSummary } from "@/lib/data/dashboard-data"
import { SummaryCards } from "@/components/dashboard/summary-cards"

interface DashboardSummaryProps {
    investmentsValue?: number
}

export async function DashboardSummary({ investmentsValue }: DashboardSummaryProps) {
    const summary = await getFinancialSummary()

    // Override with Real-Time Data if provided
    if (investmentsValue !== undefined) {
        summary.investments = investmentsValue
    }

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
