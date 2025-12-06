"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Info } from "lucide-react"

const data = [
    { name: "Online", value: 65, color: "#0ea5e9" }, // Sky blue
    { name: "Offline", value: 45, color: "#14b8a6" }, // Teal
    { name: "Direto", value: 30, color: "#a855f7" }, // Purple
]

export function RevenueSources() {
    return (
        <Card className="col-span-12 lg:col-span-4 bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Fontes de Receita</CardTitle>
                <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-gray-900 dark:hover:text-white" />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
                <div className="relative h-[200px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-medium text-muted-foreground">Total</span>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">0</span>
                    </div>
                </div>

                <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-500 uppercase pb-2 border-b border-gray-100 dark:border-zinc-800">
                        <span>Sources</span>
                        <span>Revenue</span>
                        <span>Perc.</span>
                    </div>
                    {data.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                            </div>
                            <span className="text-gray-900 dark:text-white font-medium">R$ 00,00</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">0.0%</span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full dark:bg-emerald-900/40 dark:text-emerald-400">
                                    0.0% Up
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
