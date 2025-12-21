"use client"

import { useEffect, useRef, memo } from 'react'
import { useTheme } from "next-themes"

/**
 * TradingView Advanced Chart Widget.
 * Embeds the "advanced-chart-widget" script from TradingView.
 * 
 * Features:
 * - Adjusts theme (Light/Dark) based on Next-Themes.
 * - Auto-sizes to container.
 * - Sets timezone to America/Sao_Paulo.
 * - Maps ticker symbol to BMFBOVESPA format (e.g. BMFBOVESPA:PETR4).
 */
function TradingViewWidgetComponent({ ticker }: { ticker: string }) {
    const container = useRef<HTMLDivElement>(null)
    const { resolvedTheme } = useTheme()

    useEffect(() => {
        if (!container.current) return;

        // Clean up previous script if any
        container.current.innerHTML = "";

        const script = document.createElement("script")
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
        script.type = "text/javascript"
        script.async = true
        script.innerHTML = JSON.stringify({
            "autosize": true,
            "symbol": "BMFBOVESPA:" + ticker,
            "interval": "D",
            "timezone": "America/Sao_Paulo",
            "theme": resolvedTheme === 'dark' ? 'dark' : 'light',
            "style": "1",
            "locale": "br",
            "enable_publishing": false,
            "allow_symbol_change": true,
            "calendar": false,
            "support_host": "https://www.tradingview.com"
        })
        container.current.appendChild(script)
    }, [ticker, resolvedTheme])

    return (
        <div className="w-full h-[500px] border border-gray-100 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-zinc-900" ref={container}>
            {/* Widget injected here */}
        </div>
    )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent)
