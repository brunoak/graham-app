"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts"
import { Info } from "lucide-react"

const monthlyData = [
    { name: "Jan", total: 34000 },
    { name: "Fev", total: 42000 },
    { name: "Mar", total: 38000 },
    { name: "Abr", total: 55000 },
    { name: "Maio", total: 48000 },
    { name: "Jun", total: 52000 },
    { name: "Jul", total: 60000 },
    { name: "Ago", total: 45000 },
    { name: "Set", total: 80000 },
    { name: "Out", total: 65000 },
    { name: "Nov", total: 75000 },
    { name: "Dez", total: 85000 },
]

const sourcesData = [
    { name: "Online", value: 65, color: "#0ea5e9" }, // Sky blue
    { name: "Offline", value: 45, color: "#14b8a6" }, // Teal
    { name: "Direto", value: 30, color: "#a855f7" }, // Purple
]

export function RevenueWidget() {
    const [view, setView] = useState<"overview" | "sources">("overview")

    return (
        <Card className="col-span-12 lg:col-span-8 bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none flex flex-col h-full min-h-[400px]">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
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
            <CardContent className="flex-1 min-h-0 pl-0">
                {view === "overview" ? (
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
                                dataKey="total"
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
                                        data={sourcesData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {sourcesData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-sm font-medium text-muted-foreground">Total</span>
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">140</span>
                            </div>
                        </div>

                        <div className="space-y-4 w-full md:w-1/3">
                            <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase pb-2 border-b border-gray-100 dark:border-zinc-800">
                                <span>Origem</span>
                                <span>Perc.</span>
                            </div>
                            {sourcesData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 font-medium">{item.value}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
