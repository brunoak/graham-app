"use client"

/**
 * @fileoverview Transactions Page Client Wrapper
 * 
 * This component manages the shared month state between:
 * - SummaryCardsClient (top cards)
 * - TransactionsTable (transaction list)
 * 
 * Both components sync to the same month for consistent data display.
 */

import { useState, useEffect } from "react"
import { SummaryCardsClient } from "@/components/dashboard/summary-cards-client"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { ArkadWidget } from "@/components/arkad/arkad-widget"
import { TransactionDTO } from "@/lib/data/transaction-data"

interface TransactionsPageClientProps {
    initialTransactions: TransactionDTO[]
    totalCount: number
}

export function TransactionsPageClient({
    initialTransactions,
    totalCount,
}: TransactionsPageClientProps) {
    const [currentDate, setCurrentDate] = useState(new Date())

    const handleDateChange = (newDate: Date) => {
        setCurrentDate(newDate)
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Summary Cards - synced with month */}
            <SummaryCardsClient
                externalDate={currentDate}
                onDateChange={handleDateChange}
                showNavigation={false}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Transactions Table - 75% width */}
                <div className="lg:col-span-3">
                    <TransactionsTable
                        transactions={initialTransactions}
                        totalCount={totalCount}
                        externalDate={currentDate}
                        onDateChange={handleDateChange}
                    />
                </div>

                {/* Arkad AI Widget - 25% width */}
                <div className="lg:col-span-1">
                    <ArkadWidget type="finance" />
                </div>
            </div>
        </div>
    )
}
