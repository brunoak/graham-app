"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { CalendarIcon, TrendingDown, TrendingUp, ChevronDown } from "lucide-react"
import { CategorySelectionDialog } from "./category-selection-dialog"

import { getCategoryByName, AVAILABLE_ICONS } from "@/lib/categories"
import { createTransaction, updateTransaction } from "@/lib/actions/transaction-actions"
import { toast } from "sonner"
import { getAccounts, AccountDTO } from "@/lib/data/account-data"
import { TransactionDTO } from "@/lib/data/transaction-data"



export interface TransactionData {
    id?: number
    type: "expense" | "income"
    amount: number
    currency: "BRL" | "USD"
    name: string
    category: string
    date: Date
    via: string
    description: string
}

interface TransactionDialogProps {
    children?: React.ReactNode
    onSave?: (data: TransactionData) => void
    initialData?: TransactionDTO
}

export function TransactionDialog({ children, onSave, initialData }: TransactionDialogProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    // Default or Initial State
    const [type, setType] = useState<"expense" | "income">("expense")

    // Form State
    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState<"BRL" | "USD">("BRL")
    const [name, setName] = useState("")
    const [categoryName, setCategoryName] = useState("Outros") // Restored state
    // State
    const [categoryId, setCategoryId] = useState<string>("default")
    // We need to display Name/Icon/Color for the selected category.
    // We can fetch all categories to look it up, or rely on what's passed.
    const [selectedCategoryData, setSelectedCategoryData] = useState<any>(null)
    const [accounts, setAccounts] = useState<AccountDTO[]>([])

    useEffect(() => {
        getAccounts().then(setAccounts)
    }, [])


    // Missing States Restored
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [via, setVia] = useState("nubank")
    const [customVia, setCustomVia] = useState("")
    const [description, setDescription] = useState("")

    // Load initial data when dialog opens
    useEffect(() => {
        if (open) {
            if (initialData) {
                // Edit Mode: Load existing data
                const amountVal = (initialData as any).raw_amount ?? initialData.amount ?? 0
                const dateVal = (initialData as any).raw_date ?? initialData.date
                const typeVal = (initialData as any).type ?? (amountVal < 0 ? "expense" : "income")

                setType(typeVal)

                // Format amount for display (always positive)
                const absVal = Math.abs(amountVal)
                const txCurrency = (initialData as any).currency || "BRL"

                if (txCurrency === "BRL") {
                    const formatted = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(absVal)
                    setAmount(`R$ ${formatted}`)
                } else {
                    const formatted = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(absVal)
                    setAmount(`US$ ${formatted}`)
                }

                setName(initialData.name)

                // Category setup
                const catId = (initialData as any).raw_category_id?.toString() || "default"
                setCategoryId(catId)
                setCategoryName(initialData.category)
                // Initialize selectedCategoryData to preserve Icon/Color for optimistic updates
                const initialIconName = (initialData as any).categoryIcon || "MoreHorizontal"
                const ResolvedIcon = AVAILABLE_ICONS[initialIconName as keyof typeof AVAILABLE_ICONS] || AVAILABLE_ICONS.MoreHorizontal

                setSelectedCategoryData({
                    id: catId,
                    name: initialData.category,
                    icon: ResolvedIcon, // Component for Render
                    iconName: initialIconName, // String for Save
                    color: (initialData as any).categoryColor
                })

                // Set date from data
                // Set date from data (UTC Parts Logic + Noon Normalization)
                if (dateVal) {
                    const d = new Date(dateVal)
                    // Create local date using UTC components to match "Display what's Stored"
                    const correctedDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0)
                    setDate(correctedDate)
                }

                setCurrency((initialData as any).currency || "BRL")

                setVia(initialData.via)
                setDescription(initialData.description)
            } else {
                // Create Mode: Reset form to defaults

                setAmount("")
                setName("")
                setDescription("")
                setCategoryId("default")
                setVia("nubank")
                setType("expense")
            }
        }
    }, [open, initialData])


    // Computed
    // selectedCategoryData has precedence (from manual selection)
    // fallback to getCategoryByName(categoryName) for initial load or legacy
    const category = selectedCategoryData || getCategoryByName(categoryName)
    const CategoryIcon = category.icon || "MoreHorizontal"

    const resetForm = () => {
        setAmount("")
        setCurrency("BRL")
        setName("")
        setCategoryId("default")
        setCategoryName("Outros")
        setSelectedCategoryData(null)
        const now = new Date()
        now.setHours(12, 0, 0, 0)
        setDate(now)
        setVia("nubank")
        setCustomVia("")
        setDescription("")
        setType("expense")
    }

    const handleSave = () => {
        let numericAmount = 0
        // 2. Parse Amount (Currency String -> Number)
        let cleanValue = amount.replace('R$', '').replace('US$', '').trim()

        if (currency === "BRL") {
            // BRL Input: "1.000,00" -> Remove dots, replace comma with dot
            cleanValue = cleanValue.replace(/\./g, '').replace(',', '.')
        } else {
            // USD Input: "1,000.00" -> Remove commas, keep dot
            cleanValue = cleanValue.replace(/,/g, '')
        }

        numericAmount = parseFloat(cleanValue)

        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast.error("Por favor, informe um valor válido.")
            return
        }

        // Logic for Custom Bank Name
        const finalVia = via === "outro" ? (customVia || "Outro") : via

        const transactionData = {
            type,
            amount: numericAmount,
            name: name,
            description: description,
            date: date || new Date(),
            category_id: categoryId, // Changed from 'category' (name) to 'category_id'
            // The action expects 'category_id' BUT verify 'createTransaction' signature.
            // Input type expected by action likely had 'category' (string) before or mapped it?
            // I need to check `transaction-actions.ts`.
            // Wait, I haven't updated `transaction-actions.ts` to accept `category_id`.
            // It was resolving category by name. I need to update it to use ID directly.
            via: finalVia,
            currency,
            isRecurring: false
        }

        startTransition(async () => {
            try {
                let savedData: any = { ...transactionData };

                if (initialData?.id) {
                    await updateTransaction(initialData.id, transactionData as any)
                    toast.success("Transação atualizada com sucesso!")
                    savedData.id = initialData.id;
                } else {
                    const createdTx = await createTransaction(transactionData as any)
                    toast.success("Transação salva com sucesso!")
                    savedData.id = createdTx.id; // Use real ID from server
                }

                // Resolve correct icon string name
                let finalIconName = "MoreHorizontal"
                if ((category as any).iconName) {
                    finalIconName = (category as any).iconName
                } else if (typeof category.icon === 'string') {
                    finalIconName = category.icon
                } else {
                    // Reverse lookup for static categories
                    const foundEntry = Object.entries(AVAILABLE_ICONS).find(([_, IconComp]) => IconComp === category.icon)
                    if (foundEntry) finalIconName = foundEntry[0]
                }

                // Call onSave to update Parent UI (Optimistic/Local update)
                if (onSave) {
                    onSave({
                        ...savedData,
                        category: categoryName, // UI Name
                        categoryIcon: finalIconName, // UI Icon String
                        categoryColor: category.color, // UI Color
                        categoryId: categoryId,
                    })
                }

                setOpen(false)
                resetForm()
                router.refresh()
            } catch (error) {
                console.error(error)
                toast.error(error instanceof Error ? error.message : "Erro ao salvar transação")
            }
        })
    }

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value

        // Remove non-digits
        value = value.replace(/\D/g, "")

        if (value === "") {
            setAmount("")
            return
        }

        const numericValue = parseFloat(value) / 100

        let result = ""
        if (currency === "BRL") {
            result = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(numericValue)
            setAmount(`R$ ${result}`)
        } else {
            result = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 }).format(numericValue)
            setAmount(`US$ ${result}`)
        }
    }

    // Update input display when currency changes
    const toggleCurrency = (newCurrency: "BRL" | "USD") => {
        setCurrency(newCurrency)
        setAmount("") // Reset amount to avoid format confusion
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            setOpen(v)
            if (!v) resetForm()
        }}>
            <DialogTrigger asChild>
                {children || <Button>Criar transação</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white dark:bg-zinc-900 border-none shadow-2xl overflow-visible">
                <DialogHeader className="pb-4 border-b border-gray-100 dark:border-zinc-800">
                    <DialogTitle className="text-xl font-bold dark:text-white">
                        {initialData ? "Editar Transação" : "Nova Transação"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    {/* 1. Type Toggle */}
                    <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-zinc-800 rounded-lg">
                        <button
                            onClick={() => setType("expense")}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all focus:outline-none",
                                type === "expense"
                                    ? "bg-white dark:bg-zinc-700 text-red-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <TrendingDown className="h-4 w-4" /> Despesa
                        </button>
                        <button
                            onClick={() => setType("income")}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all focus:outline-none",
                                type === "income"
                                    ? "bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <TrendingUp className="h-4 w-4" /> Receita
                        </button>
                    </div>

                    {/* 2. VALUE INPUT + CURRENCY TOGGLE */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="font-semibold">Valor</Label>

                            {/* Currency Toggle */}
                            <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-md p-1 items-center">
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
                            value={amount}
                            onChange={handleAmountChange}
                            className={cn(
                                "bg-white dark:bg-zinc-900 h-12 text-lg border-gray-200 dark:border-zinc-800 focus-visible:ring-2",
                                type === "expense" ? "focus-visible:ring-red-500" : "focus-visible:ring-emerald-500"
                            )}
                        />
                    </div>

                    {/* 3. Form Fields */}
                    <div className="grid gap-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                placeholder="Ex: Almoço, Salário..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800"
                            />
                        </div>

                        {/* Category & Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 flex flex-col">
                                <Label>Categoria</Label>
                                <CategorySelectionDialog
                                    currentCategory={categoryName}
                                    onSelect={(cat) => {
                                        setCategoryId(cat.id)
                                        setCategoryName(cat.name)
                                        setSelectedCategoryData(cat)
                                    }}
                                >
                                    <button
                                        className="flex items-center gap-2 pl-3 pr-4 py-2 text-sm border border-gray-200 dark:border-zinc-800 rounded-md bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 transition-colors w-full h-10"
                                    >
                                        <div className={cn(
                                            "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                                            category.color.replace('text-', 'bg-').replace('500', '100').replace('600', '100')
                                        )}>
                                            <CategoryIcon className={cn("h-3 w-3", category.color)} />
                                        </div>
                                        <span className="truncate flex-1 text-left">{categoryName}</span>
                                        <ChevronDown className="h-4 w-4 text-gray-400 opacity-50" />
                                    </button>
                                </CategorySelectionDialog>
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
                                            {date ? format(date, "d 'de' MMM, yyyy", { locale: ptBR }) : <span>Selecione</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <div className="p-2">
                                            <Calendar
                                                mode="single"
                                                selected={date}
                                                onSelect={setDate}
                                                initialFocus
                                                variant={type === "expense" ? "expense" : "income"}
                                                className="p-3 bg-white dark:bg-zinc-900 rounded-md"
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* UPDATE: Account / Card Selection */}
                        <div className="space-y-2">
                            <Label>Via</Label>
                            <Select value={via} onValueChange={setVia}>
                                <SelectTrigger className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800">
                                    <SelectValue placeholder="Selecione a conta" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.name} className="capitalize">{acc.name}</SelectItem>
                                    ))}
                                    <SelectItem value="outro">Outra...</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* CONDITIONAL INPUT FOR 'OUTRO' */}
                            {via === "outro" && (
                                <Input
                                    placeholder="Digite o nome do banco/cartão..."
                                    className="mt-2 bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800 animate-in fade-in slide-in-from-top-1"
                                    value={customVia}
                                    onChange={(e) => setCustomVia(e.target.value)}
                                />
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Descrição (Opcional)</Label>
                            <Input
                                placeholder="Pix, TED, Detalhes..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-800"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t border-gray-100 dark:border-zinc-800 pt-4">
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        disabled={isPending}
                        className={cn(
                            "text-white shadow-sm",
                            type === "expense"
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-emerald-600 hover:bg-emerald-700"
                        )}
                    >
                        {isPending ? "Salvando..." : (initialData ? "Salvar Alterações" : (type === "expense" ? "Adicionar Despesa" : "Adicionar Receita"))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
