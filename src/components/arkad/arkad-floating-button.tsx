"use client"

import { useState, useEffect } from "react"
import { Bot, Sparkles } from "lucide-react"
import { useArkad } from "@/contexts/arkad-context"

export function ArkadFloatingButton() {
    const { openDrawer } = useArkad()
    const [isMounted, setIsMounted] = useState(false)

    // Only render on client to avoid hydration mismatch
    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return null

    return (
        <button
            onClick={() => openDrawer()}
            className="
                fixed bottom-6 right-6 z-50
                w-14 h-14 rounded-full
                bg-gradient-to-br from-emerald-500 to-emerald-600
                hover:from-emerald-400 hover:to-emerald-500
                shadow-lg shadow-emerald-500/30
                hover:shadow-xl hover:shadow-emerald-500/40
                transition-all duration-300
                flex items-center justify-center
                group
                hover:scale-105
                active:scale-95
            "
            aria-label="Abrir Arkad"
        >
            {/* Bot Icon */}
            <Bot className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />

            {/* Sparkle indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-2.5 h-2.5 text-amber-900" />
            </div>

            {/* Hover ring effect */}
            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/50 scale-110 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Pulse ring animation */}
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20" />
        </button>
    )
}
