"use client"

import { useTheme } from "next-themes"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

const data = [
    { name: "Jan", value: 45000 },
    { name: "Fev", value: 52000 },
    { name: "Mar", value: 49000 },
    { name: "Abr", value: 63000 },
    { name: "Mai", value: 58000 },
    { name: "Jun", value: 71000 },
    { name: "Jul", value: 68000 },
    { name: "Ago", value: 74000 },
    { name: "Set", value: 85000 },
    { name: "Out", value: 92000 },
    { name: "Nov", value: 105000 },
    { name: "Dez", value: 123456 },
]

export function ProfitabilityChart({ currency = 'BRL' }: { currency?: string }) {
    const { theme } = useTheme()
    const [period, setPeriod] = useState("1A")
    const [viewMode, setViewMode] = useState<"profitability" | "dividends">("profitability")

    const periods = ["5D", "1M", "3M", "1A", "ALL"]
    const USD_BRL_RATE = 5.50

    // Mock Dividends Data (Monthly Income)
    const dividendsData = [
        { name: "Jan", value: 450 },
        { name: "Fev", value: 520 },
        { name: "Mar", value: 380 },
        { name: "Abr", value: 920 }, // Quarterly payment bump
        { name: "Mai", value: 480 },
        { name: "Jun", value: 550 },
        { name: "Jul", value: 510 },
        { name: "Ago", value: 890 }, // Quarterly payment bump
        { name: "Set", value: 600 },
        { name: "Out", value: 650 },
        { name: "Nov", value: 720 },
        { name: "Dez", value: 1250 }, // Year end bump
    ]

    const activeRawData = viewMode === "profitability" ? data : dividendsData

    // Convert data based on currency
    const convertedData = activeRawData.map(item => ({
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

    // Header Values Logic
    const totalProfitRaw = 1876 // Fixed for Profitability
    const totalDividendsRaw = dividendsData.reduce((acc, curr) => acc + curr.value, 0) // Sum for Dividends

    const totalValueRaw = viewMode === "profitability" ? totalProfitRaw : totalDividendsRaw
    const totalValue = currency === 'USD' ? totalValueRaw / USD_BRL_RATE : totalValueRaw

    const percentage = viewMode === "profitability" ? "+15.6%" : "+12.4%" // Mock percentages

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
                        <span className={`${viewMode === "profitability" ? "text-emerald-500" : "text-blue-500"} font-bold text-2xl tracking-tight`}>
                            {viewMode === "profitability" ? "+" : ""}{formatValue(totalValue)}
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
                    </div>
                </div>
            </CardHeader>
            <CardContent className="h-[380px] w-full pl-0 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={convertedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={viewMode === "profitability" ? "#10b981" : "#3b82f6"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={viewMode === "profitability" ? "#10b981" : "#3b82f6"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#eee'} />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#888', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#888', fontSize: 12 }}
                            tickFormatter={axisFormatter}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: theme === 'dark' ? '#18181b' : '#fff',
                                borderColor: theme === 'dark' ? '#27272a' : '#e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                            }}
                            itemStyle={{ color: viewMode === "profitability" ? '#10b981' : '#3b82f6' }}
                            formatter={(value: number) => [formatValue(value), viewMode === "profitability" ? 'Valor' : 'Proventos']}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={viewMode === "profitability" ? "#10b981" : "#3b82f6"}
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
