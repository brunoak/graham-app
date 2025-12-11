"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"

const data = [
    {
        name: "Ações",
        value: 45000.00,
        color: "#10b981",
        assets: [
            { ticker: "VALE3", name: "Vale S.A.", value: 12500.00 },
            { ticker: "PETR4", name: "Petrobras", value: 8500.00 },
            { ticker: "ITUB4", name: "Itaú Unibanco", value: 8000.00 },
            { ticker: "WEGE3", name: "WEG", value: 6000.00 },
            { ticker: "BBAS3", name: "Banco do Brasil", value: 5000.00 },
            { ticker: "PRIO3", name: "PetroRio", value: 5000.00 },
        ]
    },
    {
        name: "FIIs",
        value: 25000.00,
        color: "#3b82f6",
        assets: [
            { ticker: "HGLG11", name: "CSHG Logística", value: 10000.00 },
            { ticker: "KNRI11", name: "Kinea Renda", value: 8000.00 },
            { ticker: "MXRF11", name: "Maxi Renda", value: 7000.00 },
        ]
    },
    {
        name: "Tesouro",
        value: 15000.00,
        color: "#f59e0b",
        assets: [
            { ticker: "TD SELIC", name: "Tesouro Selic 2029", value: 10000.00 },
            { ticker: "TD IPCA+", name: "Tesouro IPCA+ 2035", value: 5000.00 },
        ]
    },
    {
        name: "ETFs",
        value: 10000.00,
        color: "#6366f1",
        assets: [
            { ticker: "IVVB11", name: "S&P 500", value: 6000.00 },
            { ticker: "SMAL11", name: "Small Caps", value: 4000.00 },
        ]
    },
    {
        name: "Cripto",
        value: 5000.00,
        color: "#ec4899",
        assets: [
            { ticker: "BTC", name: "Bitcoin", value: 3500.00 },
            { ticker: "ETH", name: "Ethereum", value: 1500.00 },
        ]
    },
]

import { Tooltip as ShadcnTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Helper for Currency Formatting
const formatCurrency = (value: number, currency: string = 'BRL') =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value)

// Detailed Asset View (Used in Legend Hover)
const AssetDetails = ({ data, currency = 'BRL' }: { data: any, currency?: string }) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="font-bold text-popover-foreground">{data.name}</span>
            </div>
            <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar">
                {data.assets && data.assets.map((asset: any) => (
                    <div key={asset.ticker} className="flex justify-between items-center gap-4 text-xs">
                        <span className="font-medium text-popover-foreground">{asset.ticker}</span>
                        <span className="font-normal text-muted-foreground ml-auto">{formatCurrency(asset.value, currency)}</span>
                    </div>
                ))}
            </div>
            <div className="pt-2 border-t border-border flex justify-between items-center text-xs font-bold text-popover-foreground">
                <span>Total</span>
                <span>{formatCurrency(data.convertedValue, currency)}</span>
            </div>
        </div>
    )
}

// Simple Chart Tooltip (Percentage Only)
const ChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload
        const totalValue = 100000
        const percent = ((data.value / totalValue) * 100).toFixed(1)

        return (
            <div className="bg-popover border border-border p-2 rounded shadow-sm text-sm">
                <span className="font-semibold text-popover-foreground">{data.name} : </span>
                <span className="text-muted-foreground">{percent}%</span>
            </div>
        )
    }
    return null
}

export function AllocationDonut({ currency = 'BRL' }: { currency?: string }) {
    const totalValue = 100000
    const USD_BRL_RATE = 5.50

    // Convert data based on selected currency
    const convertedData = data.map(category => {
        const isUSD = currency === 'USD'
        // If converting to USD, divide by rate. If BRL, keep original
        const rate = isUSD ? (1 / USD_BRL_RATE) : 1

        return {
            ...category,
            value: category.value, // Keep original value for correct percentage calculation (Pie Chart)
            convertedValue: category.value * rate, // Use this for monetary display
            assets: category.assets?.map((asset: any) => ({
                ...asset,
                value: asset.value * rate
            }))
        }
    })

    return (
        <Card className="col-span-1 border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">Alocação</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={convertedData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                            >
                                {convertedData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Total */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">100%</span>
                        </div>
                    </div>
                </div>

                {/* Legend List with Tooltip Hover */}
                <div className="mt-4 flex flex-col space-y-3 text-sm">
                    <TooltipProvider delayDuration={0}>
                        {convertedData.map((item) => {
                            // Recalculate percent based on total value (which should also be converted or ratio stays same)
                            // Ratio stays same so we can use original totalValue if we convert it, OR just sum up the converted values.
                            // Simply usage: ratio is currency agnostic.
                            const percent = ((item.value / totalValue) * 100).toFixed(0)
                            return (
                                <ShadcnTooltip key={item.name}>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-gray-600 dark:text-gray-400 flex-1 text-left">{item.name}</span>
                                            <span className="font-bold text-gray-900 dark:text-gray-200">{percent}%</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="start" className="bg-popover text-popover-foreground border-border p-3 min-w-[220px]">
                                        <AssetDetails data={item} currency={currency} />
                                    </TooltipContent>
                                </ShadcnTooltip>
                            )
                        })}
                    </TooltipProvider>
                </div>
            </CardContent>
        </Card>
    )
}
