
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Wallet,
    ArrowRightLeft,
    PieChart,
    Settings,
    Bot,
    LogOut,
    Menu
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { logout } from "@/app/auth/actions"
import Image from "next/image"

const sidebarItems = [
    {
        title: "Visão Geral",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Transações",
        href: "/dashboard/transactions",
        icon: ArrowRightLeft,
    },
    {
        title: "Investimentos",
        href: "/dashboard/investments",
        icon: PieChart,
    },
    {
        title: "Carteira",
        href: "/dashboard/wallet",
        icon: Wallet,
    },
    {
        title: "Arkad AI",
        href: "/dashboard/arkad",
        icon: Bot,
        premium: true,
    },
]

export function AppSidebar({ className }: { className?: string }) {
    const pathname = usePathname()

    return (
        <div className={cn("pb-12 min-h-screen border-r bg-gray-50/40 dark:bg-zinc-900/40", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <div className="flex items-center px-4 mb-10">
                        <Image
                            src="/images/logo-green.png"
                            alt="Graham Logo"
                            width={140}
                            height={40}
                            className="dark:hidden block"
                            priority
                        />
                        <Image
                            src="/images/logo-white.png"
                            alt="Graham Logo"
                            width={140}
                            height={40}
                            className="hidden dark:block"
                            priority
                        />
                    </div>
                    <div className="space-y-1">
                        {sidebarItems.map((item) => (
                            <Button
                                key={item.href}
                                asChild
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start text-base font-normal",
                                    pathname === item.href
                                        ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-50"
                                        : "hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-400"
                                )}
                            >
                                <Link href={item.href}>
                                    <item.icon className={cn("mr-3 h-5 w-5", item.premium && "text-purple-500")} />
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
                <div className="px-3 py-2">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-base font-normal text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
                        >
                            <Settings className="mr-3 h-5 w-5" />
                            Configurações
                        </Button>
                        <form action={logout}>
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-base font-normal text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <LogOut className="mr-3 h-5 w-5" />
                                Sair
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function MobileSidebar() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden" size="icon">
                    <Menu className="h-6 w-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
                <AppSidebar />
            </SheetContent>
        </Sheet>
    )
}
