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

    const periods = ["5D", "1M", "3M", "1A", "ALL"]
    const USD_BRL_RATE = 5.50

    // Convert data based on currency
    const convertedData = data.map(item => ({
        ...item,
        value: currency === 'USD' ? item.value / USD_BRL_RATE : item.value
    }))

    const formatValue = (val: number) =>
        new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
            style: 'currency',
            currency
        }).format(val)

    const axisFormatter = (val: number) => {
        const kValue = val / 1000
        return currency === 'BRL' ? `R$${kValue.toFixed(0)}k` : `$${kValue.toFixed(0)}k`
    }

    // Mock header values
    const totalProfit = currency === 'USD' ? 1876 / USD_BRL_RATE : 1876

    return (
        <Card className="col-span-1 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-[500px]">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
                <div className="flex flex-col gap-1">
                    <CardTitle className="text-base font-normal text-muted-foreground">Rentabilidade total</CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-emerald-500 font-bold text-sm">+{formatValue(totalProfit)}</span>
                        <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium">
                            +15.6%
                        </span>
                    </div>
                </div>
                <div className="flex gap-1">
                    {periods.map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 text-xs rounded-lg transition-colors ${period === p
                                ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                                : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-zinc-800"
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="h-[380px] w-full pl-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={convertedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                            itemStyle={{ color: '#10b981' }}
                            formatter={(value: number) => [formatValue(value), 'Valor']}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#10b981"
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
