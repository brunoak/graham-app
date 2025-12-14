import { getAssetByTicker } from "@/lib/actions/investment-actions"
import { notFound } from "next/navigation"
import { AssetHeader } from "@/components/investments/details/asset-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AssetTransactions } from "@/components/investments/details/asset-transactions"

// Placeholder Components (for now)
// Will implement separate files for these shortly
const TradingViewWidget = ({ ticker }: { ticker: string }) => (
    <div className="w-full h-[400px] bg-gray-50 dark:bg-zinc-900 rounded-lg flex items-center justify-center border border-gray-100 dark:border-zinc-800">
        <div className="text-center">
            <p className="text-sm font-medium text-gray-400">TradingView Chart (Mock)</p>
            <p className="text-xs text-gray-500">{ticker}</p>
        </div>
    </div>
)

const FundamentalIndicators = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['P/L', 'P/VP', 'DY', 'ROE'].map((label) => (
            <div key={label} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">-</p>
            </div>
        ))}
    </div>
)

interface AssetPageProps {
    params: Promise<{
        ticker: string
    }>
}

export default async function AssetPage(props: AssetPageProps) {
    const params = await props.params;
    const { ticker } = params;
    const asset = await getAssetByTicker(ticker)

    if (!asset) {
        notFound()
    }

    return (
        <div className="container py-8 max-w-7xl">
            <AssetHeader asset={asset} />

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="history">Histórico</TabsTrigger>
                    <TabsTrigger value="dividends">Proventos</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-12 gap-6">
                        {/* Main Chart */}
                        <Card className="col-span-12 lg:col-span-8 border-gray-100 dark:border-zinc-800 shadow-sm">
                            <CardHeader>
                                <CardTitle>Preço (TradingView)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TradingViewWidget ticker={asset.ticker} />
                            </CardContent>
                        </Card>

                        {/* Side Widgets (Indicators) */}
                        <div className="col-span-12 lg:col-span-4 space-y-6">
                            <Card className="border-gray-100 dark:border-zinc-800 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Indicadores</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <FundamentalIndicators />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="border-gray-100 dark:border-zinc-800 shadow-sm">
                        <CardHeader>
                            <CardTitle>Histórico de Transações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AssetTransactions ticker={asset.ticker} currency={asset.currency} tab="history" />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="dividends">
                    <Card className="border-gray-100 dark:border-zinc-800 shadow-sm">
                        <CardHeader>
                            <CardTitle>Histórico de Proventos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AssetTransactions ticker={asset.ticker} currency={asset.currency} tab="dividends" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
