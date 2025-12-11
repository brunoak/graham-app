"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUp, ArrowDown } from "lucide-react"

// Mock Data - Top 5 Highs & Lows (Realistic B3 Data)
const movers = {
    winners: [
        { ticker: "MGLU3", name: "Magalu", change: 5.2, price: 2.15 },
        { ticker: "PRIO3", name: "PetroRio", change: 3.8, price: 46.50 },
        { ticker: "WEGE3", name: "Weg", change: 1.5, price: 38.20 },
        { ticker: "B3SA3", name: "B3", change: 1.2, price: 11.50 },
        { ticker: "HAPV3", name: "Hapvida", change: 1.1, price: 3.85 },
    ],
    losers: [
        { ticker: "VIIA3", name: "Casas Bahia", change: -4.5, price: 0.60 },
        { ticker: "CVCB3", name: "CVC Brasil", change: -3.2, price: 2.10 },
        { ticker: "VALE3", name: "Vale", change: -2.1, price: 68.40 },
        { ticker: "PETR4", name: "Petrobras", change: -1.4, price: 34.15 },
        { ticker: "MRVE3", name: "MRV", change: -1.1, price: 7.20 },
    ]
}

export function MarketMovers() {
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
                    {movers.winners.map(asset => (
                        <div key={asset.ticker} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-700 dark:text-gray-200">{asset.ticker}</span>
                                <span className="text-xs text-gray-500">{asset.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-medium text-emerald-600">+{asset.change}%</div>
                                <div className="text-xs text-gray-500">R$ {asset.price.toFixed(2)}</div>
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
                    {movers.losers.map(asset => (
                        <div key={asset.ticker} className="flex items-center justify-between text-sm">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-700 dark:text-gray-200">{asset.ticker}</span>
                                <span className="text-xs text-gray-500">{asset.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="font-medium text-red-500">{asset.change}%</div>
                                <div className="text-xs text-gray-500">R$ {asset.price.toFixed(2)}</div>
                            </div>
                        </div>
                    ))}
                </div>

            </CardContent>
        </Card>
    )
}
