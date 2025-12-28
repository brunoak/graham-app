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
interface TradingViewWidgetProps {
    ticker: string
    type?: string // e.g. "stock_br", "stock_us", "crypto"
}

/**
 * TradingView Advanced Chart Widget.
 * Embeds generic TV script.
 * Dynamically determines exchange based on asset type.
 */
function TradingViewWidgetComponent({ ticker, type }: TradingViewWidgetProps) {
    const container = useRef<HTMLDivElement>(null)
    const { resolvedTheme } = useTheme()

    // Smart Symbol Resolution
    const getSymbol = () => {
        const t = ticker.toUpperCase()

        // 1. Crypto
        if (type === 'crypto') {
            return `BINANCE:${t}USDT`
        }

        // 2 Explicit US Types (Prioritize explicit metadata)
        if (type === 'etf_us') return `AMEX:${t}`
        if (type === 'reit_us') return `NYSE:${t}`

        const isUSStockType = type === 'stock_us' || type?.includes('_us');

        // 3. Heuristic: If Ticker has NO DIGITS, assume it's US (e.g. "VOO", "AAPL", "KO") 
        // regardless of type (handling mismatched DB data like VOO as etf_br)
        const hasDigits = /\d/.test(t);

        if (isUSStockType || !hasDigits) {
            // Sub-Heuristic for Exchange
            // ETFs
            if (['VOO', 'IVV', 'VNQ', 'QQQ', 'SPY', 'DIA', 'IWM', 'VTI', 'VEA', 'VWO'].includes(t)) return `AMEX:${t}`

            // NYSE Giants List
            const nyseStocks = ['KO', 'MCD', 'DIS', 'JPM', 'BAC', 'WMT', 'PG', 'V', 'JNJ', 'XOM', 'CVX', 'BRK.B', 'BLK', 'NKE', 'IBM', 'MMM', 'CAT', 'GE', 'F', 'GM', 'UBER', 'TWTR', 'SQ', 'C', 'PFE', 'MRK', 'VZ', 'T', 'HD', 'LOW', 'NKE', 'SBUX', 'GS', 'MS', 'AXP', 'BA', 'LMT', 'RTX', 'HON', 'UNP', 'UPS', 'FDX', 'DE', 'CAT'];

            if (nyseStocks.includes(t)) return `NYSE:${t}`;

            // Default US -> NASDAQ (Tech/Growth favorites)
            return `NASDAQ:${t}`;
        }

        // 4. Default: BMFBOVESPA (Has digits, e.g. PETR4, WEGE3, ALPA4, XPML11)
        return `BMFBOVESPA:${t}`
    }

    useEffect(() => {
        if (!container.current) return;

        container.current.innerHTML = "";

        const script = document.createElement("script")
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
        script.type = "text/javascript"
        script.async = true
        script.innerHTML = JSON.stringify({
            "autosize": true,
            "symbol": getSymbol(),
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
    }, [ticker, type, resolvedTheme])

    return (
        <div className="w-full h-[500px] border border-gray-100 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm bg-white dark:bg-zinc-900" ref={container}>
            {/* Widget injected here */}
        </div>
    )
}

export const TradingViewWidget = memo(TradingViewWidgetComponent)
