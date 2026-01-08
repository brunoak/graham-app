"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calculator, Filter } from "lucide-react"
import Link from "next/link"
import type { ClosedPosition, ClosedPositionsSummary } from "@/lib/actions/closed-positions-actions"

interface ClosedPositionsContentProps {
    positions: ClosedPosition[]
    summary: ClosedPositionsSummary
    availableYears: number[]
    currentFilters: {
        year?: number
        month?: number
    }
}

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]

const ASSET_TYPE_LABELS: Record<string, string> = {
    stock_br: "Ações BR",
    reit_br: "FIIs",
    etf_br: "ETFs BR",
    stock_us: "Ações US",
    treasure: "Tesouro",
    fixed_income: "Renda Fixa"
}

function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR')
}

export function ClosedPositionsContent({
    positions,
    summary,
    availableYears,
    currentFilters
}: ClosedPositionsContentProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [selectedYear, setSelectedYear] = useState<number | undefined>(currentFilters.year)
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(currentFilters.month)

    const handleFilter = () => {
        const params = new URLSearchParams()
        if (selectedYear) params.set("year", selectedYear.toString())
        if (selectedMonth !== undefined) params.set("month", selectedMonth.toString())
        router.push(`/dashboard/investments/closed?${params.toString()}`)
    }

    const clearFilters = () => {
        setSelectedYear(undefined)
        setSelectedMonth(undefined)
        router.push("/dashboard/investments/closed")
    }

    return (
        <div className="container py-8 max-w-[1400px] space-y-6">
            {/* Filters */}
            <Card className="border-gray-100 dark:border-zinc-800">
                <CardContent className="py-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                            value={selectedYear || ""}
                            onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
                            className="px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm"
                        >
                            <option value="">Todos os anos</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <select
                            value={selectedMonth ?? ""}
                            onChange={(e) => setSelectedMonth(e.target.value !== "" ? parseInt(e.target.value) : undefined)}
                            className="px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm"
                            disabled={!selectedYear}
                        >
                            <option value="">Todos os meses</option>
                            {MONTHS.map((month, idx) => (
                                <option key={idx} value={idx}>{month}</option>
                            ))}
                        </select>
                        <Button onClick={handleFilter} size="sm">Filtrar</Button>
                        {(currentFilters.year || currentFilters.month !== undefined) && (
                            <Button onClick={clearFilters} variant="ghost" size="sm">Limpar</Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Profit */}
                <Card className="border-gray-100 dark:border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Lucro Total</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {formatCurrency(summary.totalProfit)}
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Loss */}
                <Card className="border-gray-100 dark:border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Prejuízo Acumulado</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(summary.totalLoss)}
                                </p>
                            </div>
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Compensável no IRPF</p>
                    </CardContent>
                </Card>

                {/* Net Result */}
                <Card className="border-gray-100 dark:border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Resultado Líquido</p>
                                <p className={`text-2xl font-bold ${summary.netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(summary.netResult)}
                                </p>
                            </div>
                            <div className={`p-3 rounded-full ${summary.netResult >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                <DollarSign className={`h-5 w-5 ${summary.netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Estimated Tax */}
                <Card className="border-gray-100 dark:border-zinc-800">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Imposto Estimado</p>
                                <p className="text-2xl font-bold text-amber-600">
                                    {formatCurrency(summary.estimatedTax)}
                                </p>
                            </div>
                            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                                <Calculator className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                        {summary.isExempt && (
                            <p className="text-xs text-emerald-600 mt-2">✓ Isento (vendas &lt; R$ 20k)</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tax Breakdown by Type */}
            {summary.byType.length > 0 && (
                <Card className="border-gray-100 dark:border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Resultado por Tipo de Ativo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {summary.byType.map(item => (
                                <div key={item.type} className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-lg">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {ASSET_TYPE_LABELS[item.type] || item.type}
                                    </p>
                                    <div className="mt-2 space-y-1 text-sm">
                                        <p className="text-emerald-600">Lucro: {formatCurrency(item.profit)}</p>
                                        <p className="text-red-600">Prejuízo: {formatCurrency(item.loss)}</p>
                                        <p className="text-amber-600 font-medium">Imposto: {formatCurrency(item.tax)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Positions Table */}
            <Card className="border-gray-100 dark:border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-lg">Histórico de Vendas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {positions.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>Nenhuma venda encontrada no período selecionado.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ativo</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qtd</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PM Compra</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço Venda</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Resultado</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                                    {positions.map(pos => (
                                        <tr key={pos.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                                                {formatDate(pos.sellDate)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{pos.ticker}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{pos.assetName}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {ASSET_TYPE_LABELS[pos.type] || pos.type}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-500">
                                                {pos.quantity}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-500">
                                                {formatCurrency(pos.buyPrice)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-500">
                                                {formatCurrency(pos.sellPrice)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-gray-500">
                                                {formatCurrency(pos.totalSold)}
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-right font-medium ${pos.result >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {formatCurrency(pos.result)}
                                            </td>
                                            <td className={`px-4 py-3 text-sm text-right font-medium ${pos.resultPercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {formatPercent(pos.resultPercent)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* IRPF Info */}
            <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10">
                <CardContent className="py-4">
                    <div className="flex gap-3">
                        <Calculator className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            <p className="font-medium">Informações para IRPF</p>
                            <ul className="mt-1 space-y-1 text-amber-700 dark:text-amber-300">
                                <li>• Ações: 15% sobre lucro líquido (isenção se vendas &lt; R$ 20k/mês)</li>
                                <li>• FIIs: 20% sobre lucro líquido (sem isenção)</li>
                                <li>• Prejuízos podem ser compensados com lucros futuros do mesmo tipo</li>
                                <li>• DARF deve ser pago até o último dia útil do mês seguinte</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
