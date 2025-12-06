"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, DollarSign, Tag, Briefcase, Building2, Ticket } from "lucide-react"

export function TransactionDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState<Date | undefined>(new Date())

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button>Criar transação</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-900 border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold dark:text-white">Nova Transação</DialogTitle>
                    <DialogDescription>
                        Insira os detalhes da sua movimentação abaixo.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {/* Value Input */}
                    <div className="relative">
                        <Label htmlFor="amount" className="sr-only">Valor</Label>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                            <DollarSign className="h-4 w-4" />
                        </div>
                        <Input
                            id="amount"
                            type="number"
                            placeholder="0,00"
                            className="pl-14 text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 bg-transparent placeholder:text-gray-300 dark:placeholder:text-zinc-600"
                            style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }} // Hide spinners
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Foi pago?</span>
                        <Switch id="paid-mode" defaultChecked />
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-2">
                        <Label>Data</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal border-gray-200 dark:border-zinc-800",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none shadow-lg">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-md"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Category Select */}
                    <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select>
                            <SelectTrigger className="border-gray-200 dark:border-zinc-800">
                                <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                                <SelectGroup>
                                    <SelectLabel>Despesas Essenciais</SelectLabel>
                                    <SelectItem value="food">Alimentação</SelectItem>
                                    <SelectItem value="housing">Moradia</SelectItem>
                                    <SelectItem value="transport">Transporte</SelectItem>
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>Estilo de Vida</SelectLabel>
                                    <SelectItem value="leisure">Lazer</SelectItem>
                                    <SelectItem value="shopping">Compras</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Tags & Account Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Tag</Label>
                            <Select>
                                <SelectTrigger className="border-gray-200 dark:border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-emerald-500" />
                                        <SelectValue placeholder="Tag" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                                    <SelectItem value="work">Trabalho</SelectItem>
                                    <SelectItem value="personal">Pessoal</SelectItem>
                                    <SelectItem value="urgent">Urgente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Conta</Label>
                            <Select defaultValue="main">
                                <SelectTrigger className="border-gray-200 dark:border-zinc-800">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-blue-500" />
                                        <SelectValue placeholder="Conta" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                                    <SelectItem value="main">Conta Principal</SelectItem>
                                    <SelectItem value="nubank">Nubank</SelectItem>
                                    <SelectItem value="inter">Inter</SelectItem>
                                    <SelectItem value="wallet">Carteira</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-500">Ignorar transação (não contar nos relatórios)</span>
                        <Switch id="ignore-mode" />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto border-gray-200 dark:border-zinc-800">Cancelar</Button>
                    <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
