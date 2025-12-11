"use client"

import { useState } from "react"
import { ProfitabilityChart } from "@/components/investments/profitability-chart"
import { InvestmentsTable } from "@/components/investments/investments-table"
import { AllocationDonut } from "@/components/investments/allocation-donut"
import { PortfolioTreemap } from "@/components/investments/portfolio-treemap"
import { MarketMovers } from "@/components/investments/market-movers-list"
import { ArkadWidget } from "@/components/dashboard/arkad-widget"

import { InvestmentsTicker } from "@/components/investments/investments-ticker"

interface InvestmentsContentProps {
    summary: React.ReactNode
}

export function InvestmentsContent({ summary }: InvestmentsContentProps) {
    const [currency, setCurrency] = useState<"BRL" | "USD">("BRL")

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                {/* <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Carteira de Investimentos</h2> */}
            </div>

            {/* Global Summary (Standard) */}
            {summary}

            {/* Global Ticker Marquee */}
            <InvestmentsTicker />


            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Column: Macro View & Details (75%) */}
                <div className="col-span-12 lg:col-span-9 space-y-6">
                    {/* Performance Chart */}
                    <ProfitabilityChart currency={currency} />

                    {/* Heatmap */}
                    <PortfolioTreemap currency={currency} />

                    {/* Main Table */}
                    <InvestmentsTable
                        viewCurrency={currency}
                        onViewCurrencyChange={setCurrency}
                    />
                </div>

                {/* Sidebar (Right Column) - 3/12 */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    {/* Allocation Donut */}
                    <AllocationDonut currency={currency} />

                    {/* Market Movers (Altas e Baixas) */}
                    <MarketMovers />

                    {/* AI Assistant */}
                    <ArkadWidget />
                </div>
            </div>
        </div>
    )
}
