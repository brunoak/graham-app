"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowUp, ArrowDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { PortfolioAsset, PortfolioPerformance, MarketItem } from "@/lib/data/dashboard-data"

interface InvestmentsOverviewProps {
    portfolio: PortfolioPerformance
    marketData: MarketItem[]
}

function AssetRow({ asset }: { asset: PortfolioAsset }) {
    const positive = asset.variation >= 0
    const variationStr = `${positive ? "+" : ""}${asset.variation.toFixed(2)}%`
    const priceStr = asset.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

    return (
        <div className="grid grid-cols-12 items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="col-span-6 flex items-center gap-3">
                <Avatar className="h-8 w-8 rounded-md">
                    {asset.logourl && (
                        <img
                            src={asset.logourl}
                            alt={asset.ticker}
                            className="h-full w-full rounded-md object-contain p-0.5 bg-white"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                    )}
                    <AvatarFallback className={cn(
                        "rounded-md text-[10px] font-bold",
                        positive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    )}>
                        {asset.ticker.substring(0, 2)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                    <span className="text-gray-700 dark:text-gray-200 text-sm font-medium truncate">{asset.ticker}</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{asset.name}</span>
                </div>
            </div>
            <div className="col-span-3 text-center">
                <span className={cn("text-xs font-medium flex items-center justify-center gap-0.5",
                    positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                    {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {variationStr}
                </span>
            </div>
            <div className="col-span-3 text-right">
                <span className="text-sm text-gray-600 dark:text-gray-300">{priceStr}</span>
            </div>
        </div>
    )
}

export function InvestmentsOverview({ portfolio, marketData }: InvestmentsOverviewProps) {
    const [tab, setTab] = useState<"gainers" | "losers">("gainers")

    const items = tab === "gainers" ? portfolio.gainers : portfolio.losers
    const hasData = portfolio.gainers.length > 0 || portfolio.losers.length > 0

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Performance */}
            <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Desempenho da carteira</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">Veja as maiores variações dos seus ativos</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Tabs: Altas | Baixas */}
                    <div className="flex gap-4 mb-6 border-b border-gray-100 dark:border-zinc-800">
                        <button
                            onClick={() => setTab("gainers")}
                            className={cn(
                                "pb-2 font-medium text-sm transition-colors",
                                tab === "gainers"
                                    ? "text-emerald-600 border-b-2 border-emerald-600 dark:text-emerald-500 dark:border-emerald-500"
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            )}
                        >
                            Altas {portfolio.gainers.length > 0 && `(${portfolio.gainers.length})`}
                        </button>
                        <button
                            onClick={() => setTab("losers")}
                            className={cn(
                                "pb-2 font-medium text-sm transition-colors",
                                tab === "losers"
                                    ? "text-red-600 border-b-2 border-red-600 dark:text-red-500 dark:border-red-500"
                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            )}
                        >
                            Baixas {portfolio.losers.length > 0 && `(${portfolio.losers.length})`}
                        </button>
                    </div>

                    {!hasData && (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 dark:text-gray-600">
                            <p className="text-sm">Nenhum ativo na carteira</p>
                            <p className="text-xs mt-1">Adicione investimentos para ver o desempenho</p>
                        </div>
                    )}

                    {hasData && items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 dark:text-gray-600">
                            <p className="text-sm">
                                {tab === "gainers" ? "Nenhum ativo em alta hoje" : "Nenhum ativo em baixa hoje"}
                            </p>
                        </div>
                    )}

                    {items.length > 0 && (
                        <div className="space-y-1">
                            <div className="grid grid-cols-12 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 px-2">
                                <div className="col-span-6">Ativo</div>
                                <div className="col-span-3 text-center">Variação</div>
                                <div className="col-span-3 text-right">Cotação atual</div>
                            </div>
                            {items.map((asset) => (
                                <AssetRow key={asset.ticker} asset={asset} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Market Overview — dados reais */}
            <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Mercado</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">Fique por dentro das últimas cotações</CardDescription>
                </CardHeader>
                <CardContent>
                    {marketData.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400 dark:text-gray-600">
                            <p className="text-sm">Dados de mercado indisponíveis no momento</p>
                        </div>
                    )}

                    {marketData.length > 0 && (
                        <div className="space-y-1 mt-2">
                            <div className="grid grid-cols-12 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 px-2">
                                <div className="col-span-5">Índice / Ativo</div>
                                <div className="col-span-3 text-center">Variação</div>
                                <div className="col-span-4 text-right">Valor atual</div>
                            </div>
                            {marketData.map((item) => {
                                const positive = item.variation >= 0
                                const variationStr = `${positive ? "+" : ""}${item.variation.toFixed(2)}%`
                                const priceStr = item.price.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: item.currency,
                                    maximumFractionDigits: item.price >= 1000 ? 2 : 4,
                                })
                                return (
                                    <div key={item.ticker} className="grid grid-cols-12 items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-50 last:border-0 dark:border-zinc-800/50">
                                        <div className="col-span-5">
                                            <span className="text-gray-600 dark:text-gray-400 text-sm">{item.name}</span>
                                        </div>
                                        <div className="col-span-3 text-center">
                                            <span className={cn("text-xs font-medium", positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                                {variationStr}
                                            </span>
                                        </div>
                                        <div className="col-span-4 text-right">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{priceStr}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
