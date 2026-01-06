"use client"

/**
 * @fileoverview Client-side Summary Cards with month navigation.
 * Syncs across Dashboard, Controle Financeiro, and Investimentos pages.
 */

import { useState, useEffect, useCallback } from "react"
import { format, subMonths, addMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SummaryCards } from "./summary-cards"
import { fetchFinancialSummary } from "@/lib/actions/dashboard-actions"
import { FinancialSummary } from "@/lib/data/dashboard-data"

interface SummaryCardsClientProps {
    /** Initial data from server (optional, for SSR) */
    initialData?: FinancialSummary
    /** Initial date (defaults to current month) */
    initialDate?: Date
    /** Callback when month changes (for syncing with other components) */
    onDateChange?: (date: Date) => void
    /** External date control (when syncing with TransactionsTable) */
    externalDate?: Date
    /** Override investments value with real-time data */
    investmentsOverride?: number
    /** Show month navigation controls */
    showNavigation?: boolean
}

export function SummaryCardsClient({
    initialData,
    initialDate,
    onDateChange,
    externalDate,
    investmentsOverride,
    showNavigation = true,
}: SummaryCardsClientProps) {
    const [currentDate, setCurrentDate] = useState(externalDate || initialDate || new Date())
    const [loading, setLoading] = useState(!initialData)
    const [data, setData] = useState<FinancialSummary | null>(initialData || null)

    // Sync with external date if provided
    useEffect(() => {
        if (externalDate) {
            setCurrentDate(externalDate)
        }
    }, [externalDate])

    // Fetch data when month changes
    const fetchData = useCallback(async (date: Date) => {
        setLoading(true)
        try {
            const month = date.getMonth()
            const year = date.getFullYear()
            const summary = await fetchFinancialSummary(month, year)
            setData(summary)
        } catch (error) {
            console.error("[SummaryCards] Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    // Fetch on mount and when date changes
    useEffect(() => {
        fetchData(currentDate)
    }, [currentDate, fetchData])

    // Navigation handlers
    const goToPreviousMonth = () => {
        const newDate = subMonths(currentDate, 1)
        setCurrentDate(newDate)
        onDateChange?.(newDate)
    }

    const goToNextMonth = () => {
        const newDate = addMonths(currentDate, 1)
        setCurrentDate(newDate)
        onDateChange?.(newDate)
    }

    // Format month/year for display
    const monthLabel = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })

    // Apply overrides
    const displayData = data ? {
        ...data,
        investments: investmentsOverride ?? data.investments,
    } : null

    if (!displayData) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 dark:bg-zinc-800 rounded-lg" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Month Navigation (optional) */}
            {showNavigation && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPreviousMonth}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[150px] text-center capitalize">
                            {monthLabel}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNextMonth}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <SummaryCards
                balance={displayData.balance}
                income={displayData.income}
                expenses={displayData.expenses}
                investments={displayData.investments}
                balanceChange={displayData.balanceChange}
                incomeChange={displayData.incomeChange}
                expensesChange={displayData.expensesChange}
                investmentsChange={displayData.investmentsChange}
            />
        </div>
    )
}
