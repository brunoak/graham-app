"use client"

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
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronLeft, ChevronRight, Edit2, Trash2 } from "lucide-react"
import { TransactionDialog } from "./transaction-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const transactions = [
    { id: 1, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "30 Abril, 2024", via: "PayPal", status: "Sucesso" },
    { id: 2, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "25 Ago, 2024", via: "Pix", status: "Sucesso" },
    { id: 3, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "28 Abril, 2024", via: "Crédito", status: "Sucesso" },
    { id: 4, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "15 Abril, 2024", via: "PayPal", status: "Falhou" },
    { id: 5, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "05 Jul, 2024", via: "Ted", status: "Sucesso" },
    { id: 6, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "30 Maio, 2024", via: "Pix", status: "Em espera" },
    { id: 7, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "22 Abril, 2024", via: "Débito", status: "Sucesso" },
    { id: 8, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "01 Ago, 2024", via: "Débito", status: "Sucesso" },
    { id: 9, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "30 Abril, 2024", via: "Pix", status: "Falhou" },
    { id: 10, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "30 Abril, 2024", via: "Pix", status: "Sucesso" },
]

export function TransactionsTable() {
    return (
        <div className="w-full bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 shadow-sm">
            <Table>
                <TableHeader className="bg-gray-50/50 dark:bg-zinc-800/50">
                    <TableRow className="border-none hover:bg-transparent">
                        <TableHead className="w-[200px] font-semibold text-gray-500">Nome</TableHead>
                        <TableHead className="font-semibold text-gray-500">Descrição</TableHead>
                        <TableHead className="font-semibold text-gray-500">Data</TableHead>
                        <TableHead className="font-semibold text-gray-500">Valor</TableHead>
                        <TableHead className="font-semibold text-gray-500">Via</TableHead>
                        <TableHead className="text-right font-semibold text-gray-500">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((t) => (
                        <TableRow key={t.id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 bg-gray-200">
                                        <AvatarFallback className="text-xs text-gray-500">LI</AvatarFallback>
                                    </Avatar>
                                    <span className="text-gray-700 dark:text-gray-300">{t.name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-gray-500 dark:text-gray-400">{t.description}</TableCell>
                            <TableCell className="text-gray-500 dark:text-gray-400">{t.date}</TableCell>
                            <TableCell className="font-medium text-gray-900 dark:text-white">R${t.value.toFixed(2)}</TableCell>
                            <TableCell className="text-gray-500 dark:text-gray-400">{t.via}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <TransactionDialog>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-gray-100 dark:bg-zinc-800 rounded text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TransactionDialog>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-red-50 dark:bg-red-900/20 rounded text-red-500 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
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
