"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// TODO: Integrate with Brapi API (https://brapi.dev) to fetch real-time market data and portfolio updates.
const portfolioData = [
    { ticker: "SUZB3", name: "Suzano", variation: "+1,94%", price: "R$ 50,50", positive: true },
    { ticker: "JSRE11", name: "JS Real Estate", variation: "+0,16%", price: "R$ 64,30", positive: true },
    { ticker: "VILG11", name: "Vinci Logística", variation: "+0,15%", price: "R$ 97,25", positive: true },
    { ticker: "HGRE11", name: "CSHG Real Estate", variation: "+0,07%", price: "R$ 122,99", positive: true },
]

const marketData = [
    { name: "Dólar (Comercial)", variation: "+0,23%", price: "R$ 5,31", positive: true },
    { name: "Euro (Comercial)", variation: "+2,87%", price: "R$ 6,35", positive: true },
    { name: "Ibovespa (Ibov)", variation: "-4,19%", price: "R$ 157.462,94", positive: false },
    { name: "Ifix (IND FDO)", variation: "-0,07%", price: "R$ 3.674,14", positive: false },
    { name: "Bitcoin (BTC)", variation: "+0,09%", price: "R$ 486.127,88", positive: true },
]

export function InvestmentsOverview() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Portfolio Performance */}
            <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Desempenho da carteira</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">Veja as maiores variações dos seus ativos</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                        <Button variant="outline" className="w-full sm:w-auto justify-between text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-800">
                            Completo <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                        <div className="flex gap-4 w-full sm:w-auto border-b border-gray-100 dark:border-zinc-800 sm:border-none">
                            <button className="flex-1 sm:flex-none pb-2 sm:pb-0 font-medium text-emerald-600 border-b-2 border-emerald-600 dark:text-emerald-500 text-sm">Altas</button>
                            <button className="flex-1 sm:flex-none pb-2 sm:pb-0 font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm">Baixas</button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="grid grid-cols-12 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 px-2">
                            <div className="col-span-6">Empresas</div>
                            <div className="col-span-3 text-center">Variação</div>
                            <div className="col-span-3 text-right">Cotação atual</div>
                        </div>
                        {portfolioData.map((asset) => (
                            <div key={asset.ticker} className="grid grid-cols-12 items-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <div className="col-span-6 flex items-center gap-3">
                                    <Avatar className="h-8 w-8 rounded-md">
                                        <AvatarFallback className="rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold dark:bg-emerald-900/30 dark:text-emerald-400">
                                            {asset.ticker.substring(0, 2)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-gray-700 dark:text-gray-200 text-sm">{asset.ticker}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">{asset.name}</span>
                                    </div>
                                </div>
                                <div className="col-span-3 text-center">
                                    <span className={cn("text-xs", asset.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                        {asset.variation}
                                    </span>
                                </div>
                                <div className="col-span-3 text-right">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">{asset.price}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Market Overview */}
            <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Mercado</CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">Fique por dentro das últimas cotações</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 mt-6">
                        <div className="grid grid-cols-12 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 px-2">
                            <div className="col-span-5">Moedas</div>
                            <div className="col-span-3 text-center">Variação</div>
                            <div className="col-span-4 text-right">Valores atuais</div>
                        </div>
                        {marketData.map((item) => (
                            <div key={item.name} className="grid grid-cols-12 items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-gray-50 last:border-0 dark:border-zinc-800/50">
                                <div className="col-span-5 flex items-center gap-3">
                                    <span className="text-gray-600 dark:text-gray-400 text-sm">{item.name}</span>
                                </div>
                                <div className="col-span-3 text-center">
                                    <span className={cn("text-xs", item.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                        {item.variation}
                                    </span>
                                </div>
                                <div className="col-span-4 text-right">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.price}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
