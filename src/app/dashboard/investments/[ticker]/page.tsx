import { getAssetByTicker, getInvestmentTransactions } from "@/lib/actions/investment-actions"
import { notFound } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { AssetTransactions } from "@/components/investments/details/asset-transactions"
import { AssetDetailsForm } from "@/components/investments/details/asset-details-form"
import { IndicatorsGrid } from "@/components/investments/details/indicators-grid"

import { AssetHeader } from "@/components/investments/details/asset-header"
import { getMarketQuote, getMarketFundamentals } from "@/lib/services/market-service"

import { TradingViewWidget } from "@/components/investments/details/tradingview-widget"

interface AssetPageProps {
    params: Promise<{
        ticker: string
    }>
}

export default async function AssetPage(props: AssetPageProps) {
    const params = await props.params;
    const { ticker } = params;

    // Parallel Fetching: DB + Market API
    const [asset, transactions, quote, fundamentals] = await Promise.all([
        getAssetByTicker(ticker),
        getInvestmentTransactions(ticker),
        getMarketQuote(ticker),
        getMarketFundamentals(ticker)
    ])

    if (!asset) {
        notFound()
    }

    return (
        <div className="container py-8 max-w-[1600px] space-y-8">

            <div className="space-y-6">
                {/* 1. Standard Graham Header (Ticker, Name, Type) */}
                <AssetHeader asset={asset} quote={quote} />

                {/* 2. New Form-Style Details (Now with Real Data) */}
                <AssetDetailsForm
                    asset={asset}
                    quote={quote}
                />

                {/* 3. Chart Section */}
                <section>
                    <TradingViewWidget ticker={asset.ticker} type={asset.type} />
                </section>

                {/* 4. Indicators Section (Real Data) */}
                <section>
                    <IndicatorsGrid fundamentals={fundamentals} />
                </section>

                {/* 5. Tables Section */}
                <div className="space-y-8">
                    {/* Dividends Table */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Proventos recebidos</h2>
                                <p className="text-sm text-gray-500">Histórico de dividendos e JCP.</p>
                            </div>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-1.5 rounded-full cursor-pointer hover:bg-emerald-100 transition-colors">
                                + Incluir Provento
                            </span>
                        </div>

                        <Card className="border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
                            <CardContent className="p-0">
                                <AssetTransactions ticker={asset.ticker} currency={asset.currency} tab="dividends" />
                            </CardContent>
                        </Card>
                    </section>

                    {/* Transactions Table */}
                    <section className="space-y-4">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Negócios realizados</h2>
                            <p className="text-sm text-gray-500">Extrato completo de compra e venda.</p>
                        </div>
                        <Card className="border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
                            <CardContent className="p-0">
                                <AssetTransactions ticker={asset.ticker} currency={asset.currency} tab="history" />
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </div>
        </div>
    )
}
