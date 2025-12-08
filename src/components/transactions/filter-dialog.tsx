"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Filter } from "lucide-react"

export function FilterDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-emerald-600">
                    <Filter className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-white dark:bg-zinc-900 border-none">
                <DialogHeader>
                    <DialogTitle className="text-center text-lg font-semibold text-gray-900 dark:text-white">Filtros</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Periodo e Selecione */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Período de referência</Label>
                            <Select defaultValue="dez2025">
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dez2025">Dezembro/2025</SelectItem>
                                    <SelectItem value="nov2025">Novembro/2025</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>&nbsp;</Label> {/* Spacer label to align input if needed or just empty for second select */}
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o período" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">Personalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Descricao e Estabelecimento */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Descrição:</Label>
                            <Input placeholder="Digite a descrição" />
                        </div>
                        <div className="space-y-2">
                            <Label>Estabelecimento:</Label>
                            <Input placeholder="Digite o estabelecimento" />
                        </div>
                    </div>

                    {/* Meio de pagamento */}
                    <div className="space-y-2">
                        <Label>Meio de pagamento</Label>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o meio de pagamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="credit">Cartão de Crédito</SelectItem>
                                <SelectItem value="debit">Débito</SelectItem>
                                <SelectItem value="pix">Pix</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Intervalo de valor */}
                    <div className="space-y-2">
                        <Label>Intervalo do valor</Label>
                        <div className="flex items-center gap-4">
                            <Input placeholder="Mínimo" className="w-full" />
                            <Input placeholder="Máximo" className="w-full" />
                        </div>
                        <div className="pt-2 px-1">
                            <Slider defaultValue={[0, 10000]} max={10000} step={10} className="w-full" />
                        </div>
                    </div>

                    {/* Categoria e Classificação */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="food">Alimentação</SelectItem>
                                    <SelectItem value="transport">Transporte</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Classificação</Label>
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="essential">Essencial</SelectItem>
                                    <SelectItem value="lifestyle">Estilo de Vida</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex flex-row justify-between sm:justify-between items-center w-full">
                    <Button variant="ghost" className="text-gray-500 hover:text-gray-700">Limpar filtro</Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white w-32">Filtrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
