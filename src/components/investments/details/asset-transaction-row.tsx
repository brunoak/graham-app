"use client"

import { useState } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { InvestmentTransaction } from "@/lib/schemas/investment-schema"
import { deleteInvestmentTransaction } from "@/lib/actions/investment-actions"
import { toast } from "sonner" // Assuming sonner or useToast
import { EditTransactionDialog } from "./edit-transaction-dialog"

interface AssetTransactionRowProps {
    transaction: InvestmentTransaction
    currency: string
}

export function AssetTransactionRow({ transaction, currency }: AssetTransactionRowProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('pt-BR')
    }

    const formatCurrency = (val: number) => {
        const locale = currency === 'USD' ? 'en-US' : 'pt-BR'
        return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val)
    }

    const handleDelete = async () => {
        try {
            setIsDeleting(true)
            await deleteInvestmentTransaction(transaction.id!)
            toast.success("Transação excluída e carteira recalculada.")
            setShowDeleteDialog(false)
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir.")
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <TableRow>
                <TableCell>{formatDate(transaction.date)}</TableCell>
                <TableCell>
                    <Badge
                        className={
                            transaction.type === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                transaction.type === 'dividend' ? 'bg-sky-500 hover:bg-sky-600' :
                                    'bg-red-600 hover:bg-red-700'
                        }
                    >
                        {transaction.type === 'buy' ? 'Compra' : transaction.type === 'dividend' ? 'Provento' : 'Venda'}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">{transaction.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(transaction.price)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(transaction.total || 0)}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação excluirá o lançamento e **recalculará seu Preço Médio**.
                            Se esta operação já tiver sido realizada (vendida), certifique-se que o saldo não ficará negativo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeleting}
                        >
                            {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit Dialog */}
            <EditTransactionDialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                transaction={transaction}
                currency={currency}
            />
        </>
    )
}
