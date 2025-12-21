"use client"

import { ArrowUpRight, ArrowDownRight } from "lucide-react"

import type { MarketQuote } from "@/lib/services/market-service"

interface InvestmentsTickerProps {
    indices?: MarketQuote[]
}

const SYMBOL_MAP: Record<string, string> = {
    "^BVSP": "IBOVESPA",
    "USDBRL": "DÓLAR",
    "USDBRL=X": "DÓLAR",
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ",
    "BTC-USD": "BITCOIN"
}

export function InvestmentsTicker({ indices = [] }: InvestmentsTickerProps) {

    // Process indices to display format
    const displayItems = indices.map(q => ({
        ticker: SYMBOL_MAP[q.symbol] || q.symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChangePercent,
        prefix: q.symbol.includes("USD") || q.symbol.includes("GSPC") || q.symbol.includes("IXIC") ? "US$" : "" // Simplistic currency detection
    }))

    // If no real data, show nothing or empty? Or just return null to hide ticker?
    // User wants validation. If I show empty, it means data fetch failed.
    if (displayItems.length === 0) return null

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg overflow-hidden h-10 flex items-center mb-6 shadow-sm">
            <div className="relative flex overflow-x-hidden w-full group">
                <div className="py-2 animate-marquee whitespace-nowrap flex items-center">
                    {displayItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs mx-4">
                            <span className="font-bold text-gray-900 dark:text-gray-100 uppercase">{item.ticker}</span>
                            <span className="text-gray-600 dark:text-gray-400">
                                {item.prefix} {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={`flex items-center font-medium ${item.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {item.change > 0 ? "+" : ""}{item.change.toFixed(2)}%
                            </span>
                            <span className="text-gray-300 dark:text-zinc-700 ml-4">|</span>
                        </div>
                    ))}
                    {/* Duplicate for infinite loop effects */}
                    {displayItems.map((item, index) => (
                        <div key={`dup-${index}`} className="flex items-center gap-2 text-xs mx-4">
                            <span className="font-bold text-gray-900 dark:text-gray-100 uppercase">{item.ticker}</span>
                            <span className="text-gray-600 dark:text-gray-400">
                                {item.prefix} {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={`flex items-center font-medium ${item.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {item.change > 0 ? "+" : ""}{item.change.toFixed(2)}%
                            </span>
                            <span className="text-gray-300 dark:text-zinc-700 ml-4">|</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
