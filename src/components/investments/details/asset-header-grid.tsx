"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Asset } from "@/lib/schemas/investment-schema"
import { ArrowDown, ArrowUp, DollarSign, TrendingUp, Calendar, Tag, Wallet, TrendingDown } from "lucide-react"

interface AssetHeaderGridProps {
    asset: Asset
    firstTransactionDate?: Date
    currentPrice?: number
}

export function AssetHeaderGrid({ asset, firstTransactionDate, currentPrice: propPrice }: AssetHeaderGridProps) {
    const currentPrice = propPrice || asset.average_price
    const totalValue = asset.quantity * currentPrice
    const investedValue = asset.quantity * asset.average_price
    const result = totalValue - investedValue
    const resultPercent = investedValue > 0 ? (result / investedValue) * 100 : 0
    const isPositive = result >= 0

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(asset.currency === 'USD' ? 'en-US' : 'pt-BR', {
            style: 'currency', currency: asset.currency
        }).format(val)

    const formatDate = (date?: Date) =>
        date ? new Date(date).toLocaleDateString('pt-BR') : '-'

    // Standard Summary Card Component (Internal for reuse in this grid)
    const SummaryCard = ({ title, value, icon: Icon, subValue, highlightColor }: any) => (
        <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white block">
                        {value}
                    </span>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {title}
                    </CardTitle>
                </div>
                {Icon && (
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${highlightColor || 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400'}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                )}
            </CardHeader>
            {subValue && (
                <CardContent className="pb-4">
                    {subValue}
                </CardContent>
            )}
        </Card>
    )

    return (
        <div className="space-y-4">
            {/* Row 2: Financial Summaries (Standard Cards) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <SummaryCard
                    title="Preço Médio"
                    value={formatCurrency(asset.average_price)}
                    icon={Tag}
                    highlightColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                />
                <SummaryCard
                    title="Preço Atual"
                    value={formatCurrency(currentPrice)}
                    icon={DollarSign}
                    highlightColor="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                    subValue={
                        <div className="flex items-center gap-1.5 pt-1">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Cotação em tempo real</span>
                        </div>
                    }
                />
                <SummaryCard
                    title="Valor Total"
                    value={formatCurrency(totalValue)}
                    icon={Wallet}
                    highlightColor="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                    subValue={
                        <p className="text-xs text-muted-foreground pt-1">
                            {asset.quantity} cotas
                        </p>
                    }
                />
                <SummaryCard
                    title="Rentabilidade"
                    value={formatCurrency(result)}
                    icon={isPositive ? TrendingUp : TrendingDown}
                    highlightColor={isPositive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}
                    subValue={
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${isPositive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                            {isPositive ? "+" : ""}{resultPercent.toFixed(2)}%
                        </span>
                    }
                />
            </div>

            {/* Row 3: Secondary Details (Mini Grid) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 flex flex-col justify-center">
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Data 1ª Negoc.</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(firstTransactionDate)}
                    </p>
                </div>
                {/* Can add more secondary details here if needed, keeping it clean for now */}
            </div>
        </div>
    )
}
