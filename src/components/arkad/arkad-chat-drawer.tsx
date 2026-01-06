"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bot, Send, Maximize2, Loader2, Plus, History, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useArkad } from "@/contexts/arkad-context"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Safe UUID generator with fallback for environments without crypto.randomUUID
function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    // Fallback: simple random ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

interface Message {
    id: string
    role: "user" | "assistant"
    content: string
}

export function ArkadChatDrawer() {
    const router = useRouter()
    const { isDrawerOpen, closeDrawer, currentConversationId, setConversationId } = useArkad()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [localConversationId, setLocalConversationId] = useState<string | null>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [chatHistory, setChatHistory] = useState<{ id: string, title: string, date: string }[]>([])
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Only render on client to avoid hydration mismatch
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Initialize new conversation when drawer opens, reset when closed
    useEffect(() => {
        if (isDrawerOpen) {
            if (currentConversationId) {
                // Load existing conversation
                setLocalConversationId(currentConversationId)
                loadConversation(currentConversationId)
            } else {
                // Start fresh - create new conversation ID
                const newId = generateId()
                setLocalConversationId(newId)
                setConversationId(newId)
                setMessages([])
            }
            loadChatHistory()
            setTimeout(() => inputRef.current?.focus(), 100)
        } else {
            // Reset state when drawer closes
            setMessages([])
            setLocalConversationId(null)
            setConversationId(null)
            setShowHistory(false)
        }
    }, [isDrawerOpen])

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Load chat history from API
    const loadChatHistory = async () => {
        try {
            const response = await fetch("/api/arkad/conversations")
            if (response.ok) {
                const data = await response.json()
                setChatHistory(data.conversations || [])
            }
        } catch (error) {
            console.error("Failed to load chat history:", error)
        }
    }

    // Start a new chat
    const handleNewChat = () => {
        const newId = generateId()
        setLocalConversationId(newId)
        setConversationId(newId)
        setMessages([])
        setShowHistory(false)
    }

    // Select a conversation from history
    const handleSelectConversation = (id: string) => {
        setLocalConversationId(id)
        setConversationId(id)
        loadConversation(id)
        setShowHistory(false)
    }

    const loadConversation = async (id: string) => {
        try {
            const response = await fetch(`/api/arkad/conversations/${id}`)
            if (response.ok) {
                const data = await response.json()
                setMessages(data.messages || [])
            }
        } catch (error) {
            console.error("Failed to load conversation:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: generateId(),
            role: "user",
            content: input.trim(),
        }

        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                    conversationId: localConversationId,
                }),
            })

            if (!response.ok) throw new Error("API error")
            if (!response.body) throw new Error("No response body")

            // We already have a conversation ID, no need to update from header

            // Stream response (plain text, not AI SDK format)
            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            const assistantMessage: Message = {
                id: generateId(),
                role: "assistant",
                content: "",
            }
            setMessages(prev => [...prev, assistantMessage])

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                assistantMessage.content += chunk
                setMessages(prev => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = { ...assistantMessage }
                    return newMessages
                })
            }

            // Check for empty response
            if (!assistantMessage.content.trim()) {
                setMessages(prev => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1] = {
                        ...assistantMessage,
                        content: "⚠️ Resposta vazia. Tente novamente."
                    }
                    return newMessages
                })
            }
        } catch (error) {
            console.error("Chat error:", error)
            setMessages(prev => [
                ...prev,
                {
                    id: generateId(),
                    role: "assistant",
                    content: "Desculpe, ocorreu um erro. Tente novamente.",
                },
            ])
        } finally {
            setIsLoading(false)
        }
    }

    const handleExpand = () => {
        closeDrawer()
        if (localConversationId) {
            router.push(`/dashboard/arkad?id=${localConversationId}`)
        } else {
            router.push("/dashboard/arkad")
        }
    }

    if (!isMounted) return null

    return (
        <Sheet open={isDrawerOpen} onOpenChange={(open) => !open && closeDrawer()}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 flex flex-col bg-white dark:bg-zinc-950"
            >
                {/* Header */}
                <SheetHeader className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex-shrink-0">
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <SheetTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Arkad
                            </SheetTitle>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleNewChat}
                                className="h-8 w-8"
                                title="Novo Chat"
                            >
                                <Plus className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHistory(!showHistory)}
                                className="h-8 w-8"
                                title="Histórico"
                            >
                                <History className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleExpand}
                                className="h-8 w-8"
                                title="Expandir para tela cheia"
                            >
                                <Maximize2 className="h-4 w-4 text-gray-500" />
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                {/* History Panel or Messages */}
                {showHistory ? (
                    <div className="flex-1 overflow-y-auto p-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-3">Conversas anteriores</h3>
                        {chatHistory.length === 0 ? (
                            <div className="text-center text-gray-400 text-sm py-8">
                                Nenhuma conversa anterior
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {chatHistory.map((chat) => (
                                    <button
                                        key={chat.id}
                                        onClick={() => handleSelectConversation(chat.id)}
                                        className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <MessageSquare className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                    {chat.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {chat.date}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                                <Bot className="w-12 h-12 mb-4 text-emerald-500/50" />
                                <p className="text-sm">Como posso ajudar com suas finanças hoje?</p>
                            </div>
                        )}

                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${message.role === "user"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                                        }`}
                                >
                                    {message.role === "assistant" ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                                    li: ({ children }) => <li className="mb-1">{children}</li>,
                                                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                                }}
                                            >
                                                {message.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm">{message.content}</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* Input - only show when not viewing history */}
                {!showHistory && (
                    <div className="flex-shrink-0 p-4 border-t border-gray-100 dark:border-zinc-800">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                disabled={isLoading}
                                className="flex-1 bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700"
                            />
                            <Button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
