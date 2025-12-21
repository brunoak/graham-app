"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, ArrowDown } from "lucide-react"

import type { Asset } from "@/lib/schemas/investment-schema"
import type { MarketQuote } from "@/lib/services/market-service"

interface MarketMoversProps {
    assets?: Asset[]
    quotes?: Record<string, MarketQuote>
}

/**
 * Market Movers Component
 * Displays the Top 5 Winners (Maiores Altas) and Top 5 Losers (Maiores Baixas) from the USER'S PORTFOLIO.
 * 
 * Logic:
 * - Iterates over all user assets.
 * - Uses real-time `regularMarketChangePercent` from `quotes` (Brapi).
 * - Sorts descending for Winners, ascending for Losers.
 * - Limits to 5 items per category.
 */
export function MarketMovers({ assets = [], quotes }: MarketMoversProps) {

    // Calculate variations for all assets
    const processedAssets = assets.map(asset => {
        const quote = quotes?.[asset.ticker]
        const price = quote?.regularMarketPrice || asset.average_price
        const change = quote?.regularMarketChangePercent || 0
        const currency = asset.currency || 'BRL'

        return {
            ticker: asset.ticker,
            name: asset.name,
            price,
            change,
            currency
        }
    })

    // Sort by Change % Descending (Winners)
    const winners = [...processedAssets]
        .filter(a => a.change > 0)
        .sort((a, b) => b.change - a.change)
        .slice(0, 5)

    // Sort by Change % Ascending (Losers)
    const losers = [...processedAssets]
        .filter(a => a.change < 0)
        .sort((a, b) => a.change - b.change)
        .slice(0, 5)
    return (
        <Card className="col-span-1 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Altas e Baixas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

                {/* Winners */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 mb-1">
                        <ArrowUp className="w-4 h-4" />
                        <span>Maiores Altas</span>
                    </div>
                    {winners.length === 0 && <span className="text-xs text-muted-foreground italic">Nenhuma alta hoje.</span>}
                    {winners.map(asset => (
                        <div key={asset.ticker} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-700 dark:text-gray-200">{asset.ticker}</span>
                                <span className="text-xs text-gray-500">{asset.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-medium text-emerald-600">+{asset.change.toFixed(2)}%</div>
                                <div className="text-xs text-gray-500">
                                    {new Intl.NumberFormat(asset.currency === 'USD' ? 'en-US' : 'pt-BR', { style: 'currency', currency: asset.currency }).format(asset.price)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="h-px bg-gray-100 dark:bg-zinc-800" />

                {/* Losers */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-500 mb-1">
                        <ArrowDown className="w-4 h-4" />
                        <span>Maiores Baixas</span>
                    </div>
                    {losers.length === 0 && <span className="text-xs text-muted-foreground italic">Nenhuma baixa hoje.</span>}
                    {losers.map(asset => (
                        <div key={asset.ticker} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-700 dark:text-gray-200">{asset.ticker}</span>
                                <span className="text-xs text-gray-500">{asset.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-medium text-red-500">{asset.change.toFixed(2)}%</div>
                                <div className="text-xs text-gray-500">
                                    {new Intl.NumberFormat(asset.currency === 'USD' ? 'en-US' : 'pt-BR', { style: 'currency', currency: asset.currency }).format(asset.price)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

            </CardContent>
        </Card>
    )
}
