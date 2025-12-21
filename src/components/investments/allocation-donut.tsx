import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Asset } from "@/lib/schemas/investment-schema"
import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

import type { MarketQuote } from "@/lib/services/market-service"

interface AllocationDonutProps {
    currency?: string
    assets: Asset[]
    quotes?: Record<string, MarketQuote>
    exchangeRate?: number
}

// Helper for Currency Formatting
// Helper for Currency Formatting
const formatCurrency = (value: number, currency: string = 'BRL') => {
    const locale = currency === 'USD' ? 'en-US' : 'pt-BR'
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}

// Detailed Asset View (Used in Legend Hover)
const AssetDetails = ({ data, currency = 'BRL' }: { data: any, currency?: string }) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="font-bold text-popover-foreground">{data.name}</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar">
                {data.assets && data.assets.map((asset: any) => (
                    <div key={asset.ticker} className="flex justify-between items-center gap-4 text-xs">
                        <span className="font-medium text-popover-foreground">{asset.ticker}</span>
                        <span className="font-normal text-muted-foreground ml-auto">{formatCurrency(asset.value, currency)}</span>
                    </div>
                ))}
            </div>
            <div className="pt-2 border-t border-border flex justify-between items-center text-xs font-bold text-popover-foreground">
                <span>Total</span>
                <span>{formatCurrency(data.convertedValue, currency)}</span>
            </div>
        </div>
    )
}

// Simple Chart Tooltip (Percentage Only)
const ChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        // We need totalValue here, usually passed or calculated. 
        // But for tooltip simple view, we might just show value or rely on Pie's internal percent
        // Let's rely on data passing
        return (
            <div className="bg-popover border border-border p-2 rounded shadow-sm text-sm">
                <span className="font-semibold text-popover-foreground">{data.name} : </span>
                <span className="text-muted-foreground">
                    {formatCurrency(data.convertedValue, data.currency)}
                </span>
            </div>
        )
    }
    return null
}

