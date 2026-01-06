"use client"

import { ArkadProvider } from "@/contexts/arkad-context"
import { ArkadFloatingButton } from "@/components/arkad/arkad-floating-button"
import { ArkadChatDrawer } from "@/components/arkad/arkad-chat-drawer"
import { usePathname } from "next/navigation"

interface ArkadWrapperProps {
    children: React.ReactNode
}

export function ArkadWrapper({ children }: ArkadWrapperProps) {
    const pathname = usePathname()

    // Don't show floating button on Arkad page itself
    const isArkadPage = pathname?.includes("/dashboard/arkad")

    return (
        <ArkadProvider>
            {children}
            {!isArkadPage && <ArkadFloatingButton />}
            <ArkadChatDrawer />
        </ArkadProvider>
    )
}
