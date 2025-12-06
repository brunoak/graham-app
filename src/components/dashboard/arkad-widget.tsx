"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bot, Sparkles } from "lucide-react"

import Link from "next/link"

export function ArkadWidget() {
    return (
        <Link href="/dashboard/arkad" className="contents">
            <Card className="col-span-12 md:col-span-4 bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none flex flex-col h-full min-h-[400px] cursor-pointer hover:shadow-md transition-shadow group">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        Arkad <Sparkles className="h-3 w-3 text-amber-500" />
                    </CardTitle>
                    <CardDescription className="text-xs text-emerald-600 font-medium">Seu mentor financeiro</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 dark:bg-zinc-800/30 m-4 rounded-lg mt-0 border border-dashed border-gray-200 dark:border-zinc-800 group-hover:bg-emerald-50/30 dark:group-hover:bg-emerald-900/10 transition-colors">
                    <div className="h-16 w-16 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <Bot className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Posso ajudar?</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                        Estou analisando suas finanças. Em breve trarei insights personalizados para você economizar mais na conta de luz este mês.
                    </p>
                    <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-2/3 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">Processando dados...</p>
                </CardContent>
            </Card>
        </Link>
    )
}
