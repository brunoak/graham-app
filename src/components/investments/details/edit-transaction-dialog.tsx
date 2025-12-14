"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { InvestmentTransaction } from "@/lib/schemas/investment-schema"
import { updateInvestmentTransaction } from "@/lib/actions/investment-actions" // You need to export this from actions
import { toast } from "sonner"

interface EditTransactionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    transaction: InvestmentTransaction
    currency: string
}

export function EditTransactionDialog({ open, onOpenChange, transaction, currency }: EditTransactionDialogProps) {
    const [date, setDate] = useState<Date | undefined>(new Date(transaction.date))
    const [quantity, setQuantity] = useState(transaction.quantity.toString())
    const [price, setPrice] = useState("") // Will init in useEffect to format
    const [type, setType] = useState(transaction.type) // 'buy' or 'sell'
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (open && transaction) {
            setDate(new Date(transaction.date))
            setQuantity(transaction.quantity.toString())
            // Format price based on currency or just raw? 
            // Better to show raw number for editing usually, but let's try to match Add dialog
            setPrice(transaction.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 }))
            setType(transaction.type)
        }
    }, [open, transaction])

    // Helper to parse "R$ 1.234,56" or "1.234,56" to 1234.56
    const parsePrice = (val: string) => {
        if (!val) return 0
        const clean = val.replace("R$", "").replace("$", "").trim().replace(/\./g, "").replace(",", ".")
        return parseFloat(clean)
    }

    const formatPriceDisplay = (val: string) => {
        // Simple input masking could be added here, currently raw text
        return val
    }

    const handleSave = async () => {
        try {
            setLoading(true)
            setError("")

            if (!date || !quantity || !price) {
                setError("Preencha todos os campos")
                return
            }

            const cleanPrice = parsePrice(price)
            if (isNaN(cleanPrice) || cleanPrice <= 0) {
                setError("Preço inválido")
                return
            }

            const cleanQty = parseFloat(quantity)
            if (isNaN(cleanQty) || cleanQty <= 0) {
                setError("Quantidade inválida")
                return
            }

            const updatedTx: InvestmentTransaction = {
                ...transaction,
                date: date,
                quantity: cleanQty,
                price: cleanPrice,
                total: cleanQty * cleanPrice,
                // fees... assume 0 or keep old? Logic not fully generic yet.
                // For now, let's keep simplistic.
            }

            await updateInvestmentTransaction(transaction.id!, updatedTx as any)

            toast.success("Transação atualizada com sucesso")
            onOpenChange(false)

        } catch (err: any) {
            console.error(err)
            setError(err.message || "Erro ao atualizar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900">
                <DialogHeader>
                    <DialogTitle>Editar Transação</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Tipo</Label>
                        <div className="col-span-3 font-medium">
                            {type === 'buy' ? 'Compra' : 'Venda'} (Desabilitado)
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Data
                        </Label>
                        <div className="col-span-3">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(date, "dd/MM/yyyy") : <span>Selecione</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="qty" className="text-right">
                            Qtd.
                        </Label>
                        <Input
                            id="qty"
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">
                            Preço
                        </Label>
                        <Input
                            id="price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="col-span-3"
                            placeholder="0,00"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
