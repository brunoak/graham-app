"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const transactions = [
    { id: 1, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "20 Abr, 25 10:31:23 am", status: "Sucesso" },
    { id: 2, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "18 Abr, 25 08:22:09 pm", status: "Sucesso" },
    { id: 3, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "16 Abr, 25 05:09:58 pm", status: "Sucesso" },
    { id: 4, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "16 Abr, 25 10:21:25 am", status: "Em espera" },
    { id: 5, name: "Lorem Ipsum", description: "Lorem Ipsum", value: 0.00, date: "12 Abr, 25 06:22:09 pm", status: "Falhou" },
]

export function TransactionsTable() {
    return (
        <div className="col-span-12 md:col-span-9 md:order-1">
            {/* Desktop Table View */}
            <Card className="hidden md:block bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">Transações</CardTitle>
                    <Button variant="outline" size="sm" className="h-8 border-gray-200 dark:border-zinc-800 text-xs gap-1">
                        All <ChevronDown className="h-3 w-3" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Nome</th>
                                    <th className="px-4 py-3 font-medium">Descrição</th>
                                    <th className="px-4 py-3 font-medium">Valor</th>
                                    <th className="px-4 py-3 font-medium">Data/hora</th>
                                    <th className="px-4 py-3 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t) => (
                                    <tr key={t.id} className="border-b border-gray-50 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{t.name}</td>
                                        <td className="px-4 py-4 text-gray-500 dark:text-gray-400">{t.description}</td>
                                        <td className="px-4 py-4 font-medium text-emerald-600 dark:text-emerald-400">
                                            R${t.value.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-xs">{t.date}</td>
                                        <td className="px-4 py-4 text-right">
                                            <Badge
                                                className={`
                                                    font-normal text-[10px] px-2 py-0.5 rounded-full shadow-none
                                                    ${t.status === "Sucesso" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400" : ""}
                                                    ${t.status === "Em espera" ? "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400" : ""}
                                                    ${t.status === "Falhou" ? "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-400" : ""}
                                                `}
                                            >
                                                {t.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex items-center justify-between pt-4 text-xs text-gray-500">
                        <span>Mostrando 5 de 45 Classificações</span>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6 p-0 border-gray-200 dark:border-zinc-800"><ChevronLeft className="h-3 w-3" /></Button>
                            <Button size="icon" className="h-6 w-6 p-0 bg-emerald-600 hover:bg-emerald-700 text-white border-none">1</Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-gray-500">2</Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-gray-500">3</Button>
                            <Button variant="outline" size="icon" className="h-6 w-6 p-0 border-gray-200 dark:border-zinc-800"><ChevronRight className="h-3 w-3" /></Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Transações</h3>
                {transactions.map((t) => (
                    <Card key={t.id} className="bg-white dark:bg-zinc-900 border-none shadow-sm p-4">
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Nome: <span className="text-gray-700 dark:text-gray-300">{t.name}</span></p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Descrição: <span className="text-gray-700 dark:text-gray-300">{t.description}</span></p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Valor: <span className="text-gray-700 dark:text-gray-300">R${t.value.toFixed(2)}</span></p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Data/hora: <span className="text-gray-700 dark:text-gray-300">{t.date}</span></p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Status:
                                    <span className={cn("ml-1 font-medium",
                                        t.status === "Sucesso" && "text-emerald-600",
                                        t.status === "Falhou" && "text-red-500",
                                        t.status === "Em espera" && "text-amber-500"
                                    )}>
                                        {t.status}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}

                <div className="flex justify-center pt-4">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-8">
                        Ver mais
                    </Button>
                </div>
            </div>
        </div>
    )
}
