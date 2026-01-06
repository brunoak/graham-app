"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Bot, Sparkles, ArrowRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ArkadWidgetProps {
    type: 'dashboard' | 'finance' | 'investments'
    contextData?: any
    className?: string
}

export function ArkadWidget({ type, contextData, className }: ArkadWidgetProps) {
    const router = useRouter()
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'insight'>('analyzing')
    const [insight, setInsight] = useState<string>("")
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        let mounted = true
        let timeoutId: NodeJS.Timeout | null = null

        const interval = setInterval(() => {
            if (!mounted) return
            setProgress(prev => {
                if (prev >= 90) { clearInterval(interval); return 90 }
                return prev + Math.random() * 10
            })
        }, 300)

        // Add timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
            if (mounted && status === 'analyzing') {
                console.warn("[ArkadWidget] Timeout - falling back to idle")
                setStatus('idle')
            }
        }, 10000) // 10 second timeout

        generateInsight().then(text => {
            if (!mounted) return
            if (timeoutId) clearTimeout(timeoutId)
            if (text) {
                setInsight(text)
                setProgress(100)
                setTimeout(() => setStatus('insight'), 500)
            } else {
                setStatus('idle')
            }
        }).catch(err => {
            console.error("[ArkadWidget] Error:", err)
            if (mounted) setStatus('idle')
        })

        return () => {
            mounted = false
            clearInterval(interval)
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [type])

    const generateInsight = async () => {
        try {
            const { generateSmartInsight } = await import("@/lib/actions/arkad-actions")
            const response = await generateSmartInsight(type)
            return response || "Ainda não tenho insights. Adicione mais dados!"
        } catch (error) {
            console.error("Widget Error:", error)
            return null
        }
    }

    const handleClick = () => {
        const params = new URLSearchParams()
        if (insight) params.set('initial_prompt', insight)
        router.push(`/dashboard/arkad?${params.toString()}`)
    }

    // Common Header for all states
    const Header = () => (
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">Arkad</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                Mentor Financeiro
            </span>
        </div>
    )

    return (
        <Card className={`bg-white dark:bg-zinc-950 border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${className}`} onClick={handleClick}>
            <CardContent className="p-6 h-full flex flex-col">
                <Header />

                <div className="flex-1 flex flex-col justify-center">
                    {status === 'analyzing' && (
                        <div className="flex flex-col items-center text-center space-y-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Posso ajudar?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                Estou analisando seus dados para gerar um insight personalizado...
                            </p>
                            <div className="w-full max-w-[200px] h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-2">
                                <div className="h-full bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 animate-pulse">Processando dados...</span>
                        </div>
                    )}

                    {status === 'idle' && (
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-full border border-emerald-100 dark:border-emerald-800">
                                <Bot className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">Posso ajudar?</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[200px] leading-relaxed mx-auto">
                                Clique aqui para iniciar uma análise completa.
                            </p>
                        </div>
                    )}

                    {status === 'insight' && (
                        // Inner Green Insight Box
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-6 flex flex-col items-center text-center space-y-3 group-hover:border-emerald-200 transition-colors">
                            <div className="bg-white dark:bg-zinc-900 p-2 rounded-full shadow-sm border border-emerald-100 dark:border-emerald-900/50">
                                <Bot className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium italic">
                                "{insight}"
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500 group-hover:underline flex items-center">
                        {status === 'insight' ? 'Ver detalhes' : 'Abrir Chat'}
                        <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
