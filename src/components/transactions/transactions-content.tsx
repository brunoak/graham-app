"use client"

/**
 * @fileoverview Transactions Page Content - Client component that syncs 
 * SummaryCards with TransactionsTable month navigation.
 */

import { useState } from "react"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { SummaryCardsClient } from "@/components/dashboard/summary-cards-client"
import { ArkadWidget } from "@/components/arkad/arkad-widget"
import { TransactionDTO } from "@/lib/data/transaction-data"

interface TransactionsContentProps {
    initialTransactions: TransactionDTO[]
    totalCount: number
}

export function TransactionsContent({
    initialTransactions,
    totalCount
}: TransactionsContentProps) {
    // Shared date state between cards and table
    const [currentDate, setCurrentDate] = useState(new Date())

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Top Cards - synced with table month */}
            <SummaryCardsClient
                externalDate={currentDate}
                onDateChange={setCurrentDate}
                showNavigation={false}  // Navigation is in the table
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Transactions Table - 75% width */}
                <div className="lg:col-span-3">
                    <TransactionsTable
                        transactions={initialTransactions}
                        totalCount={totalCount}
                        externalDate={currentDate}
                        onDateChange={setCurrentDate}
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
