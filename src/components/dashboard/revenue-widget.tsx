"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    BarChart, Bar, CartesianGrid,
    XAxis, YAxis, ResponsiveContainer, Tooltip, Legend
} from "recharts"

import { MonthlyMetric, CategoryMetric } from "@/lib/data/dashboard-data"
import { ChartSkeleton } from "@/components/ui/chart-skeleton"

type Period = "3M" | "6M" | "1A"

interface RevenueWidgetProps {
    monthlyData: MonthlyMetric[]
    categoryData: CategoryMetric[]
}

// Custom Tooltip para o BarChart
function CustomBarTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-3 shadow-lg text-sm">
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{label}</p>
            {payload.map((entry: any) => (
                <div key={entry.dataKey} className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                    <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                        {`R$ ${Number(entry.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    </span>
                </div>
            ))}
        </div>
    )
}

const PERIOD_MONTHS: Record<Period, number> = {
    "3M": 3,
    "6M": 6,
    "1A": 12,
}

export function RevenueWidget({ monthlyData, categoryData }: RevenueWidgetProps) {
    const [period, setPeriod] = useState<Period>("6M")

    // Filtra os dados no cliente conforme o período selecionado
    const filteredData = monthlyData.slice(-PERIOD_MONTHS[period])

    // Deriva o status diretamente dos dados reais
    const hasData = filteredData.some(m => m.income > 0 || m.expense > 0)

    return (
        <Card className="col-span-12 lg:col-span-8 bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none flex flex-col h-full min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
                <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        Histórico Financeiro
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Comparativo mensal de entradas e saídas</p>
                </div>

                {/* Botões de período: 3M, 6M, 1A */}
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                    {(["3M", "6M", "1A"] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`
                                h-7 w-9 text-xs font-semibold rounded-md transition-all
                                ${period === p
                                    ? "bg-emerald-500 text-white shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                }
                            `}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 pl-0 relative">
                {!hasData && (
                    <ChartSkeleton variant="content" mode="empty" type="area" message="Sem dados de receita para exibir" className="h-full" />
                )}

                {hasData && (
                    <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                        <BarChart
                            data={filteredData}
                            barCategoryGap="30%"
                            barGap={4}
                            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                            <XAxis
                                dataKey="month"
                                stroke="#9CA3AF"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                            />
                            <YAxis
                                stroke="#9CA3AF"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                tickFormatter={(value: number) => {
                                    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`
                                    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`
                                    return `R$ ${value}`
                                }}
                                width={72}
                            />
                            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(156,163,175,0.08)" }} />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                formatter={(value) => (
                                    <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>
                                )}
                            />
                            <Bar
                                dataKey="income"
                                name="Entradas"
                                fill="#22c55e"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                            <Bar
                                dataKey="expense"
                                name="Saídas"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={40}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}
