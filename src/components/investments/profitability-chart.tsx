"use client"

import { useTheme } from "next-themes"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

interface ProfitabilityChartProps {
    currency?: string
    totalValue?: number
    historyData: { name: string, value: number }[]
    dividendData: { name: string, value: number, breakdown?: { ticker: string, value: number }[] }[]
    exchangeRate?: number
}

export function ProfitabilityChart({
    currency = 'BRL',
    totalValue = 0,
    historyData = [],
    dividendData = [],
    exchangeRate
}: ProfitabilityChartProps) {
    const { theme } = useTheme()
    const [viewMode, setViewMode] = useState<"profitability" | "dividends">("profitability")

    const USD_BRL_RATE = exchangeRate || 5.50

    // Sync Chart with Header: Force the last data point to match totalValue (Real Equity)
    // This bridges the gap between "Historical Invested Capital" and "Current Market Value"
    const syncedHistoryData = [...historyData]
    if (syncedHistoryData.length > 0 && totalValue > 0) {
        const lastIdx = syncedHistoryData.length - 1
        syncedHistoryData[lastIdx] = {
            ...syncedHistoryData[lastIdx],
            value: totalValue
        }
    }

    const activeRawData = viewMode === "profitability" ? syncedHistoryData : dividendData

    const isEmpty = activeRawData.length === 0 || activeRawData.every(d => d.value === 0)

    // Header Values Logic
    // If showing Profitability, show Total Portfolio Value. If Dividends, show Sum of viewed data? Or Last Month?
    // Usually "Dividends" chart header shows "Total Received in Period" or "Last Month".
    // Let's show "Total in Period" for Dividends.

    let displayValueRaw = 0
    let percentage = "+0.0%"

    if (viewMode === "profitability") {
        displayValueRaw = totalValue
        // Calc percentage growth of Invested Capital? 
        // Or just hardcode since it's "Invested" not "Profit" yet.
        // Let's compare Last vs First point
        if (historyData.length > 1) {
            const start = historyData[0].value
            const end = historyData[historyData.length - 1].value
            if (start > 0) {
                const diff = ((end - start) / start) * 100
                percentage = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`
            }
        }
    } else {
        // Dividends: Show Sum of 12 months
        displayValueRaw = dividendData.reduce((acc, curr) => acc + curr.value, 0)
        // Percentage? Comparison to previous year? We don't have it.
        // Comparison first vs last month?
        if (dividendData.length > 1) {
            const start = dividendData[0].value
            const end = dividendData[dividendData.length - 1].value
            if (start > 0) {
                const diff = ((end - start) / start) * 100
                percentage = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`
            }
        }
    }

    const displayValue = currency === 'USD' ? displayValueRaw / USD_BRL_RATE : displayValueRaw


    // Convert data based on currency
    // If empty, use placeholder flat/gentle curve data
    const placeholderData = [
        { name: "Jan", value: 40 },
        { name: "Fev", value: 30 },
        { name: "Mar", value: 20 },
        { name: "Abr", value: 27 },
        { name: "Mai", value: 18 },
        { name: "Jun", value: 23 },
        { name: "Jul", value: 34 },
        { name: "Ago", value: 40 },
        { name: "Set", value: 30 },
        { name: "Out", value: 50 },
        { name: "Nov", value: 40 },
        { name: "Dez", value: 60 },
    ]

    const currentData = isEmpty ? placeholderData : activeRawData

    const convertedData = currentData.map(item => ({
        ...item,
        value: currency === 'USD' ? item.value / USD_BRL_RATE : item.value
    }))

    const formatValue = (val: number) =>
        new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
            style: 'currency',
            currency
        }).format(val)

    const axisFormatter = (val: number) => {
        // Adapt k/M suffix based on scale
        if (val < 1000) return val.toFixed(0)
        const kValue = val / 1000
        return currency === 'BRL' ? `R$${kValue.toFixed(0)}k` : `$${kValue.toFixed(0)}k`
    }

    return (
        <Card className="col-span-1 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-[500px]">
            <CardHeader className="flex flex-col gap-6 pb-2">
                {/* Header Top: Title (Left) + Toggle (Right) */}
                <div className="w-full flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        {viewMode === "profitability" ? "Rentabilidade Total" : "Proventos Recebidos"}
                    </CardTitle>

                    {/* Custom Toggle */}
                    <div className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg flex items-center gap-1">
                        <button
                            onClick={() => setViewMode("profitability")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === "profitability"
                                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                        >
                            Rentabilidade
                        </button>
                        <button
                            onClick={() => setViewMode("dividends")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === "dividends"
                                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                }`}
                        >
                            Proventos
                        </button>
                    </div>
                </div>

                {/* Header Bottom: Value Only */}
                <div className="flex flex-row items-end justify-between">
                    <div className="flex items-center gap-2">
                        {isEmpty ? (
                            // Skeleton Values
                            <>
                                <span className="text-gray-300 dark:text-zinc-700 font-bold text-2xl tracking-tight">
                                    {formatValue(0)}
                                </span>
                                <span className="bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600 text-xs px-2 py-0.5 rounded-full font-medium mb-1">
                                    0.0%
                                </span>
                            </>
                        ) : (
                            <>
                                <span className={`${viewMode === "profitability" ? "text-emerald-500" : "text-blue-500"} font-bold text-2xl tracking-tight`}>
                                    {viewMode === "profitability" ? "" : ""}{formatValue(displayValue)}
                                </span>
                                <span className={`
                                    ${viewMode === "profitability"
                                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                        : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                    }
                                    text-xs px-2 py-0.5 rounded-full font-medium mb-1
                                `}>
                                    {percentage}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-[380px] w-full pl-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={convertedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor={isEmpty ? "#e5e7eb" : (viewMode === "profitability" ? "#10b981" : "#3b82f6")}
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="95%"
                                    stopColor={isEmpty ? "#e5e7eb" : (viewMode === "profitability" ? "#10b981" : "#3b82f6")}
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#eee'} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: isEmpty ? '#d1d5db' : '#888', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: isEmpty ? '#d1d5db' : '#888', fontSize: 12 }}
                            tickFormatter={axisFormatter}
                        />
                        {!isEmpty && (
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        // Retrieve the original breakdown if available
                                        // "payload.payload" usually contains the original data object passed to Chart
                                        const breakdown = data.breakdown || [];

                                        return (
                                            <div className={`rounded-lg shadow-lg border p-3 ${theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'
                                                }`}>
                                                <p className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">{label}</p>

                                                {/* Breakdown List (Only for Dividends view) */}
                                                {viewMode === "dividends" && breakdown.length > 0 && (
                                                    <div className="space-y-1 mb-3 border-b border-gray-100 dark:border-zinc-800 pb-2">
                                                        {breakdown.map((item: any, idx: number) => {
                                                            // Calculate displayed value based on currency prop logic
                                                            const val = currency === 'USD' ? item.value / USD_BRL_RATE : item.value
                                                            return (
                                                                <div key={idx} className="flex items-center justify-between text-xs gap-4">
                                                                    <span className="text-gray-500 dark:text-gray-400">{item.ticker}</span>
                                                                    <span className="font-medium text-gray-700 dark:text-gray-200">
                                                                        {formatValue(val)}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {/* Total Row */}
                                                <div className="flex items-center justify-between gap-4 mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                                                    <span className={`text-sm font-bold ${viewMode === "profitability" ? "text-emerald-500" : "text-blue-500"
                                                        }`}>
                                                        {viewMode === "profitability" ? "Valor" : "Proventos"}
                                                    </span>
                                                    <span className={`text-sm font-bold ${viewMode === "profitability" ? "text-emerald-500" : "text-blue-500"
                                                        }`}>
                                                        {formatValue(payload[0].value as number)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                        )}
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={isEmpty ? "#d1d5db" : (viewMode === "profitability" ? "#10b981" : "#3b82f6")}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
