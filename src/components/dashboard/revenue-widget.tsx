"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts"
import { Info } from "lucide-react"

import { MonthlyMetric, CategoryMetric } from "@/lib/data/dashboard-data"
import { ChartSkeleton } from "@/components/ui/chart-skeleton"

interface RevenueWidgetProps {
    monthlyData: MonthlyMetric[]
    categoryData: CategoryMetric[]
}

export function RevenueWidget({ monthlyData, categoryData }: RevenueWidgetProps) {
    const [view, setView] = useState<"overview" | "sources">("overview")
    const [status, setStatus] = useState<"loading" | "empty" | "data">("loading")

    // Simulate full lifecycle for demo: Loading -> Empty (Welcome) -> Data
    useEffect(() => {
        // 1. Start loading (Shimmer)
        const timer1 = setTimeout(() => {
            setStatus("empty") // 2. Show "Welcome/Empty" state (Permanent for demo)
        }, 2500)

        return () => {
            clearTimeout(timer1)
        }
    }, [])

    return (
        <Card className="col-span-12 lg:col-span-8 bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none flex flex-col h-full min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                    {view === "overview" ? "Receita" : "Fontes de Receita"}
                </CardTitle>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-md">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView("overview")}
                        className={`h-6 px-2 text-xs font-medium shadow-sm transition-all ${view === "overview" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white" : "text-muted-foreground hover:text-gray-900 dark:hover:text-white"}`}
                    >
                        Visão Geral
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView("sources")}
                        className={`h-6 px-2 text-xs font-medium shadow-sm transition-all ${view === "sources" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white" : "text-muted-foreground hover:text-gray-900 dark:hover:text-white"}`}
                    >
                        Fontes
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pl-0 relative">
                {status === "loading" && (
                    <ChartSkeleton variant="content" mode="loading" type="area" className="h-full" />
                )}

                {status === "empty" && (
                    <ChartSkeleton variant="content" mode="empty" type="area" message="Sem dados de receita para exibir" className="h-full" />
                )}

                {status === "data" && (
                    view === "overview" ? (
                        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-zinc-800" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={10}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="income"
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#colorTotal)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col md:flex-row items-center justify-around h-full gap-8">
                            <div className="relative h-[250px] w-full md:w-1/2 flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData.length > 0 ? categoryData : [{ name: "Sem dados", value: 1, color: "#e5e7eb" } as any]} // Fallback for empty
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || "#0ea5e9"} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-sm font-medium text-muted-foreground">Total</span>
                                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {categoryData.length}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4 w-full md:w-1/3">
                                <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase pb-2 border-b border-gray-100 dark:border-zinc-800">
                                    <span>Origem</span>
                                    <span>Valor</span>
                                </div>
                                {categoryData.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color || "#0ea5e9" }} />
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 font-medium">R$ {item.value}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                )}
            </CardContent>
        </Card>
    )
}
