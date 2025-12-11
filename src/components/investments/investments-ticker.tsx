"use client"

import { ArrowUpRight, ArrowDownRight } from "lucide-react"

// Mock Data - Global Markets, Commodities, Crypto
const TICKER_ITEMS = [
    // BR
    { ticker: "Ibovespa", price: 128500, change: 0.53, type: "index", prefix: "" },
    { ticker: "DÓLAR", price: 5.45, change: -0.21, type: "currency", prefix: "R$" },
    { ticker: "IFIX", price: 3350, change: 0.12, type: "index", prefix: "" },

    // US
    { ticker: "S&P 500", price: 5200, change: 1.12, type: "index", prefix: "" },
    { ticker: "NASDAQ", price: 16400, change: 1.45, type: "index", prefix: "" },

    // Europe & China
    { ticker: "Euro Stoxx 50", price: 5050, change: 0.32, type: "index", prefix: "" },
    { ticker: "Shanghai", price: 3050, change: -0.45, type: "index", prefix: "" },

    // Commodities
    { ticker: "Ouro", price: 2350, change: 0.85, type: "commodity", prefix: "US$" },
    { ticker: "Prata", price: 28.50, change: 1.25, type: "commodity", prefix: "US$" },
    { ticker: "Brent", price: 85.40, change: -0.65, type: "commodity", prefix: "US$" },

    // Crypto
    { ticker: "BTC", price: 70500, change: 2.15, type: "crypto", prefix: "US$" },
    { ticker: "ETH", price: 3550, change: 1.85, type: "crypto", prefix: "US$" },
]

export function InvestmentsTicker() {

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg overflow-hidden h-10 flex items-center mb-6 shadow-sm">
            <div className="relative flex overflow-x-hidden w-full group">
                <div className="py-2 animate-marquee whitespace-nowrap flex items-center">
                    {TICKER_ITEMS.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs mx-4">
                            <span className="font-bold text-gray-900 dark:text-gray-100 uppercase">{item.ticker}</span>
                            <span className="text-gray-600 dark:text-gray-400">
                                {item.prefix} {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={`flex items-center font-medium ${item.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {item.change >= 0 ? "+" : ""}{item.change}%
                            </span>
                            <span className="text-gray-300 dark:text-zinc-700 ml-4">|</span>
                        </div>
                    ))}
                    {/* Duplicate for infinite loop effects */}
                    {TICKER_ITEMS.map((item, index) => (
                        <div key={`dup-${index}`} className="flex items-center gap-2 text-xs mx-4">
                            <span className="font-bold text-gray-900 dark:text-gray-100 uppercase">{item.ticker}</span>
                            <span className="text-gray-600 dark:text-gray-400">
                                {item.prefix} {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={`flex items-center font-medium ${item.change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {item.change >= 0 ? "+" : ""}{item.change}%
                            </span>
                            <span className="text-gray-300 dark:text-zinc-700 ml-4">|</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}
