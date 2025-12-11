"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, Plus } from "lucide-react"

export function AddAssetDialog() {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState<Date | undefined>(new Date())

    // Form State
    const [category, setCategory] = useState("bolsa")
    const [type, setType] = useState("")
    const [operation, setOperation] = useState("compra")
    const [ticker, setTicker] = useState("")
    const [institution, setInstitution] = useState("")
    const [quantity, setQuantity] = useState("")
    const [price, setPrice] = useState("")

    // Calculate total
    const total = (parseFloat(quantity || "0") * parseFloat(price?.replace(',', '.') || "0"))

    const handleSave = () => {
        // Here we would call the server action to save the asset
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="h-9 w-9 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center justify-center">
                    <Plus className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-zinc-900 border-none shadow-2xl">
                <DialogHeader className="pb-4 border-b border-gray-100 dark:border-zinc-800">
                    <DialogTitle className="text-xl font-bold dark:text-white">
                        Incluir ativo
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Category */}
                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800">
                                <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bolsa">Bolsa de Valores (BR e EUA)</SelectItem>
                                <SelectItem value="cripto">Criptomoedas</SelectItem>
                                <SelectItem value="tesouro">Tesouro Direto</SelectItem>
                                <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Row 1: Type & Operation */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="stock">Ação</SelectItem>
                                    <SelectItem value="fii">FII</SelectItem>
                                    <SelectItem value="etf">ETF</SelectItem>
                                    <SelectItem value="bdr">BDR</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Operação</Label>
                            <Select value={operation} onValueChange={setOperation}>
                                <SelectTrigger className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="compra">Compra</SelectItem>
                                    <SelectItem value="venda">Venda</SelectItem>
                                    <SelectItem value="bonificacao">Bonificação</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Asset & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Ativo</Label>
                            <Input
                                placeholder="MGLU3, VALE3..."
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800"
                            />
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>Data</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50",
                                            !date && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                        {date ? format(date, "dd/MM/yyyy") : <span>Selecione</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                        className="p-3 bg-white dark:bg-zinc-900 rounded-md"
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Row 3: Institution & Total */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Instituição</Label>
                            <Input
                                placeholder="XP, NuInvest..."
                                value={institution}
                                onChange={(e) => setInstitution(e.target.value)}
                                className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Total</Label>
                            <div className="flex h-9 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-1 text-sm shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-800 text-gray-500 items-center">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(isNaN(total) ? 0 : total)}
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Quantity & Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Preço</Label>
                            <Input
                                type="number"
                                placeholder="0,00"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t border-gray-100 dark:border-zinc-800 pt-4">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
