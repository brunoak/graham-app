"use server"

import { getFinancialSummary, FinancialSummary } from "@/lib/data/dashboard-data"

/**
 * Server Action to fetch financial summary for a specific month/year.
 * Used by client components that need to fetch data based on user interaction.
 */
export async function fetchFinancialSummary(month: number, year: number): Promise<FinancialSummary> {
    const date = new Date(year, month, 1)
    return await getFinancialSummary(date)
}
