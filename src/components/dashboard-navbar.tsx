"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    ArrowRightLeft,
    PieChart,
    Settings,
    Bot,
    LogOut,
    Menu,
    Bell,
    User,
    LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { logout } from "@/app/auth/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"

const navItems = [
    {
        title: "Dashboards",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Controle Financeiro",
        href: "/dashboard/transactions",
        icon: ArrowRightLeft,
    },
    {
        title: "Investimentos",
        href: "/dashboard/investments",
        icon: PieChart,
    },
    {
        title: "Arkad",
        href: "/dashboard/arkad",
        icon: Bot,
        premium: true,
    },
]

export function DashboardNavbar({ user }: { user: any }) {
    const pathname = usePathname()

    const getInitials = () => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
        }
        return user?.email?.substring(0, 2).toUpperCase() || "U"
    }

    const MobileMenu = () => (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-white hover:bg-emerald-700 hover:text-white">
                    <Menu className="!h-8 !w-8" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-emerald-600 border-none p-6 flex flex-col gap-6 text-white [&>button]:text-white [&_svg]:text-white z-[60] [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:opacity-100 [&_[data-slot=sheet-close]_svg]:!h-8 [&_[data-slot=sheet-close]_svg]:!w-8 [&_[data-slot=sheet-close]]:!right-6 [&_[data-slot=sheet-close]]:!top-6">
                <div className="flex flex-col gap-4 mt-8">
                    <SheetClose asChild>
                        <Link href="/profile" className="flex items-center gap-4 text-xl font-medium hover:opacity-80">
                            <User className="h-6 w-6" />
                            Meu perfil
                        </Link>
                    </SheetClose>
                    <div className="flex items-center gap-4 text-xl font-medium hover:opacity-80 cursor-pointer whitespace-nowrap">
                        <ModeToggle mobile />
                        <span className="">Modo escuro</span>
                    </div>
                    <SheetClose asChild>
                        <Link href="/settings" className="flex items-center gap-4 text-xl font-medium hover:opacity-80">
                            <Settings className="h-6 w-6" />
                            Configurações
                        </Link>
                    </SheetClose>
                    <form action={logout}>
                        <SheetClose asChild>
                            <button type="submit" className="flex items-center gap-4 text-xl font-medium hover:opacity-80 w-full text-left">
                                <LogOut className="h-6 w-6" />
                                Sair
                            </button>
                        </SheetClose>
                    </form>
                </div>

                <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-white/20">
                    {navItems.map((item) => (
                        <SheetClose asChild key={item.href}>
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-4 text-xl font-medium hover:opacity-80",
                                    pathname === item.href && "opacity-100 font-bold",
                                    pathname !== item.href && "opacity-90"
                                )}
                            >
                                <item.icon className="h-6 w-6" />
                                {item.title}
                            </Link>
                        </SheetClose>
                    ))}
                    <SheetClose asChild>
                        <Link
                            href="/dashboard/categories"
                            className={cn(
                                "flex items-center gap-4 text-xl font-medium hover:opacity-80",
                                pathname === "/dashboard/categories" && "opacity-100 font-bold",
                                pathname !== "/dashboard/categories" && "opacity-90"
                            )}
                        >
                            <LayoutGrid className="h-6 w-6" />
                            Categorias
                        </Link>
                    </SheetClose>
                </div>

                <div className="mt-auto flex justify-center pb-8">
                    <div className="relative h-8 w-32 opacity-90">
                        <Image
                            src="/images/logo-white.png"
                            alt="Graham Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )

    return (
        <div className="flex flex-col w-full shadow-sm z-50">
            {/* Top Green Bar */}
            <div className="bg-emerald-600 dark:bg-emerald-950 h-16 w-full">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Always White Logo in Green Header */}
                        <div className="relative h-10 w-36">
                            <Image
                                src="/images/logo-white.png"
                                alt="Graham Logo"
                                fill
                                className="object-contain object-left"
                                priority
                            />
                        </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <ModeToggle />

                        <button className="text-white/80 hover:text-white transition-colors relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-emerald-600"></span>
                        </button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Avatar className="cursor-pointer h-8 w-8 border-2 border-white/20 hover:border-white/50 transition-colors">
                                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                                    <AvatarFallback className="bg-emerald-700 text-white text-xs font-medium">
                                        {getInitials()}
                                    </AvatarFallback>
                                </Avatar>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <User className="mr-2 h-4 w-4" /> Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" /> Configurações
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <form action={logout}>
                                    <button type="submit" className="w-full text-left">
                                        <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer">
                                            <LogOut className="mr-2 h-4 w-4" /> Sair
                                        </DropdownMenuItem>
                                    </button>
                                </form>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Mobile Menu Trigger */}
                    <MobileMenu />
                </div>
            </div>

            {/* Bottom White Nav Bar (Hidden on Mobile) */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 h-14 w-full">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex items-center overflow-x-auto no-scrollbar">
                    <nav className="flex items-center gap-1 md:gap-2 h-full">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-4 h-full border-b-2 text-sm font-medium transition-colors whitespace-nowrap",
                                    pathname === item.href
                                        ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                                        : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-200 dark:hover:border-zinc-700"
                                )}
                            >
                                <item.icon className={cn("h-4 w-4", pathname === item.href ? "text-emerald-500" : "text-gray-500")} />
                                {item.title}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>
        </div>
    )
}
