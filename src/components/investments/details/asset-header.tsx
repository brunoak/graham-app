import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, TrendingDown, Building2, Wallet, DollarSign } from "lucide-react"
import Link from "next/link"
import type { Asset } from "@/lib/schemas/investment-schema"
import type { MarketQuote } from "@/lib/services/market-service"

interface AssetHeaderProps {
    asset: Asset
    quote?: MarketQuote | null
}

export function AssetHeader({ asset, quote }: AssetHeaderProps) {
    // Priority: Quote Price -> Asset Avg Price (Fallback)
    const currentPrice = quote?.regularMarketPrice || asset.average_price

    // Variation Logic
    const dayChange = quote?.regularMarketChangePercent || 0
    const isPositive = dayChange >= 0
    const isNeutral = dayChange === 0

    const formatCurrency = (value: number) => {
        const currency = asset.currency || 'BRL'
        const locale = currency === 'USD' ? 'en-US' : 'pt-BR'
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(value)
    }

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/investments">
                    <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2">
                        <ArrowLeft className="h-5 w-5 text-gray-500" />
                    </Button>
                </Link>

                {quote?.logourl ? (
                    <img
                        src={quote.logourl}
                        alt={asset.ticker}
                        className="w-12 h-12 rounded-full object-cover bg-white shadow-sm shrink-0"
                    />
                ) : (
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${asset.type.startsWith('stock') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20' :
                        asset.type.startsWith('etf') ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20' :
                            asset.type.startsWith('reit') ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20' :
                                asset.type === 'crypto' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20' :
                                    'bg-gray-100 text-gray-600'
                        }`}>
                        {asset.type.startsWith('stock') && <TrendingUp className="h-6 w-6" />}
                        {asset.type.startsWith('etf') && <TrendingUp className="h-6 w-6" />}
                        {asset.type.startsWith('reit') && <Building2 className="h-6 w-6" />}
                        {asset.type === 'crypto' && <Wallet className="h-6 w-6" />}
                        {(asset.type === 'treasure' || asset.type === 'fixed_income') && <DollarSign className="h-6 w-6" />}
                    </div>
                )}

                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{asset.ticker}</h1>
                        <Badge variant="outline" className="text-xs font-normal uppercase">
                            {asset.type.replace('_', ' ')}
                        </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{asset.name}</p>
                </div>
            </div>

            <div className="flex items-center gap-6 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Preço Atual</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(currentPrice)}
                        </span>
                        {quote && (
                            <span className={`text-xs font-medium flex items-center ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {dayChange.toFixed(2)}%
                            </span>
                        )}
                    </div>
                </div>

                <div className="h-8 w-px bg-gray-200 dark:bg-zinc-700" />

                <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Saldo Total</p>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(currentPrice * asset.quantity)}
                    </span>
                </div>
            </div>
        </div>
    )
}
