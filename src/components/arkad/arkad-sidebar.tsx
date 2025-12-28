"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, MessageSquare, Settings, PlusCircle, Zap, MoreVertical, Pencil, Trash2, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteChat, renameChat } from "@/lib/actions/arkad-actions"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ArkadSidebarProps {
    initialChats?: any[]
    usageStats?: { count: number, limit: number }
    isExpanded?: boolean
    onToggle?: () => void
}

export function ArkadSidebar({ initialChats = [], usageStats, isExpanded = true, onToggle }: ArkadSidebarProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const currentId = searchParams.get('id')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    const filteredChats = initialChats.filter(chat =>
        (chat.question || "Nova Conversa").toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDelete = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation() // Prevent navigation
        const result = await deleteChat(chatId)
        if (result.success) {
            toast.success("Conversa excluída")
            router.refresh()
            if (currentId === chatId) {
                router.push('/dashboard/arkad')
            }
        } else {
            toast.error("Erro ao excluir conversa")
        }
    }

    const startRename = (e: React.MouseEvent, chat: any) => {
        e.stopPropagation()
        setEditingId(chat.id)
        setEditValue(chat.question)
    }

    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingId) return

        const result = await renameChat(editingId, editValue)
        if (result.success) {
            toast.success("Conversa renomeada")
            setEditingId(null)
            router.refresh()
        } else {
            toast.error("Erro ao renomear conversa")
        }
    }

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-zinc-950 relative transition-all duration-300 ${isExpanded ? 'px-0' : 'items-center'}`}>
            {/* Header */}
            <div className={`p-4 pb-2 flex items-center ${isExpanded ? 'justify-start gap-3' : 'justify-center flex-col gap-4'}`}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-emerald-500"
                    onClick={onToggle}
                    title={isExpanded ? "Recolher menu" : "Expandir menu"}
                >
                    <Menu className="w-5 h-5" />
                </Button>


            </div>

            <div className={`mb-6 ${isExpanded ? 'px-4' : 'px-2 w-full flex flex-col items-center'}`}>
                {isExpanded && <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-1">Menu</h2>}
                <nav className="space-y-1 w-full">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href="/dashboard/arkad"
                                    className={`flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors ${isExpanded ? 'justify-start' : 'justify-center'}`}
                                >
                                    <PlusCircle className="w-5 h-5" />
                                    {isExpanded && <span className="font-medium text-sm">Novo Chat</span>}
                                </Link>
                            </TooltipTrigger>
                            {!isExpanded && <TooltipContent side="right">Novo Chat</TooltipContent>}
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    className={`flex items-center gap-3 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors ${isExpanded ? 'justify-start' : 'justify-center'}`}
                                >
                                    <Settings className="w-5 h-5" />
                                    {isExpanded && <span className="text-sm font-medium">Configuração e ajuda</span>}
                                </div>
                            </TooltipTrigger>
                            {!isExpanded && <TooltipContent side="right">Configuração e ajuda</TooltipContent>}
                        </Tooltip>
                    </TooltipProvider>
                </nav>
            </div>

            {/* Chats List (Hidden when collapsed) */}
            {isExpanded ? (
                <div className="flex-1 flex flex-col min-h-0 border-t border-gray-100 dark:border-zinc-800/50 pt-4">
                    <div className="px-4 flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Histórico Recente</h2>
                    </div>

                    <div className="px-4 mb-3">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Buscar conversa..."
                                className="bg-gray-100 dark:bg-zinc-900 border-none h-9 pl-9 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="px-2 space-y-1">
                            {filteredChats.length === 0 && (
                                <div className="text-center p-4 text-xs text-gray-400">
                                    {searchQuery ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa recente.'}
                                </div>
                            )}

                            {filteredChats.map((chat) => (
                                <div
                                    key={chat.id}
                                    onClick={() => router.push(`/dashboard/arkad?id=${chat.id}`)}
                                    className={`group relative flex items-center h-9 px-3 rounded-lg cursor-pointer transition-colors max-w-[238px]
                                        ${currentId === chat.id
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'}
                                    `}
                                    title={chat.question}
                                >
                                    {editingId === chat.id ? (
                                        <form onSubmit={handleRename} onClick={(e) => e.stopPropagation()} className="flex-1 min-w-0">
                                            <Input
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onBlur={() => setEditingId(null)}
                                                autoFocus
                                                className="h-7 text-xs px-2 bg-white dark:bg-zinc-900 border-emerald-500 w-full"
                                            />
                                        </form>
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-0">
                                                <div className="truncate text-sm font-medium text-left">
                                                    {chat.question || "Nova Conversa"}
                                                </div>
                                            </div>

                                            {/* Menu Action - Overlay with Gradient Background */}
                                            <div className={`
                                                absolute right-1 top-1/2 -translate-y-1/2 
                                                pl-6 pr-1 py-1 h-full flex items-center
                                                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                                z-10
                                                bg-gradient-to-l 
                                                ${currentId === chat.id
                                                    ? 'from-emerald-50 via-emerald-50 dark:from-zinc-900 dark:via-zinc-900'
                                                    : 'from-gray-100 via-gray-100 dark:from-zinc-800 dark:via-zinc-800'} 
                                                to-transparent
                                            `}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className={`h-6 w-6 rounded-full ${currentId === chat.id ? 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50' : 'hover:bg-gray-200 dark:hover:bg-zinc-700'}`}
                                                        >
                                                            <MoreVertical className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem onClick={(e) => startRename(e, chat)}>
                                                            <Pencil className="mr-2 h-3.5 w-3.5 text-gray-500" />
                                                            <span>Renomear</span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={(e) => handleDelete(e, chat.id)} className="text-red-500 focus:text-red-500">
                                                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                            <span>Excluir</span>
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div >
            ) : (
                <div className="flex-1 border-t border-gray-100 dark:border-zinc-800/50 pt-4 flex flex-col items-center gap-4">
                    {/* Collapsed State: Maybe Recent History Icons? For now keep clean as per 'Gemini' look which usually clears the text list */}
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                    <Search className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Buscar</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )
            }

            {/* Usage Stats Footer */}
            {
                usageStats && (
                    <div className={`border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/30 ${isExpanded ? 'p-4' : 'p-2 flex justify-center'}`}>
                        {isExpanded ? (
                            <>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="cursor-help">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Zap className="w-3 h-3 text-amber-500" />
                                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Uso Mensal</span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">{usageStats.count} / {usageStats.limit}</span>
                                                </div>
                                                <Progress value={(usageStats.count / usageStats.limit) * 100} className="h-1.5 bg-gray-200 dark:bg-zinc-800" indicatorClassName="bg-amber-500" />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Limite de mensagens de IA por mês.</p>
                                            <p>Renova dia {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('pt-BR')}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <div className="mt-1 text-[10px] text-gray-400 text-center">Renova em {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('pt-BR')}</div>
                            </>
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="relative w-full flex justify-center">
                                            <Zap className="w-4 h-4 text-amber-500" />
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        <p>Uso: {usageStats.count}/{usageStats.limit}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )
            }
        </div >
    )
}
