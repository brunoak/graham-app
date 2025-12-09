"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
import { TransactionDTO } from "@/lib/data/transaction-data"

interface TransactionsTableProps {
    mode?: "default" | "widget"
    transactions?: TransactionDTO[]
}

export function TransactionsTable({ mode = "default", transactions: initialTransactions }: TransactionsTableProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedRows, setSelectedRows] = useState<number[]>([])
    // Initialize state with props if available, otherwise mock
    const [data, setData] = useState<TransactionDTO[]>(initialTransactions || mockTransactions)

    useEffect(() => {
        if (initialTransactions) {
            setData(initialTransactions)
        }
    }, [initialTransactions])

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
    const handleCategoryUpdate = (transactionId: number, newCategoryName: string) => {
        setData(prevData => prevData.map(t =>
            t.id === transactionId ? { ...t, category: newCategoryName } : t
        ))
    }

    const handleAddTransaction = (newTx: any) => {
        const id = Math.max(...data.map(d => d.id), 0) + 1
        const value = newTx.type === "expense" ? -Math.abs(newTx.amount) : Math.abs(newTx.amount)
        const dateStr = format(newTx.date, "d 'de' MMM", { locale: ptBR })

        setData(prev => [{
            id,
            category: newTx.category,
            name: newTx.name,
            description: newTx.description,
            date: dateStr,
            value,
            via: newTx.via === "conta_corrente" ? "Conta" : newTx.via, // Simple mapping
            status: "completed"
        }, ...prev])
    }

    const handleDeleteRows = () => {
        setData(prev => prev.filter(t => !selectedRows.includes(t.id)))
        setSelectedRows([])
    }

    const handleDeleteSingle = (id: number) => {
        setData(prev => prev.filter(t => t.id !== id))
    }

    if (mode === "widget") {
        return (
            <Card className="col-span-12 bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
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
                            <TableHeader className="bg-transparent">
                                <TableRow className="border-none hover:bg-transparent">
                                    <TableHead className="w-[50px] font-semibold text-gray-500 pl-6">Categoria</TableHead>
                                    <TableHead className="w-[200px] font-semibold text-gray-500">Nome</TableHead>
                                    <TableHead className="font-semibold text-gray-500">Descrição</TableHead>
                                    <TableHead className="font-semibold text-gray-500">Data</TableHead>
                                    <TableHead className="font-semibold text-gray-500">Valor</TableHead>
                                    <TableHead className="font-semibold text-gray-500">Via</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((t) => (
                                    <TableRow key={t.id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                        <TableCell className="pl-6">
                                            <CategoryBadge
                                                categoryName={t.category}
                                                onUpdate={(newCat) => handleCategoryUpdate(t.id, newCat)}
                                                size="sm"
                                                interactive={false}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-gray-700 dark:text-gray-300 max-w-[150px] truncate" title={t.name}>
                                            {t.name}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 max-w-[150px] truncate" title={t.description}>{t.description}</TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400">{t.date}</TableCell>
                                        <TableCell className={`font-medium whitespace-nowrap ${t.value < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                            {t.value < 0 ? "- " : "+ "}
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(t.value))}
                                        </TableCell>
                                        <TableCell className="text-gray-500 dark:text-gray-400 max-w-[100px] truncate" title={t.via}>{t.via}</TableCell>
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
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(t.value))}
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
                        onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
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
                        onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>


                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {selectedRows.length > 0 && (
                        <div className="flex items-center gap-1 mr-2 border-r border-gray-200 dark:border-zinc-800 pr-2">
                            <TransactionDialog onSave={handleAddTransaction}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded">
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

                    <Button variant="outline" className="border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 md:w-auto w-10 px-0 md:px-4">
                        <Upload className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Importar</span>
                    </Button>
                    <TransactionDialog onSave={handleAddTransaction}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap md:w-auto w-10 px-0 md:px-4">
                            <Plus className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Criar transação</span>
                        </Button>
                    </TransactionDialog>
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block">
                <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-zinc-800/50">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="w-[40px] pl-4">
                                <Checkbox
                                    checked={selectedRows.length === transactions.length && transactions.length > 0}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-[50px] font-semibold text-gray-500">Categoria</TableHead>
                            <TableHead className="w-[200px] font-semibold text-gray-500">Nome</TableHead>
                            <TableHead className="font-semibold text-gray-500">Descrição</TableHead>
                            <TableHead className="font-semibold text-gray-500">Data</TableHead>
                            <TableHead className="font-semibold text-gray-500">Valor</TableHead>
                            <TableHead className="font-semibold text-gray-500">Via</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((t) => (
                            <TableRow key={t.id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                                <TableCell className="pl-4">
                                    <Checkbox
                                        checked={selectedRows.includes(t.id)}
                                        onCheckedChange={() => handleRowSelect(t.id)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <CategoryBadge
                                        categoryName={t.category}
                                        onUpdate={(newCat) => handleCategoryUpdate(t.id, newCat)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={t.name}>
                                    {t.name}
                                </TableCell>
                                <TableCell className="text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={t.description}>{t.description}</TableCell>
                                <TableCell className="text-gray-500 dark:text-gray-400">{t.date}</TableCell>
                                <TableCell className={`font-medium whitespace-nowrap ${t.value < 0 ? "text-red-500" : "text-emerald-600"}`}>
                                    {t.value < 0 ? "- " : "+ "}
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: (t as any).currency || 'BRL' }).format(Math.abs(t.value))}
                                </TableCell>
                                <TableCell className="text-gray-500 dark:text-gray-400 max-w-[100px] truncate" title={t.via}>{t.via}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-zinc-800">
                {transactions.map((t) => (
                    <div key={t.id} className="p-4 flex gap-3">
                        <Link href="/dashboard/categories" className="shrink-0 pt-1">
                            <CategoryBadge categoryName={t.category} size="sm" interactive={false} />
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
                                    <TransactionDialog>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-gray-50 dark:bg-zinc-800/50 text-gray-400 hover:text-emerald-600">
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TransactionDialog>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-gray-50 dark:bg-zinc-800/50 text-gray-400 hover:text-red-600">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-zinc-800">
                <span className="text-xs text-muted-foreground">Mostrando 10 of 45 Transações</span>
                <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 p-0 border-gray-200 dark:border-zinc-800"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button size="icon" className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white border-none">1</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-gray-500">2</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-gray-500">3</Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 p-0 border-gray-200 dark:border-zinc-800"><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
    )
}
