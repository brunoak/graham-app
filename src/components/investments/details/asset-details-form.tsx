"use client"

import { Input } from "@/components/ui/input"
import type { Asset } from "@/lib/schemas/investment-schema"
import type { MarketQuote } from "@/lib/services/market-service"
import { format } from "date-fns"

interface AssetDetailsFormProps {
    asset: Asset
    quote?: MarketQuote | null
}

export function AssetDetailsForm({ asset, quote }: AssetDetailsFormProps) {
    // Priority: Quote Price -> Asset Avg Price (Fallback)
    // Note: If quote is present, we use it for "Current Price".
    const currentPrice = quote?.regularMarketPrice || asset.average_price

    const totalValue = asset.quantity * currentPrice
    const investedValue = asset.quantity * asset.average_price
    const result = totalValue - investedValue
    const resultPercent = investedValue > 0 ? (result / investedValue) * 100 : 0
    const isPositive = result >= 0

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(asset.currency === 'USD' ? 'en-US' : 'pt-BR', {
            style: 'currency', currency: asset.currency
        }).format(val)

    const formatPercent = (val: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2
        }).format(val / 100)

    // Helper for "Readonly Field" look
    const Field = ({ label, value, highlight = false, alert = false }: { label: string, value: string | React.ReactNode, highlight?: boolean, alert?: boolean }) => (
        <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground font-medium ml-1">
                {label}
            </label>
            <div className={`
                flex h-12 w-full items-center rounded-xl border border-input px-3 py-2 text-sm ring-offset-background 
                ${highlight ? 'bg-zinc-50 dark:bg-zinc-900/50' : 'bg-zinc-50 dark:bg-zinc-900/50'}
                ${alert ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}
            `}>
                <span className="font-medium text-base">{value}</span>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col gap-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                    <Field label="Código" value={asset.ticker} />
                </div>
                <div className="md:col-span-9">
                    <Field label="Nome" value={asset.name || asset.ticker} />
                </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Field
                    label="Minha categoria"
                    value={asset.type === 'stock_br' ? 'Renda Variável' : asset.type.toUpperCase().replace('_', ' ')}
                />
                <Field label="Meu saldo (Qtd)" value={asset.quantity.toString()} />
                <Field
                    label="Posição"
                    value={asset.quantity > 0 ? "Comprado" : "Zerado"}
                />
                <Field
                    label="Última negociação"
                    value={asset.last_update ? new Date(asset.last_update).toLocaleDateString('pt-BR') : "-"}
                />
            </div>

            {/* Row 3 (Financials) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Field label="Preço Médio" value={formatCurrency(asset.average_price)} />
                <Field
                    label="Preço Atual"
                    value={
                        <div className="flex items-center gap-2">
                            {formatCurrency(currentPrice)}
                            {quote && (
                                <span className={`text-xs font-bold ${quote.regularMarketChangePercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {quote.regularMarketChangePercent > 0 ? '+' : ''}{quote.regularMarketChangePercent.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    }
                />
                <Field
                    label="Resultado atual"
                    value={
                        <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                            {formatCurrency(result)}
                        </span>
                    }
                />
                <Field
                    label="% Resultado atual"
                    value={
                        <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                            {isPositive ? '+' : ''}{resultPercent.toFixed(2)}%
                        </span>
                    }
                />
            </div>
        </div>
    )
}
