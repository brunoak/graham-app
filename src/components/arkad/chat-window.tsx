"use client"

import { Search, ThumbsUp, Copy, Image as ImageIcon, Mic, Send, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRef, useEffect, useState } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useRouter, useSearchParams } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
}

interface ChatWindowProps {
    initialMessages?: Message[]
    isSidebarOpen?: boolean
    onToggleSidebar?: () => void
    onMobileToggle?: () => void
    userName?: string
}

interface InputFormProps {
    input: string
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleSubmit: (e: React.FormEvent) => void
    isLoading: boolean
    centered?: boolean
}

function InputForm({ input, handleInputChange, handleSubmit, isLoading, centered = false }: InputFormProps) {
    return (
        <form
            onSubmit={handleSubmit}
            className={`
                ${centered ? 'w-full max-w-3xl mt-8' : 'p-4 bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800 flex-shrink-0'}
            `}
        >
            <div className={`
                relative bg-gray-100 dark:bg-zinc-900 rounded-xl flex items-center p-2 pr-3 gap-2 border border-transparent focus-within:border-emerald-200 dark:focus-within:border-emerald-800 transition-colors
                ${centered ? 'shadow-lg py-3' : 'max-w-4xl mx-auto'}
            `}>
                <Input
                    value={input}
                    onChange={handleInputChange}
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 shadow-none h-12 text-sm placeholder:text-gray-400"
                    placeholder="Pergunte ao Arkad sobre sua carteira..."
                    autoFocus={centered}
                />

                <div className="flex items-center gap-1 border-r border-gray-300 dark:border-zinc-700 pr-2 mr-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                    <ImageIcon className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Em breve</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                    <Mic className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Em breve</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <Button type="submit" size="icon" disabled={!input || isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9 w-9 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                    <Send className="w-4 h-4 ml-0.5" />
                </Button>
            </div>
            {!centered && (
                <div className="text-center mt-2">
                    <span className="text-[10px] text-gray-400">Arkad (Gemini 1.5 Flash) pode cometer erros. Verifique informações importantes.</span>
                </div>
            )}
        </form>
    )
}

