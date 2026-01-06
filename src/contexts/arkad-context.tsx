"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

interface ArkadContextType {
    isDrawerOpen: boolean
    currentConversationId: string | null
    openDrawer: (conversationId?: string) => void
    closeDrawer: () => void
    setConversationId: (id: string | null) => void
}

const ArkadContext = createContext<ArkadContextType | undefined>(undefined)

export function useArkad() {
    const context = useContext(ArkadContext)
    if (!context) {
        throw new Error("useArkad must be used within an ArkadProvider")
    }
    return context
}

interface ArkadProviderProps {
    children: ReactNode
}

export function ArkadProvider({ children }: ArkadProviderProps) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

    const openDrawer = useCallback((conversationId?: string) => {
        if (conversationId) {
            setCurrentConversationId(conversationId)
        }
        setIsDrawerOpen(true)
    }, [])

    const closeDrawer = useCallback(() => {
        setIsDrawerOpen(false)
    }, [])

    const setConversationId = useCallback((id: string | null) => {
        setCurrentConversationId(id)
    }, [])

    return (
        <ArkadContext.Provider
            value={{
                isDrawerOpen,
                currentConversationId,
                openDrawer,
                closeDrawer,
                setConversationId,
            }}
        >
            {children}
        </ArkadContext.Provider>
    )
}
