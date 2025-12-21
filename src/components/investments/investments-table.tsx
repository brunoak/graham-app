"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TrendingUp, TrendingDown, DollarSign, Building2, Wallet, Filter, Upload, Plus } from "lucide-react"
import { AddAssetDialog } from "./add-asset-dialog"
import Link from "next/link"
import type { Asset } from "@/lib/schemas/investment-schema"

import type { MarketQuote } from "@/lib/services/market-service"

interface InvestmentsTableProps {
    viewCurrency: "BRL" | "USD"
    onViewCurrencyChange: (currency: "BRL" | "USD") => void
    assets: Asset[]
    quotes?: Record<string, MarketQuote>
    exchangeRate?: number
}

/**
 * Investments Table Component.
 * Lists all user assets with Real-Time Prices and Profitability.
 * 
 * Features:
 * - **Real-Time Prices:** Uses `quotes[ticker].regularMarketPrice` if available.
 *   - Fallback: Uses `asset.average_price` if no live quote is found.
 * - **Currency Conversion:** Toggles between BRL and USD view using Real-Time Exchange Rate.
 * - **Mobile View:** Responsive card layout for small screens.
 * - **Skeleton Loading:** Displays loading state while data fetches.
 */
export function InvestmentsTable({ viewCurrency, onViewCurrencyChange, assets, quotes, exchangeRate }: InvestmentsTableProps) {
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])

    // Use Real Exchange Rate or Fallback
    const USD_BRL_RATE = exchangeRate || 5.50

    const toggleType = (type: string) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        )
    }

    const formatCurrency = (value: number, currency: string) => {
        const locale = currency === 'USD' ? 'en-US' : 'pt-BR'
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(value)
    }

    const isEmpty = assets.length === 0

    let displayInvestments = assets

    // Placeholder Logic for Skeleton
    if (isEmpty) {
        // Create 5 fake items
        displayInvestments = Array(5).fill(null).map((_, i) => ({
            id: `skeleton-${i}`,
            ticker: "XXXX3",
            name: "Placeholder Asset",
            type: "stock_br",
            quantity: 100,
            average_price: 10,
            currency: "BRL",
            last_update: new Date(),
            // Skeleton flag
            isSkeleton: true
        } as any))
    } else {
        // Apply Filters only if not empty
        displayInvestments = displayInvestments.filter(inv => {
            if (selectedTypes.length === 0) return true
            return selectedTypes.includes(inv.type)
        })
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "stock_br": return "Ações Brasil"
            case "stock_us": return "Ações EUA"
            case "etf_br": return "ETF Brasil"
            case "etf_us": return "ETF EUA"
            case "reit_br": return "FIIs"
            case "reit_us": return "REITs"
            case "crypto": return "Cripto"
            case "treasure": return "Tesouro Direto"
            case "fixed_income": return "Renda Fixa"
            case "fixed_income_us": return "Renda Fixa EUA"
            case "fund": return "Fundos de Inv."
            case "fiagro": return "FI Agro"
            case "fund_exempt": return "Fundos Isentos"
            default: return type
        }
    }

    return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Header Controls */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 overflow-x-auto gap-4">
                {/* Left Side: Title & Filters */}
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white shrink-0">Meus Ativos</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 border-dashed gap-1 text-xs" disabled={isEmpty}>
                                <Filter className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Filtrar</span>
                                {selectedTypes.length > 0 && (
                                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 rounded-sm lg:hidden">
                                        {selectedTypes.length}
                                    </Badge>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            <DropdownMenuLabel>Renda Variável</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {["stock_br", "stock_us", "etf_br", "etf_us", "reit_br", "reit_us", "crypto", "fiagro"].map((type) => (
                                <DropdownMenuCheckboxItem
                                    key={type}
                                    checked={selectedTypes.includes(type)}
                                    onCheckedChange={() => toggleType(type)}
                                >
                                    {getTypeLabel(type)}
                                </DropdownMenuCheckboxItem>
                            ))}

                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Renda Fixa & Fundos</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {["fixed_income", "fixed_income_us", "treasure", "fund", "fund_exempt"].map((type) => (
                                <DropdownMenuCheckboxItem
                                    key={type}
                                    checked={selectedTypes.includes(type)}
                                    onCheckedChange={() => toggleType(type)}
                                >
                                    {getTypeLabel(type)}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {selectedTypes.length > 0 && (
                        <div className="hidden lg:flex items-center gap-2 border-l border-gray-200 dark:border-zinc-800 pl-3">
                            {selectedTypes.length > 2 ? (
                                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                    {selectedTypes.length} selecionados
                                </Badge>
                            ) : (
                                selectedTypes.map(type => (
                                    <Badge key={type} variant="secondary" className="rounded-sm px-1 font-normal capitalize">
                                        {getTypeLabel(type)}
                                    </Badge>
                                ))
                            )}
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedTypes([])}
                                className="h-8 px-2 lg:px-3 text-xs"
                            >
                                Limpar
                            </Button>
                        </div>
                    )}
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-lg p-1 shrink-0">
                        <button
                            onClick={() => onViewCurrencyChange("BRL")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewCurrency === "BRL"
                                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
                                }`}
                        >
                            BRL
                        </button>
                        <button
                            onClick={() => onViewCurrencyChange("USD")}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${viewCurrency === "USD"
                                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 shadow-sm"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-900"
                                }`}
                        >
                            USD
                        </button>
                    </div>

                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-800 flex items-center justify-center">
                        <Upload className="h-4 w-4" />
                    </Button>

                    <AddAssetDialog />
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader className="bg-emerald-600 hover:bg-emerald-600 sticky top-0 z-10 shadow-sm">
                        <TableRow className="border-none hover:bg-emerald-600">
                            <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Ativo</TableHead>
                            <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Tipo</TableHead>
                            <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Quantidade</TableHead>
                            <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Preço Médio</TableHead>
                            <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Preço Atual</TableHead>
                            <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Saldo Total</TableHead>
                            <TableHead className="font-bold text-white text-center">Rentabilidade</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayInvestments.map((inv, index) => {
                            if ((inv as any).isSkeleton) {
                                return (
                                    <TableRow key={inv.id} className="border-b border-gray-100 dark:border-zinc-800/50">
                                        <TableCell><div className="h-8 w-24 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse mx-auto" /></TableCell>
                                        <TableCell><div className="h-6 w-16 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse mx-auto" /></TableCell>
                                        <TableCell><div className="h-6 w-12 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse ml-auto" /></TableCell>
                                        <TableCell><div className="h-6 w-20 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse ml-auto" /></TableCell>
                                        <TableCell><div className="h-6 w-20 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse ml-auto" /></TableCell>
                                        <TableCell><div className="h-6 w-24 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse ml-auto" /></TableCell>
                                        <TableCell><div className="h-6 w-16 bg-gray-100 dark:bg-zinc-800 rounded animate-pulse ml-auto" /></TableCell>
                                    </TableRow>
                                )
                            }

                            // Currency Conversion Logic
                            // Use Real Quote Price if available, otherwise Average Price fallback
                            const realPrice = quotes?.[inv.ticker]?.regularMarketPrice || inv.average_price

                            let displayAvgPrice = inv.average_price
                            let displayCurrentPrice = realPrice

                            if (viewCurrency === "BRL" && inv.currency === "USD") {
                                displayAvgPrice *= USD_BRL_RATE
                                displayCurrentPrice *= USD_BRL_RATE
                            } else if (viewCurrency === "USD" && inv.currency === "BRL") {
                                displayAvgPrice /= USD_BRL_RATE
                                displayCurrentPrice /= USD_BRL_RATE
                            }

                            const totalValue = inv.quantity * displayCurrentPrice
                            const profit = (displayCurrentPrice - displayAvgPrice) * inv.quantity
                            const profitPercent = displayAvgPrice > 0
                                ? ((displayCurrentPrice - displayAvgPrice) / displayAvgPrice) * 100
                                : 0

                            return (
                                <TableRow
                                    key={inv.id}
                                    className={`
                                        border-b border-gray-100 dark:border-zinc-800/50 
                                        hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 
                                        transition-colors
                                        ${index % 2 === 0
                                            ? 'bg-white dark:bg-zinc-900'
                                            : 'bg-gray-50 dark:bg-zinc-800/30'
                                        }
                                    `}
                                >
                                    <TableCell className="pl-4">
                                        <div className="flex items-center gap-3">
                                            {quotes?.[inv.ticker]?.logourl ? (
                                                <img
                                                    src={quotes[inv.ticker].logourl}
                                                    alt={inv.ticker}
                                                    className="w-8 h-8 rounded-full object-cover bg-white shadow-sm shrink-0"
                                                />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${inv.type.startsWith('stock') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20' :
                                                    inv.type.startsWith('etf') ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20' :
                                                        inv.type.startsWith('reit') ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20' :
                                                            inv.type === 'crypto' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20' :
                                                                inv.type === 'treasure' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20' :
                                                                    inv.type === 'fixed_income' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' :
                                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {inv.type.startsWith('stock') && <TrendingUp className="h-4 w-4" />}
                                                    {inv.type.startsWith('etf') && <TrendingUp className="h-4 w-4" />}
                                                    {inv.type.startsWith('reit') && <Building2 className="h-4 w-4" />}
                                                    {inv.type === 'crypto' && <Wallet className="h-4 w-4" />}
                                                    {inv.type === 'treasure' && <DollarSign className="h-4 w-4" />}
                                                    {inv.type === 'fixed_income' && <DollarSign className="h-4 w-4" />}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <Link href={`/dashboard/investments/${inv.ticker}`} className="hover:underline hover:text-emerald-600 transition-colors">
                                                    <span className="font-medium text-gray-900 dark:text-gray-100">{inv.ticker}</span>
                                                </Link>
                                                <span className="text-xs text-muted-foreground">{inv.name}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-gray-600 dark:text-gray-300">
                                        {getTypeLabel(inv.type)}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-600 dark:text-gray-300">
                                        {inv.quantity.toLocaleString('pt-BR', { minimumFractionDigits: inv.type === 'crypto' ? 4 : (inv.type === 'treasure' ? 2 : 0) })}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-600 dark:text-gray-300">
                                        {formatCurrency(displayAvgPrice, viewCurrency)}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-600 dark:text-gray-300">
                                        {formatCurrency(displayCurrentPrice, viewCurrency)}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-600 dark:text-gray-300">
                                        {formatCurrency(totalValue, viewCurrency)}
                                    </TableCell>
                                    <TableCell className="text-right pr-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <Badge
                                                variant="secondary"
                                                className={`${profit >= 0
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                                    : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                                    } font-mono`}
                                            >
                                                {profit >= 0 ? "+" : ""}
                                                {profitPercent.toFixed(2)}%
                                            </Badge>
                                        </div>
                                        <div className={`text-xs mt-1 ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                            {profit >= 0 ? "+" : ""}
                                            {formatCurrency(profit, viewCurrency)}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
                {displayInvestments.map((inv) => {
                    // Mobile Skeleton
                    if ((inv as any).isSkeleton) {
                        return (
                            <div key={inv.id} className="p-4 flex gap-3 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 shrink-0 mt-1" />
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="h-5 w-20 bg-gray-100 dark:bg-zinc-800 rounded" />
                                            <div className="h-4 w-32 bg-gray-100 dark:bg-zinc-800 rounded" />
                                        </div>
                                        <div className="h-5 w-24 bg-gray-100 dark:bg-zinc-800 rounded" />
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="h-4 w-16 bg-gray-100 dark:bg-zinc-800 rounded" />
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-16 bg-gray-100 dark:bg-zinc-800 rounded" />
                                            <div className="h-5 w-12 bg-gray-100 dark:bg-zinc-800 rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    // Currency Conversion Logic (Mobile - Sync with Desktop)
                    const realPrice = quotes?.[inv.ticker]?.regularMarketPrice || inv.average_price

                    let displayAvgPrice = inv.average_price
                    let displayCurrentPrice = realPrice

                    if (viewCurrency === "BRL" && inv.currency === "USD") {
                        displayAvgPrice *= USD_BRL_RATE
                        displayCurrentPrice *= USD_BRL_RATE
                    } else if (viewCurrency === "USD" && inv.currency === "BRL") {
                        displayAvgPrice /= USD_BRL_RATE
                        displayCurrentPrice /= USD_BRL_RATE
                    }

                    const totalValue = inv.quantity * displayCurrentPrice
                    const profit = (displayCurrentPrice - displayAvgPrice) * inv.quantity
                    // Prevent division by zero
                    const profitPercent = displayAvgPrice > 0
                        ? ((displayCurrentPrice - displayAvgPrice) / displayAvgPrice) * 100
                        : 0

                    return (
                        <Link
                            key={inv.id}
                            href={`/dashboard/investments/${inv.ticker}`}
                            className="p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                            {/* Icon */}
                            {quotes?.[inv.ticker]?.logourl ? (
                                <img
                                    src={quotes[inv.ticker].logourl}
                                    alt={inv.ticker}
                                    className="w-10 h-10 rounded-full object-cover bg-white shadow-sm shrink-0 mt-1"
                                />
                            ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${inv.type.startsWith('stock') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20' :
                                    inv.type.startsWith('etf') ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20' :
                                        inv.type.startsWith('reit') ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20' :
                                            inv.type === 'crypto' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20' :
                                                inv.type === 'treasure' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20' :
                                                    inv.type === 'fixed_income' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' :
                                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {inv.type.startsWith('stock') && <TrendingUp className="h-5 w-5" />}
                                    {inv.type.startsWith('etf') && <TrendingUp className="h-5 w-5" />}
                                    {inv.type.startsWith('reit') && <Building2 className="h-5 w-5" />}
                                    {inv.type === 'crypto' && <Wallet className="h-5 w-5" />}
                                    {inv.type === 'treasure' && <DollarSign className="h-5 w-5" />}
                                    {inv.type === 'fixed_income' && <DollarSign className="h-5 w-5" />}
                                </div>
                            )}

                            <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-0.5">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">{inv.ticker}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-[150px] truncate">{inv.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                                            {formatCurrency(totalValue, viewCurrency)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                        {getTypeLabel(inv.type)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-medium ${profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                            {profit >= 0 ? "+" : ""}
                                            {formatCurrency(profit, viewCurrency)}
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className={`${profit >= 0
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                                : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                                } font-mono text-xs px-1.5 h-5`}
                                        >
                                            {profit >= 0 ? "+" : ""}
                                            {profitPercent.toFixed(1)}%
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
