"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { MarketFundamentals } from "@/lib/services/market-service"

const IndicatorGroup = ({ title, indicators }: { title: string, indicators: { label: string, value: string }[] }) => (
    <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-2">
            {title}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-4 gap-x-8">
            {indicators.map((ind, idx) => (
                <div key={idx} className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium mb-1">{ind.label}</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{ind.value}</span>
                </div>
            ))}
        </div>
    </div>
)

/**
 * Indicators Grid Component.
 * Displays key fundamental indicators (Valuation, Debt, Efficiency) fetched from Brapi.
 * 
 * Data Source: `getMarketFundamentals` (market-service.ts).
 * logic:
 * - If data is missing (null/undefined), displays "-" and an explanation footer.
 * - Formats percentages and currency values consistently.
 */
export function IndicatorsGrid({ fundamentals }: { fundamentals?: MarketFundamentals | null }) {

    // "Em breve" logic
    const fmt = (val?: number, isPct: boolean = false) => {
        if (!fundamentals) return "-"
        if (val === undefined || val === null) return "-"
        if (isPct) return (val * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + "%"
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    const valuation = [
        { label: "DY", value: fmt(fundamentals?.valuation.dy, true) },
        { label: "P/L", value: fmt(fundamentals?.valuation.pe) },
        { label: "P/VP", value: fmt(fundamentals?.valuation.pvp) },
        { label: "EV/EBITDA", value: fmt(fundamentals?.valuation.evebitda) },
        { label: "EV/EBIT", value: fmt(fundamentals?.valuation.evebit) },
        { label: "VPA", value: fmt(fundamentals?.valuation.vpa) },
    ]

    const debt = [
        { label: "Dív. Líq / PL", value: fmt(fundamentals?.debt.netDebtPl) },
        { label: "Dív. Líq / EBITDA", value: fmt(fundamentals?.debt.netDebtEbitda) },
        { label: "PL / Ativos", value: fmt(fundamentals?.debt.plAssets) },
    ]

    const efficiency = [
        { label: "Margem Bruta", value: fmt(fundamentals?.efficiency.grossMargin, true) },
        { label: "Margem Líquida", value: fmt(fundamentals?.efficiency.netMargin, true) },
    ]

    const profitability = [
        { label: "ROE", value: fmt(fundamentals?.profitability.roe, true) },
        { label: "ROIC", value: fmt(fundamentals?.profitability.roic, true) },
    ]

    return (
        <Card className="border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm shadow-gray-200 dark:shadow-none">
            <CardContent className="p-6 space-y-8">
                <IndicatorGroup title="Indicadores de Valuation" indicators={valuation} />
                <IndicatorGroup title="Indicadores de Endividamento" indicators={debt} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <IndicatorGroup title="Indicadores de Eficiência" indicators={efficiency} />
                    <IndicatorGroup title="Indicadores de Rentabilidade" indicators={profitability} />
                </div>

                {!fundamentals && (
                    <div className="flex items-center gap-2 mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
                        <span className="text-xl font-medium text-gray-400">-</span>
                        <p className="text-sm text-gray-500">
                            Em breve (Dados fundamentais indisponíveis no momento)
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