export function AllocationDonut({ currency = 'BRL', assets, quotes, exchangeRate }: AllocationDonutProps) {
    const USD_BRL_RATE = exchangeRate || 5.50

    // Group assets by type
    const groups: Record<string, { value: number, assets: any[], color: string, name: string }> = {
        "Ações": { value: 0, assets: [], color: "#10b981", name: "Ações" },
        "Ações EUA": { value: 0, assets: [], color: "#059669", name: "Ações EUA" },
        "FIIs": { value: 0, assets: [], color: "#3b82f6", name: "FIIs" },
        "REITs": { value: 0, assets: [], color: "#2563eb", name: "REITs" },
        "Tesouro": { value: 0, assets: [], color: "#f59e0b", name: "Tesouro" },
        "ETFs": { value: 0, assets: [], color: "#6366f1", name: "ETFs" },
        "ETFs EUA": { value: 0, assets: [], color: "#4f46e5", name: "ETFs EUA" },
        "Cripto": { value: 0, assets: [], color: "#ec4899", name: "Cripto" },
        "Renda Fixa": { value: 0, assets: [], color: "#14b8a6", name: "Renda Fixa" },
        "Renda Fixa EUA": { value: 0, assets: [], color: "#0d9488", name: "Renda Fixa EUA" },
        "Fundos": { value: 0, assets: [], color: "#8b5cf6", name: "Fundos" },
        "Outros": { value: 0, assets: [], color: "#9ca3af", name: "Outros" }
    }

    assets.forEach(asset => {
        const quote = quotes?.[asset.ticker]
        // Priority: Quote Price -> Asset Avg Price
        const price = quote?.regularMarketPrice || asset.average_price

        // Calculate Value
        let value = asset.quantity * price

        // Normalize value to BRL for grouping calculation if asset is in USD
        // We will convert to view currency later, but we need a common base for "value" aggregation if we want consistent relative sizes?
        // Actually, logic below (L99) converts "g.value" based on view currency. 
        // Best approach: Convert EVERYTHING to the View Currency (props.currency) straight away.

        const assetCurrency = asset.currency || 'BRL'

        if (currency === 'BRL' && assetCurrency === 'USD') {
            value = value * USD_BRL_RATE
        } else if (currency === 'USD' && assetCurrency === 'BRL') {
            value = value / USD_BRL_RATE
        }

        let category = "Outros"

        if (asset.type === "stock_br") category = "Ações"
        else if (asset.type === "stock_us") category = "Ações EUA"
        else if (asset.type === "reit_br") category = "FIIs"
        else if (asset.type === "reit_us") category = "REITs"
        else if (asset.type === "etf_br") category = "ETFs"
        else if (asset.type === "etf_us") category = "ETFs EUA"
        else if (asset.type === "treasure") category = "Tesouro"
        else if (asset.type === "fixed_income") category = "Renda Fixa"
        else if (asset.type === "fixed_income_us") category = "Renda Fixa EUA"
        else if (asset.type === "crypto") category = "Cripto"
        else if (asset.type === "fund" || asset.type === "fund_exempt" || asset.type === "fiagro") category = "Fundos"

        groups[category].value += value
        groups[category].assets.push({
            ticker: asset.ticker,
            name: asset.name,
            value: value // This value is now in the VIEW currency
        })
    })

    // Filter empty groups & Convert
    const chartData = Object.values(groups)
        .filter(g => g.value > 0)
        .map(g => {
            // Since we already converted "value" to the target currency in the loop, we don't need rate conversion here anymore.
            // But we keep the structure for compatibility.

            // Sort assets inside group
            g.assets.sort((a, b) => b.value - a.value)

            return {
                ...g,
                value: g.value,
                convertedValue: g.value, // It's already converted
                currency: currency,
                assets: g.assets // Already converted
            }
        })
        .sort((a, b) => b.value - a.value) // Sort types by size

    const totalValue = chartData.reduce((acc, curr) => acc + curr.convertedValue, 0)

    const isEmpty = assets.length === 0

    // Placeholder Data for Skeleton
    const placeholderData = [
        { name: "Placeholder A", value: 40, color: "#e5e7eb" }, // Gray-200
        { name: "Placeholder B", value: 30, color: "#f3f4f6" }, // Gray-100
        { name: "Placeholder C", value: 30, color: "#d1d5db" }, // Gray-300
    ]

    const activeData = isEmpty ? placeholderData : chartData

    return (
        <Card className="col-span-1 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Alocação</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={activeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                isAnimationActive={!isEmpty}
                            >
                                {activeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            {!isEmpty && <Tooltip content={<ChartTooltip />} />}
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Total */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            {isEmpty ? (
                                <span className="text-2xl font-bold text-gray-300 dark:text-zinc-700">0%</span>
                            ) : (
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">100%</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Legend List with Tooltip Hover */}
                <div className="mt-4 flex flex-col space-y-3 text-sm">
                    {isEmpty ? (
                        // Skeleton Legend
                        [1, 2, 3, 4, 5].map((_, i) => (
                            <div key={i} className="flex items-center gap-2 animate-pulse">
                                <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-zinc-800" />
                                <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-800 rounded" />
                                <div className="ml-auto h-4 w-8 bg-gray-200 dark:bg-zinc-800 rounded" />
                            </div>
                        ))
                    ) : (
                        <TooltipProvider delayDuration={0}>
                            {chartData.map((item) => {
                                const percent = totalValue > 0 ? ((item.convertedValue / totalValue) * 100).toFixed(0) : "0"
                                return (
                                    <ShadcnTooltip key={item.name}>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-gray-600 dark:text-gray-400 flex-1 text-left">{item.name}</span>
                                                <span className="font-bold text-gray-900 dark:text-gray-200">{percent}%</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="start" className="bg-popover text-popover-foreground border-border p-3 min-w-[220px]">
                                            <AssetDetails data={item} currency={currency} />
                                        </TooltipContent>
                                    </ShadcnTooltip>
                                )
                            })}
                        </TooltipProvider>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
