"use client"

import { ArrowUpRight, ArrowDownRight, ChevronRight, MoreHorizontal } from "lucide-react"

export interface AssetSummary {
    id: string
    ticker: string
    name: string
    price: number
    change: number // percentage
    changeValue: number
    icon?: React.ReactNode
}

interface AssetAllocationListProps {
    title: string
    items: AssetSummary[]
}

export function AssetAllocationList({ title, items }: AssetAllocationListProps) {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val) // Using USD for mock as per design instructions usually, but let's stick to props or general. Design shows "$" signs for Crypto and Stocks.

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{title}</h3>
                <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
                    View All
                </button>
            </div>

            <div className="flex flex-col gap-6">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-400">
                                {item.icon ? item.icon : <div className="w-4 h-4 rounded-full bg-gray-400" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-gray-100">{item.ticker}</span>
                                <span className="text-xs text-muted-foreground">{item.name}</span>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="font-bold text-gray-900 dark:text-white">
                                {formatCurrency(item.price)}
                            </div>
                            <div className={`text-xs flex items-center justify-end gap-1 ${item.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {item.change >= 0 ?
                                    <ArrowUpRight size={12} /> :
                                    <ArrowDownRight size={12} />
                                }
                                <span>{item.change >= 0 ? "+" : ""}{item.changeValue.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
