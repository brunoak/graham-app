"use client"

import { useState, useEffect } from "react"
import { ArkadSidebar } from "@/components/arkad/arkad-sidebar"
import { ChatWindow } from "@/components/arkad/chat-window"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useSearchParams } from "next/navigation"

interface ArkadDashboardProps {
    initialChats: any[]
    usageStats: any
    initialMessages: any[]
    userName: string
}

export function ArkadDashboard({ initialChats, usageStats, initialMessages, userName }: ArkadDashboardProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const searchParams = useSearchParams()

    // Close mobile sidebar when specific chat is selected
    useEffect(() => {
        setIsMobileOpen(false)
    }, [searchParams])

    return (
        <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden">
            {/* Desktop Sidebar */}
            <div
                className={`
                    hidden md:flex 
                    ${isSidebarOpen ? 'w-64' : 'w-[70px]'} 
                    transition-all duration-300 ease-in-out flex-shrink-0 
                    border-r border-gray-100 dark:border-zinc-800
                    overflow-hidden
                `}
            >
                <div className={`${isSidebarOpen ? 'w-64' : 'w-[70px]'} h-full transition-all duration-300`}>
                    <ArkadSidebar
                        initialChats={initialChats}
                        usageStats={usageStats}
                        isExpanded={isSidebarOpen}
                        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    />
                </div>
            </div>

            {/* Mobile Sidebar (Sheet) */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetContent side="left" className="p-0 w-[80%] max-w-[300px]">
                    <SheetTitle className="hidden">Menu de Navegação</SheetTitle>
                    <ArkadSidebar
                        initialChats={initialChats}
                        usageStats={usageStats}
                        isExpanded={true}
                        onToggle={() => setIsMobileOpen(false)}
                    />
                </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0">
                <ChatWindow
                    initialMessages={initialMessages}
                    isSidebarOpen={isSidebarOpen}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    onMobileToggle={() => setIsMobileOpen(true)}
                    userName={userName}
                />
            </div>
        </div>
    )
}
