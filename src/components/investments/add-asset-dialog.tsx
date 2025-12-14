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
    const [currency, setCurrency] = useState<"BRL" | "USD">("BRL")

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Calculate total (price is formatted string, quantity is string)
    // Parse price based on currency
    const parsePrice = (priceStr: string) => {
        let cleanValue = priceStr.replace('R$', '').replace('US$', '').trim()
        if (currency === "BRL") {
            cleanValue = cleanValue.replace(/\./g, '').replace(',', '.')
        } else {
            cleanValue = cleanValue.replace(/,/g, '')
        }
        return parseFloat(cleanValue) || 0
    }

    const total = operation === "dividend"
        ? parsePrice(price)
        : (parseFloat(quantity || "0") * parsePrice(price))

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value
        value = value.replace(/\D/g, "")

        if (value === "") {
            setPrice("")
            return
        }

        const numericValue = parseFloat(value) / 100
        let result = ""
        if (currency === "BRL") {
            result = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(numericValue)
            setPrice(`R$ ${result}`)
        } else {
            result = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(numericValue)
            setPrice(`US$ ${result}`)
        }
    }

    const toggleCurrency = (newCurrency: "BRL" | "USD") => {
        setCurrency(newCurrency)
        setPrice("") // Reset price to avoid format confusion
    }

    // Reset form when dialog closes
    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen) {
            // Slight delay to avoid flickering while closing
            setTimeout(() => {
                setCategory("bolsa")
                setType("") // Reset to empty or default
                setOperation("compra")
                setTicker("")
                setInstitution("")
                setQuantity("")
                setPrice("")
                setCurrency("BRL")
                setDate(new Date())
                setError("")
            }, 300)
        }
    }

    const handleSave = async () => {
        try {
            setLoading(true)
            setError("")

            if (!date || !ticker || !price) {
                setError("Preencha todos os campos obrigatórios")
                return
            }

            if (operation !== "dividend" && !quantity) {
                setError("Quantidade é obrigatória")
                return
            }

            // Map UI types to Backend Enums (Simplified)
            // Ideally we would have strict mapping, but for now we pass the raw 'type' or fallback
            // The user requested new types, we should ensure the backend accepts them or we map them to existing general types.
            // For now, I'll map specific legacy types and pass others through or default to stock_br/stock_us

            let finalAssetType = "stock_br"
            // Simple mapping logic
            if (category === "cripto") finalAssetType = "crypto"
            else if (category === "tesouro") finalAssetType = "treasure"
            else if (category === "renda_fixa") finalAssetType = "fixed_income"
            else if (category === "renda_fixa_eua") finalAssetType = "fixed_income_us"
            else if (category === "fundos") finalAssetType = "fund"
            else if (category === "bolsa") {
                if (type === "fii") finalAssetType = "reit_br"
                else if (type === "etf") finalAssetType = "etf_br"
                else if (type === "bdr") finalAssetType = "stock_br"
                else if (type === "acoes_eua") finalAssetType = "stock_us"
                else if (type === "etf_usa") finalAssetType = "etf_us"
                else if (type === "reit") finalAssetType = "reit_us"
                else if (type === "fiagro") finalAssetType = "fiagro"
                else if (type === "fundo_isento") finalAssetType = "fund_exempt"
                else if (type === "renda_fixa") finalAssetType = "fixed_income"
                else if (type === "tesouro") finalAssetType = "treasure"
                else if (type === "renda_fixa_eua") finalAssetType = "fixed_income_us"

                else finalAssetType = "stock_br"
            }

            const payload = {
                ticker: ticker.toUpperCase(),
                type: operation === "dividend" ? "dividend" : (operation === "compra" ? "buy" : "sell") as "buy" | "sell" | "dividend",
                date: date,
                quantity: operation === "dividend" ? 1 : parseFloat(quantity),
                price: parsePrice(price),
                total: operation === "dividend" ? parsePrice(price) : total,
                fees: 0, // Default fees to 0 for now
                assetType: finalAssetType,
                assetName: institution ? `${ticker.toUpperCase()} (${institution})` : ticker.toUpperCase(),
                currency: currency // Now we support currency
            }

            const { createInvestmentTransaction } = await import("@/lib/actions/investment-actions")

            await createInvestmentTransaction(payload)

            setOpen(false)
            // Reset form immediately
            setTicker("")
            setQuantity("")
            setPrice("")
            setInstitution("")
            setCurrency("BRL")
            // Category/Type usually user keeps same flow, but user requested full reset.
            // The handleOpenChange will care for it.

        } catch (err: any) {
            console.error(err)
            setError(err.message || "Erro ao salvar investimento")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
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
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-900">
                            {error}
                        </div>
                    )}

                    {/* Category */}
                    <div className="space-y-2">
                        <Label>Categoria <span className="text-red-500">*</span></Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800">
                                <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bolsa">Bolsa de Valores (BR e EUA)</SelectItem>
                                <SelectItem value="cripto">Criptomoedas</SelectItem>
                                <SelectItem value="tesouro">Tesouro Direto</SelectItem>
                                <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
                                <SelectItem value="renda_fixa_eua">Renda Fixa EUA</SelectItem>
                                <SelectItem value="fundos">Fundos de Investimentos</SelectItem>
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
                                    <SelectItem value="acoes_eua">Ações EUA</SelectItem>
                                    <SelectItem value="etf">ETF</SelectItem>
                                    <SelectItem value="etf_usa">ETF USA</SelectItem>
                                    <SelectItem value="fii">FII</SelectItem>
                                    <SelectItem value="fiagro">FI Agro</SelectItem>
                                    <SelectItem value="reit">REIT</SelectItem>
                                    <SelectItem value="bdr">BDR</SelectItem>
                                    <SelectItem value="fundo_isento">Fundo Isentos</SelectItem>
                                    <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
                                    <SelectItem value="renda_fixa_eua">Renda Fixa EUA</SelectItem>
                                    <SelectItem value="tesouro">Tesouro Direto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Operação <span className="text-red-500">*</span></Label>
                            <Select value={operation} onValueChange={setOperation}>
                                <SelectTrigger className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800">
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="compra">Compra</SelectItem>
                                    <SelectItem value="venda">Venda</SelectItem>
                                    <SelectItem value="dividend">Dividendos / JCP</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Row 2: Institution & Asset */}
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
                            <Label>Ativo <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="MGLU3, VALE3..."
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                                className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800"
                            />
                        </div>
                    </div>

                    {/* Row 3: Date & Quantity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 flex flex-col">
                            <Label>Data <span className="text-red-500">*</span></Label>
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

                        {operation !== "dividend" && (
                            <div className="space-y-2">
                                <Label>Quantidade <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800"
                                />
                            </div>
                        )}
                    </div>


                    {/* Row 4: PRICE (FORMATTED) & Currency Toggle */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="font-semibold">
                                {operation === "dividend" ? "Valor Total Recebido" : "Preço Unitário"} <span className="text-red-500">*</span>
                            </Label>
                            {/* Currency Toggle */}
                            <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-md p-1 items-center scale-90 origin-right">
                                <button
                                    onClick={() => toggleCurrency("BRL")}
                                    className={cn(
                                        "px-3 py-1 text-xs font-bold rounded-sm transition-all",
                                        currency === "BRL"
                                            ? "bg-white dark:bg-zinc-600 text-black dark:text-white shadow-sm"
                                            : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    BRL
                                </button>
                                <button
                                    onClick={() => toggleCurrency("USD")}
                                    className={cn(
                                        "px-3 py-1 text-xs font-bold rounded-sm transition-all",
                                        currency === "USD"
                                            ? "bg-white dark:bg-zinc-600 text-black dark:text-white shadow-sm"
                                            : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    USD
                                </button>
                            </div>
                        </div>
                        <Input
                            type="text"
                            placeholder={currency === "BRL" ? "R$ 0,00" : "US$ 0.00"}
                            value={price}
                            onChange={handlePriceChange}
                            className="bg-white dark:bg-zinc-900 h-12 text-lg border-gray-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-emerald-500"
                        />
                    </div>

                    {/* Total Display */}
                    <div className="flex justify-between items-center border-t border-gray-100 dark:border-zinc-800 pt-4">
                        <span className="text-sm font-medium text-gray-500">Valor Total da Operação</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                            {new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', { style: 'currency', currency }).format(isNaN(total) ? 0 : total)}
                        </span>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t border-gray-100 dark:border-zinc-800 pt-4">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={loading}
                    >
                        {loading ? "Salvando..." : "Confirmar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
