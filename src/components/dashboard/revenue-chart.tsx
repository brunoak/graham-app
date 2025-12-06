"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer, Tooltip } from "recharts"

const data = [
    { name: "Jan", total: 34000 }, // Changed revenue to total to match component usage if generic, but sticking to 'total' for simplicity or 'value'
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

export function RevenueChart() {
    return (
        <Card className="col-span-12 lg:col-span-8 bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Receita</CardTitle>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 p-1 rounded-md">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm">ALL</Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-gray-900 dark:hover:text-white">1M</Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-gray-900 dark:hover:text-white">6M</Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-gray-900 dark:hover:text-white">1A</Button>
                </div>
            </CardHeader>
            <CardContent className="pl-0">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
                            stroke="#8b5cf6"
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            strokeWidth={2}
                        />
                        <Area // Dashed line simulation for projection or expense comparison (optional, kept simple for now)
                            type="monotone"
                            dataKey="none"
                            stroke="#10b981"
                            strokeDasharray="5 5"
                            fill="transparent"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
