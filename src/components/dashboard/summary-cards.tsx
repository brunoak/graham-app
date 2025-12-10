"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface SummaryCardsProps {
    balance: number
    income: number
    expenses: number
    investments: number
    balanceChange: number
    incomeChange: number
    expensesChange: number
    investmentsChange: number
}

export function SummaryCards({
    balance, income, expenses, investments,
    balanceChange, incomeChange, expensesChange, investmentsChange
}: SummaryCardsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)
    }

    const PercentageBadge = ({ value = 0, inverse = false }: { value?: number, inverse?: boolean }) => {
        const safeValue = value ?? 0
        const isPositive = safeValue >= 0
        const isGood = inverse ? !isPositive : isPositive

        const colorClass = isGood
            ? "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400"
            : "text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-400"

        return (
            <TooltipProvider>
                <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${colorClass} cursor-help`}>
                            {safeValue > 0 ? "+" : ""}{safeValue.toFixed(1)}%
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Comparado com o mês anterior</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white block">
                            {formatCurrency(balance)}
                        </span>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Saldo
                        </CardTitle>
                    </div>
                    <div className="h-10 w-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <PercentageBadge value={balanceChange} />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white block">
                            {formatCurrency(income)}
                        </span>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Renda total
                        </CardTitle>
                    </div>
                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <PercentageBadge value={incomeChange} />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white block">
                            {formatCurrency(expenses)}
                        </span>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Despesas totais
                        </CardTitle>
                    </div>
                    <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        {/* Expenses: Inverse logic (Increase = Bad/Red, Decrease = Good/Green) */}
                        <PercentageBadge value={expensesChange} inverse />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white block">
                            {formatCurrency(investments)}
                        </span>
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Investimentos
                        </CardTitle>
                    </div>
                    <div className="h-10 w-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                        <PiggyBank className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <PercentageBadge value={investmentsChange} />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
