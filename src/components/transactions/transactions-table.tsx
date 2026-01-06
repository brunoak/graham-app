"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, subMonths, addMonths } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
    ChevronLeft,
    ChevronRight,
    Edit2,
    Trash2,
    Plus,
    Upload,
} from "lucide-react"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

import { FilterDialog } from "./filter-dialog"
import { mockTransactions } from "@/lib/mock-data"
import { TransactionDialog } from "./transaction-dialog"
import { CategoryBadge } from "./category-badge"
import { TransactionDTO, getTransactions } from "@/lib/data/transaction-data"
import { deleteTransaction, updateTransaction } from "@/lib/actions/transaction-actions"
import { toast } from "sonner"
import { ImportModal } from "@/components/import/import-modal"

interface TransactionsTableProps {
    mode?: "default" | "widget"
    transactions?: TransactionDTO[]
    totalCount?: number
    /** External date control (for syncing with SummaryCards) */
    externalDate?: Date
    /** Callback when date changes */
    onDateChange?: (date: Date) => void
}

export function TransactionsTable({
    mode = "default",
    transactions: initialTransactions,
    totalCount,
    externalDate,
    onDateChange,
}: TransactionsTableProps) {
    const [currentDate, setCurrentDate] = useState(externalDate || new Date())
    const [selectedRows, setSelectedRows] = useState<number[]>([])

    // Infinite Scroll State
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(totalCount || 0)
    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(true)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    // Initialize state with props if available, otherwise mock
    const [data, setData] = useState<TransactionDTO[]>(initialTransactions || mockTransactions)

    // Sync total if provided (for widget mode or initial load compatibility)
    useEffect(() => {
        if (totalCount !== undefined) setTotal(totalCount)
    }, [totalCount])

    // Sync with external date if provided (for syncing with SummaryCards)
    useEffect(() => {
        if (externalDate) {
            setCurrentDate(externalDate)
        }
    }, [externalDate])

    // Fetch transactions (initial load or month change)
    const fetchTransactions = useCallback(async (date: Date) => {
        setLoading(true)
        setPage(1)
        setHasMore(true)
        try {
            const month = date.getMonth()
            const year = date.getFullYear()
            const { data: newData, total: newTotal } = await getTransactions(1, 20, month, year)
            setData(newData)
            setTotal(newTotal)
            setSelectedRows([])
            setHasMore(newData.length < newTotal)
        } catch (error) {
            toast.error("Erro ao carregar transações")
        } finally {
            setLoading(false)
        }
    }, [])

    // Load more transactions (infinite scroll)
    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        try {
            const nextPage = page + 1
            const month = currentDate.getMonth()
            const year = currentDate.getFullYear()
            const { data: newData } = await getTransactions(nextPage, 20, month, year)
            if (newData.length === 0) {
                setHasMore(false)
            } else {
                setData(prev => [...prev, ...newData])
                setPage(nextPage)
                setHasMore(data.length + newData.length < total)
            }
        } catch (error) {
            console.error("Error loading more:", error)
        } finally {
            setLoadingMore(false)
        }
    }, [page, currentDate, loadingMore, hasMore, data.length, total])

    // Refetch when date changes (Month Navigation)
    useEffect(() => {
        if (mode === "default") {
            fetchTransactions(currentDate)
        }
    }, [currentDate, mode, fetchTransactions]) // Runs on mount and when date changes

    // IntersectionObserver for infinite scroll
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect()

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    loadMore()
                }
            },
            { threshold: 0.1 }
        )

        if (loadMoreRef.current) {
            observerRef.current.observe(loadMoreRef.current)
        }

        return () => observerRef.current?.disconnect()
    }, [hasMore, loadingMore, loading, loadMore])

    // Filter transactions (mock logic to simulate month filtering would go here)
    const transactions = mode === "widget" ? data.slice(0, 5) : data

    const handleRowSelect = (id: number) => {
        if (selectedRows.includes(id)) {
            setSelectedRows(selectedRows.filter(rowId => rowId !== id))
        } else {
            setSelectedRows([...selectedRows, id])
        }
    }

    const handleSelectAll = () => {
        if (selectedRows.length === transactions.length) {
            setSelectedRows([])
        } else {
            setSelectedRows(transactions.map(t => t.id))
        }
    }

    // Handle category update
    const handleCategoryUpdate = async (transactionId: number, newCategory: any) => {
        // Optimistic Update
        setData(prevData => prevData.map(t =>
            t.id === transactionId ? {
                ...t,
                category: newCategory.name,
                categoryIcon: newCategory.iconName,
                categoryColor: newCategory.color,
                raw_category_id: newCategory.id
            } : t
        ))

        // Server Persistence (Partial Update)
        try {
            await updateTransaction(transactionId, { category_id: newCategory.id })
            toast.success("Categoria atualizada")
        } catch (err) {
            console.error(err)
            toast.error("Erro ao salvar categoria")
        }
    }

    const handleAddTransaction = (newTx: any) => {
        // Use ID from newTx if available (from dialog update)
        // If not, use fallback logic for numeric mock (Math.max)
        const id = newTx.id || (Math.max(...data.map(d => d.id), 0) + 1)

        const value = newTx.type === "expense" ? -Math.abs(newTx.amount) : Math.abs(newTx.amount)
        // Ensure date object for formatting
        const txDate = newTx.date instanceof Date ? newTx.date : new Date(newTx.date)
        const dateStr = format(txDate, "d 'de' MMM", { locale: ptBR })

        setData(prev => {
            const exists = prev.find(t => t.id === id)
            if (exists) {
                // UPDATE existing
                return prev.map(t => t.id === id ? {
                    ...t,
                    // update fields
                    category: newTx.category,
                    name: newTx.name,
                    description: newTx.description,
                    date: dateStr,
                    value,
                    amount: Math.abs(newTx.amount),
                    via: newTx.via === "conta_corrente" ? "Conta" : newTx.via,
                    status: "completed",
                    categoryIcon: newTx.categoryIcon,
                    categoryColor: newTx.categoryColor,
                    raw_date: txDate.toISOString(),
                    raw_amount: Math.abs(newTx.amount),
                    raw_category_id: newTx.categoryId,
                    type: newTx.type,
                    currency: newTx.currency // Ensure currency persistent
                } : t)
            } else {
                // CREATE new
                return [{
                    id,
                    category: newTx.category,
                    name: newTx.name,
                    description: newTx.description,
                    date: dateStr,
                    value,
                    amount: Math.abs(newTx.amount),
                    via: newTx.via === "conta_corrente" ? "Conta" : newTx.via,
                    status: "completed",
                    categoryIcon: newTx.categoryIcon,
                    categoryColor: newTx.categoryColor,
                    raw_date: txDate.toISOString(),
                    raw_amount: Math.abs(newTx.amount),
                    raw_category_id: newTx.categoryId,
                    type: newTx.type,
                    currency: newTx.currency
                }, ...prev]
            }
        })
    }

    const handleDeleteRows = async () => {
        if (!confirm(`Tem certeza que deseja excluir ${selectedRows.length} transações?`)) return

        try {
            // Delete all selected transactions in parallel
            await Promise.all(selectedRows.map(id => deleteTransaction(id)))

            toast.success("Transações excluídas com sucesso")
            setData(prev => prev.filter(t => !selectedRows.includes(t.id)))
            setSelectedRows([])
        } catch (error) {
            console.error(error)
            toast.error("Erro ao excluir algumas transações. Tente novamente.")
        }
    }

    const handleDeleteSingle = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir esta transação?")) return

        try {
            await deleteTransaction(id)
            toast.success("Transação excluída")
            setData(prev => prev.filter(t => t.id !== id))
        } catch (error) {
            toast.error("Erro ao excluir")
        }
    }

    if (mode === "widget") {
        return (
            <Card className="col-span-12 bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none h-full pt-4 pb-0 gap-0">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Últimas movimentações</CardTitle>
                    <Link href="/dashboard/transactions">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-emerald-600">
                            Ver todas
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop View */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader className="bg-emerald-600 hover:bg-emerald-600 sticky top-0 z-10 shadow-sm">
                                <TableRow className="border-none hover:bg-emerald-600">
                                    <TableHead className="w-[50px] font-bold text-white pl-6 border-r border-emerald-500/50 text-center">Categoria</TableHead>
                                    <TableHead className="w-[200px] font-bold text-white text-center border-r border-emerald-500/50">Nome</TableHead>
                                    <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Descrição</TableHead>
                                    <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Data</TableHead>
                                    <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Valor</TableHead>
                                    <TableHead className="font-bold text-white text-center">Via</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((t, index) => (
                                    <TableRow
                                        key={t.id}
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
                                        <TableCell className="pl-6">
                                            <div className="flex justify-center">
                                                <CategoryBadge
                                                    categoryName={t.category}
                                                    onUpdate={(newCat) => handleCategoryUpdate(t.id, newCat)}
                                                    size="sm"
                                                    interactive={false}
                                                    iconName={t.categoryIcon}
                                                    color={t.categoryColor}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate text-center" title={t.name}>
                                            {t.name}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 max-w-[150px] truncate text-center" title={t.description}>{t.description}</TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 text-center">{t.date}</TableCell>
                                        <TableCell className={`font-medium whitespace-nowrap text-center ${t.value < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                            {t.value < 0 ? "- " : "+ "}
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(t.value))}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 max-w-[100px] truncate text-center" title={t.via}>{t.via}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
                        {transactions.map((t) => (
                            <div key={t.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                        <div className="font-semibold text-gray-900 dark:text-gray-100 max-w-[150px] truncate" title={t.name}>{t.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={t.description}>{t.description}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-medium whitespace-nowrap ${t.value < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                            {t.value < 0 ? "- " : "+ "}
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: t.currency || 'BRL' }).format(Math.abs(t.value))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-400">{t.date}</div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 max-w-[100px] truncate" title={t.via}>{t.via}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-100 dark:border-zinc-800">
                {/* Date Navigator */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-emerald-600"
                        onClick={() => {
                            const newDate = subMonths(currentDate, 1)
                            setCurrentDate(newDate)
                            onDateChange?.(newDate)
                        }}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 min-w-[140px] text-center">
                        {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-emerald-600"
                        onClick={() => {
                            const newDate = addMonths(currentDate, 1)
                            setCurrentDate(newDate)
                            onDateChange?.(newDate)
                        }}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>


                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {selectedRows.length > 0 && (
                        <div className="flex items-center gap-1 mr-2 border-r border-gray-200 dark:border-zinc-800 pr-2">
                            <TransactionDialog
                                onSave={handleAddTransaction}
                                initialData={transactions.find(t => t.id === selectedRows[0])}
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded"
                                    disabled={selectedRows.length !== 1}
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            </TransactionDialog>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                onClick={handleDeleteRows}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Filter Button */}
                    <FilterDialog />

                    <div className="h-4 w-px bg-gray-200 dark:bg-zinc-800 mx-1 hidden md:block" />

                    <ImportModal onImportComplete={() => fetchTransactions(currentDate)}>
                        <Button variant="outline" className="border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 md:w-auto w-10 px-0 md:px-4">
                            <Upload className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Importar</span>
                        </Button>
                    </ImportModal>
                    <TransactionDialog onSave={handleAddTransaction}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap md:w-auto w-10 px-0 md:px-4">
                            <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Criar transação</span>
                        </Button>
                    </TransactionDialog>
                </div>
            </div>

            {/* Desktop View - Scrollable Container with Sticky Header */}
            <div className="hidden md:block relative">
                <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 dark:scrollbar-track-zinc-800 dark:scrollbar-thumb-zinc-600">
                    <Table noWrapper>
                        <TableHeader className="bg-emerald-600 hover:bg-emerald-600 sticky top-0 z-20 shadow-sm">
                            <TableRow className="border-none hover:bg-emerald-600">
                                <TableHead className="w-[40px] pl-4 border-r border-emerald-500/50 text-center">
                                    <div className="flex justify-center">
                                        <Checkbox
                                            checked={selectedRows.length === transactions.length && transactions.length > 0}
                                            onCheckedChange={handleSelectAll}
                                            className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:text-emerald-600"
                                        />
                                    </div>
                                </TableHead>
                                <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Categoria</TableHead>
                                <TableHead className="w-[200px] font-bold text-white text-center border-r border-emerald-500/50">Nome</TableHead>
                                <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Descrição</TableHead>
                                <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Data</TableHead>
                                <TableHead className="font-bold text-white text-center border-r border-emerald-500/50">Valor</TableHead>
                                <TableHead className="font-bold text-white text-center">Via</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Loading Skeleton */}
                            {loading && (
                                <>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <TableRow key={`skeleton-${i}`} className="animate-pulse">
                                            <TableCell className="pl-4"><div className="h-4 w-4 bg-gray-200 dark:bg-zinc-700 rounded mx-auto" /></TableCell>
                                            <TableCell><div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded-full mx-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded mx-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-32 bg-gray-200 dark:bg-zinc-700 rounded mx-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-16 bg-gray-200 dark:bg-zinc-700 rounded mx-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-20 bg-gray-200 dark:bg-zinc-700 rounded mx-auto" /></TableCell>
                                            <TableCell><div className="h-4 w-16 bg-gray-200 dark:bg-zinc-700 rounded mx-auto" /></TableCell>
                                        </TableRow>
                                    ))}
                                </>
                            )}

                            {/* Empty State */}
                            {!loading && transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <div className="text-gray-400 dark:text-gray-500">
                                            Nenhuma transação encontrada para este mês
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {/* Data Rows */}
                            {!loading && transactions.map((t, index) => (
                                <TableRow
                                    key={t.id}
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
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={selectedRows.includes(t.id)}
                                                onCheckedChange={() => handleRowSelect(t.id)}
                                                className="border-gray-300 dark:border-zinc-700"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            <CategoryBadge
                                                categoryName={t.category}
                                                onUpdate={(newCat) => handleCategoryUpdate(t.id, newCat)}
                                                iconName={t.categoryIcon}
                                                color={t.categoryColor}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-gray-700 dark:text-gray-300 max-w-[200px] truncate text-center" title={t.name}>
                                        {t.name}
                                    </TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400 max-w-[200px] truncate text-center" title={t.description}>{t.description}</TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400 text-center">{t.date}</TableCell>
                                    <TableCell className={`font-medium whitespace-nowrap text-center ${t.value < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                        {t.value < 0 ? "- " : "+ "}
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: t.currency || 'BRL' }).format(Math.abs(t.value))}
                                    </TableCell>
                                    <TableCell className="text-gray-500 dark:text-gray-400 max-w-[100px] truncate text-center" title={t.via}>{t.via}</TableCell>
                                </TableRow>
                            ))}

                            {/* Loading More Indicator */}
                            {loadingMore && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-16 text-center">
                                        <div className="flex items-center justify-center gap-2 text-gray-400">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
                                            Carregando mais...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Infinite Scroll Trigger */}
                    <div ref={loadMoreRef} className="h-4" />
                </div>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
                {/* Loading Skeleton - Mobile */}
                {loading && (
                    <>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={`skeleton-m-${i}`} className="p-4 animate-pulse">
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-3">
                                        <div className="flex justify-between">
                                            <div className="space-y-2">
                                                <div className="h-4 w-24 bg-gray-200 dark:bg-zinc-700 rounded" />
                                                <div className="h-3 w-32 bg-gray-200 dark:bg-zinc-700 rounded" />
                                            </div>
                                            <div className="h-4 w-20 bg-gray-200 dark:bg-zinc-700 rounded" />
                                        </div>
                                        <div className="flex justify-between">
                                            <div className="h-3 w-16 bg-gray-200 dark:bg-zinc-700 rounded" />
                                            <div className="flex gap-2">
                                                <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded" />
                                                <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* Empty State - Mobile */}
                {!loading && transactions.length === 0 && (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                        Nenhuma transação encontrada para este mês
                    </div>
                )}

                {/* Data Rows - Mobile */}
                {!loading && transactions.map((t) => (
                    <div key={t.id} className="p-4 flex gap-3">
                        <Link href="/dashboard/categories" className="shrink-0 pt-1">
                            <CategoryBadge categoryName={t.category} size="sm" interactive={false} iconName={t.categoryIcon} color={t.categoryColor} />
                        </Link>
                        <div className="flex-1 space-y-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{t.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={t.description}>{t.description}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-medium whitespace-nowrap ${t.value < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                        {t.value < 0 ? "- " : "+ "}
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: (t as any).currency || 'BRL' }).format(Math.abs(t.value))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-400">{t.date}</div>
                                <div className="flex items-center gap-2">
                                    <TransactionDialog initialData={t as any} onSave={() => { }}>
                                        {/* onSave is handled internally now via props and actions */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-gray-50 dark:bg-zinc-800/50 text-gray-400 hover:text-emerald-600">
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TransactionDialog>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 bg-gray-50 dark:bg-zinc-800/50 text-gray-400 hover:text-red-600"
                                        onClick={() => handleDeleteSingle(t.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer with count */}
            <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-zinc-800">
                <span className="text-xs text-muted-foreground">
                    Mostrando {data.length} de {total} Transações
                </span>
                {hasMore && (
                    <span className="text-xs text-emerald-600">
                        Role para carregar mais
                    </span>
                )}
            </div>
        </div>
    )
}
