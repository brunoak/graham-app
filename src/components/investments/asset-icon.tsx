"use client"


import { TrendingUp, Building2, Wallet, DollarSign } from "lucide-react"

interface AssetIconProps {
    ticker: string
    type: string // "stock_br", "etf_us", etc.
    logourl?: string | null
    className?: string
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function AssetIcon({ ticker, type, logourl, className = "w-8 h-8" }: AssetIconProps) {
    // Base size for internal icon
    const iconSize = className.includes("w-10") || className.includes("h-10") ? "h-5 w-5" : "h-4 w-4"

    const fallbackContent = (
        <div className={`w-full h-full flex items-center justify-center ${type.startsWith('stock') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20' :
            type.startsWith('etf') ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20' :
                type.startsWith('reit') ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20' :
                    type === 'crypto' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/20' :
                        type === 'treasure' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20' :
                            type === 'fixed_income' ? 'bg-green-100 text-green-600 dark:bg-green-900/20' :
                                'bg-gray-100 text-gray-600'
            }`}>
            {type.startsWith('stock') && <TrendingUp className={iconSize} />}
            {type.startsWith('etf') && <TrendingUp className={iconSize} />}
            {type.startsWith('reit') && <Building2 className={iconSize} />}
            {type === 'crypto' && <Wallet className={iconSize} />}
            {type === 'treasure' && <DollarSign className={iconSize} />}
            {(type === 'fixed_income' || type.includes('fixed_income')) && <DollarSign className={iconSize} />}
        </div>
    )

    return (
        <Avatar className={className}>
            {logourl && <AvatarImage src={logourl} alt={ticker} className="object-cover" />}
            <AvatarFallback asChild>
                {fallbackContent}
            </AvatarFallback>
        </Avatar>
    )
}