export function ChatWindow({ initialMessages = [], isSidebarOpen = true, onToggleSidebar, onMobileToggle, userName = 'Investidor' }: ChatWindowProps) {
    const router = useRouter()
    const [messages, setMessages] = useState<Message[]>(initialMessages)
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const searchParams = useSearchParams()
    const currentId = searchParams.get('id')
    const initialPrompt = searchParams.get('initial_prompt')

    const [conversationId, setConversationId] = useState<string | null>(currentId)

    // Update conversationId when URL changes
    useEffect(() => {
        if (currentId) {
            setConversationId(currentId)
        } else {
            setConversationId(null)
        }
    }, [currentId])

    // Pre-fill input from widget insight
    useEffect(() => {
        if (initialPrompt && !currentId) { // Only if starting a new chat
            setInput(initialPrompt)
        }
    }, [initialPrompt, currentId])

    const prevIdRef = useRef(currentId)
    const justCreatedIdRef = useRef<string | null>(null)

    // Sync state if initialMessages changes, but be smart about it to avoid wiping state
    useEffect(() => {
        if (isLoading) return

        const hasIdChanged = prevIdRef.current !== currentId
        prevIdRef.current = currentId

        if (currentId) {
            // Check if this is the ID we just created locally
            if (currentId === justCreatedIdRef.current) {
                // Do NOT wipe state. We are in the same chat we just started.
                // Reset ref so next navigation works normally
                justCreatedIdRef.current = null
                return
            }

            if (hasIdChanged) {
                setMessages(initialMessages || [])
            } else if (initialMessages && initialMessages.length > messages.length) {
                // Keep local state if server has nothing or distinct set
                // Only merge if it looks like a valid update (same ID, more messages)
                setMessages(initialMessages)
            } else if (initialMessages && initialMessages.length > 0 && messages.length === 0) {
                // Initial load
                setMessages(initialMessages)
            }
        } else {
            // New chat
            if (!conversationId) {
                setMessages([])
            }
        }
    }, [initialMessages, isLoading, currentId, conversationId])

    const filteredMessages = messages.filter(m =>
        (m.content || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        // Set up conversation ID if new
        let currentConversationId = conversationId
        if (!currentConversationId) {
            currentConversationId = crypto.randomUUID()
            setConversationId(currentConversationId)
            // Mark this ID as locally created to prevent useEffect from wiping it
            justCreatedIdRef.current = currentConversationId
            // Update URL securely without refresh
            window.history.pushState({}, '', `/dashboard/arkad?id=${currentConversationId}`)
        }

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setSearchQuery('')
        setIsLoading(true)

        // Determine thread title (first user message)
        const threadTitle = messages.length > 0
            ? messages.find(m => m.role === 'user')?.content || input
            : input

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    conversationId: currentConversationId,
                    threadTitle: threadTitle
                })
            })

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Muitas requisições. O limite da IA foi atingido, aguarde alguns instantes.')
                }
                throw new Error('Falha ao conectar com Arkad.')
            }

            if (!response.body) return

            const reader = response.body.getReader(); const decoder = new TextDecoder()
            let assistantMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '' }
            setMessages(prev => [...prev, assistantMessage])

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                assistantMessage.content += chunk
                setMessages(prev => { const newMessages = [...prev]; newMessages[newMessages.length - 1] = { ...assistantMessage }; return newMessages })
            }

            // CHECK: If stream finished but content is empty, it means the server failed silently
            if (!assistantMessage.content || assistantMessage.content.trim().length === 0) {
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        ...assistantMessage,
                        content: "⚠️ **Resposta Vazia**: O Arkad processou os dados, mas não gerou o texto explicativo. Tente novamente."
                    };
                    return newMessages
                })
            }

            // Refresh router in background to update sidebar
            router.refresh()

        } catch (error) {
            console.error(error)
            // Add Error Message to Chat if not already handled
            setMessages(prev => {
                // Remove the empty placeholder if it exists and replace with error
                const lastMsg = prev[prev.length - 1]
                if (lastMsg.role === 'assistant' && !lastMsg.content) {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                        ...lastMsg,
                        content: `⚠️ **Erro no Sistema**: ${error instanceof Error ? error.message : "Falha na comunicação."}`
                    }
                    return newMessages
                }
                // Otherwise append new error
                return [...prev, {
                    id: (Date.now() + 2).toString(),
                    role: 'assistant',
                    content: `⚠️ **Erro**: ${error instanceof Error ? error.message : "Desconhecido"}`
                }]
            })
        } finally { setIsLoading(false) }
    }

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }
    useEffect(() => { scrollToBottom() }, [messages, filteredMessages])

    const isEmptyState = filteredMessages.length === 0 && !searchQuery

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="h-16 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950 flex-shrink-0">
                <div className="flex items-center gap-3">
                    {/* Mobile Menu Button */}
                    <Button variant="ghost" size="icon" onClick={onMobileToggle} className="md:hidden -ml-2 text-gray-400 hover:text-gray-600">
                        <Menu className="w-5 h-5" />
                    </Button>


                    <h1 className="text-xl font-bold text-emerald-500 tracking-wide select-none">ARKAD</h1>
                </div>
                <div className="relative w-64 hidden sm:block">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Pesquisar..."
                        className="bg-gray-100 dark:bg-zinc-900 border-none pl-9 h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Messages Area OR Welcome Screen */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
                {isEmptyState ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 -mt-20">
                        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent mb-4 tracking-tight">
                            Olá, {userName}
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-400 font-medium mb-12">
                            Como posso ajudar com seus investimentos hoje?
                        </p>

                        {/* Centered Input Form */}
                        <InputForm
                            centered
                            input={input}
                            handleInputChange={handleInputChange}
                            handleSubmit={handleSubmit}
                            isLoading={isLoading}
                        />

                    </div>
                ) : (
                    <>
                        {/* Date Divider */}
                        <div className="flex justify-center">
                            <span className="text-xs font-medium text-gray-400 bg-gray-50 dark:bg-zinc-900 px-3 py-1 rounded-full">
                                Hoje
                            </span>
                        </div>

                        {filteredMessages.length === 0 && searchQuery && (
                            <div className="text-center text-sm text-gray-400 mt-10">
                                Nenhuma mensagem encontrada para "{searchQuery}"
                            </div>
                        )}

                        {filteredMessages.map(m => (
                            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} gap-1`}>
                                <div className={`
                                    p-4 rounded-2xl max-w-[85%] md:max-w-[75%] shadow-sm text-sm border 
                                    ${m.role === 'user'
                                        ? 'bg-emerald-100/80 dark:bg-emerald-900/40 rounded-tr-none border-emerald-100 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-100'
                                        : 'bg-white dark:bg-zinc-900 rounded-tl-none border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-gray-300'
                                    }
                                `}>
                                    {m.role === 'assistant' && (
                                        <div className="font-bold text-emerald-500 mb-2 text-xs tracking-wide uppercase">ARKAD</div>
                                    )}

                                    <div className={`leading-relaxed ${m.role === 'assistant' ? 'text-gray-700 dark:text-gray-300' : 'whitespace-pre-wrap'}`}>
                                        {m.role === 'assistant' ? (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    strong: ({ node, ...props }) => <span className="font-bold text-emerald-600 dark:text-emerald-400" {...props} />,
                                                    em: ({ node, ...props }) => <span className="italic text-gray-600 dark:text-gray-400" {...props} />,
                                                    p: ({ node, ...props }) => <p className="mb-5 last:mb-0 leading-7" {...props} />,
                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-5 last:mb-0 space-y-2" {...props} />,
                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-5 last:mb-0 space-y-2" {...props} />,
                                                    li: ({ node, ...props }) => <li className="mb-1 pl-1" {...props} />,
                                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4 mt-6 text-emerald-700 dark:text-emerald-400" {...props} />,
                                                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-3 mt-5 text-gray-800 dark:text-gray-200" {...props} />,
                                                    h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-4" {...props} />,
                                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-emerald-500 pl-4 py-2 my-4 italic text-gray-600 bg-gray-50 dark:bg-zinc-900/50 rounded-r" {...props} />
                                                }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                        ) : (
                                            m.content
                                        )}
                                    </div>

                                    {/* Actions Footer */}
                                    {m.role === 'assistant' && !isLoading && (
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800/50 opacity-70 hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-emerald-500">
                                                <ThumbsUp className="w-3 h-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {isLoading && (
                    <div className="flex flex-col items-start gap-1 animate-pulse">
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-zinc-800">
                            <span className="text-xs text-gray-400">Arkad está pensando...</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Only show at bottom if NOT empty state */}
            {
                !isEmptyState && (
                    <InputForm
                        input={input}
                        handleInputChange={handleInputChange}
                        handleSubmit={handleSubmit}
                        isLoading={isLoading}
                    />
                )
            }
        </div>
    )
}
