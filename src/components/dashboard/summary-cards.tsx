"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"

interface SummaryCardsProps {
    balance: number
    income: number
    expenses: number
    investments: number
}

export function SummaryCards({ balance, income, expenses, investments }: SummaryCardsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)
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
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md dark:bg-emerald-900/50 dark:text-emerald-400">
                            +0.0%
                        </span>
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
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md dark:bg-emerald-900/50 dark:text-emerald-400">
                            +0.0%
                        </span>
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
                        <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md dark:bg-red-900/50 dark:text-red-400">
                            0.0%
                        </span>
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
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md dark:bg-emerald-900/50 dark:text-emerald-400">
                            0.0%
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
