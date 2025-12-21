export interface MarketQuote {
    symbol: string
    regularMarketPrice: number
    regularMarketChangePercent: number
    regularMarketTime: string
    logourl?: string
}

export interface MarketFundamentals {
    valuation: {
        dy: number
        pe: number
        pvp: number
        evebitda: number
        evebit: number
        vpa: number
    }
    debt: {
        netDebtPl: number
        netDebtEbitda: number
        plAssets: number
    }
    efficiency: {
        grossMargin: number
        netMargin: number
    }
    profitability: {
        roe: number
        roic: number
    }
}

const BRAPI_BASE_URL = "https://brapi.dev/api"
// Note: In production, this should be in an env var. 
// Using a placeholder or assuming free tier access.
const BRAPI_TOKEN = process.env.BRAPI_TOKEN || "public"

// ... imports

// Removed MOCK_FUNDAMENTALS as requested by user.
// Fundamentals will return null on error, prompting UI to show "Em breve".

export async function getMarketQuote(ticker: string): Promise<MarketQuote | null> {
    try {
        const response = await fetch(`${BRAPI_BASE_URL}/quote/${ticker}?token=${BRAPI_TOKEN}`, {
            next: { revalidate: 60 }
        })

        if (!response.ok) {
            console.warn(`Brapi API Error: ${response.status}.`)
            return null
        }

        const data = await response.json()
        const result = data.results[0]

        return {
            symbol: result.symbol,
            regularMarketPrice: result.regularMarketPrice,
            regularMarketChangePercent: result.regularMarketChangePercent,
            regularMarketTime: result.regularMarketTime,
            logourl: result.logourl
        }
    } catch (error) {
        console.error("Error fetching quote:", error)
        return null
    }
}

export async function getMarketFundamentals(ticker: string): Promise<MarketFundamentals | null> {
    try {
        const response = await fetch(`${BRAPI_BASE_URL}/quote/${ticker}?token=${BRAPI_TOKEN}&modules=summaryProfile,financialData,defaultKeyStatistics,balanceSheetHistory,incomeStatementHistory,price`, {
            next: { revalidate: 3600 }
        })

        if (!response.ok) {
            console.warn(`Brapi Fundamentals API Error: ${response.status}.`)
            // Return null to trigger "Em breve" state in UI
            return null
        }

        const data = await response.json()
        const result = data.results[0]

        return {
            valuation: {
                dy: result.defaultKeyStatistics?.yield || 0,
                pe: result.priceEarnings || 0,
                pvp: result.summaryProfile?.priceToBook || 0,
                evebitda: result.enterpriseValueEbitda || 0,
                evebit: 0,
                vpa: result.financialData?.bookValue || 0,
            },
            debt: {
                netDebtPl: 0,
                netDebtEbitda: 0,
                plAssets: 0
            },
            efficiency: {
                grossMargin: result.financialData?.grossMargins || 0,
                netMargin: result.financialData?.profitMargins || 0
            },
            profitability: {
                roe: result.financialData?.returnOnEquity || 0,
                roic: 0
            }
        }
    } catch (error) {
        console.error("Error fetching fundamentals:", error)
        return null
    }
}

/**
 * Market Service (Hybrid Architecture)
 * 
 * This service implements a Hybrid Strategy for fetching market data:
 * 1. BRAPI.DEV: Primary source for Brazilian assets (Store, FIIs). 
 *    - Used for: getMarketQuote (Individual assets), getMarketFundamentals.
 *    - Why: Best coverage for B3, accurate fundamentals.
 * 
 * 2. YAHOO FINANCE: Secondary source for Global Indices and Crypto.
 *    - Used for: getGlobalIndices (Ticker Tape).
 *    - Why: Brapi Free Tier blocks global indices (401 Unauthorized), while Yahoo provides them reliably for free.
 */

import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey']
})

// ... existing code ...

/**
 * Fetches global market indices using Yahoo Finance.
 * Used primarily for the Ticker Tape component.
 * 
 * Strategy: Uses Yahoo Finance (yahoo-finance2) because Brapi returns 401 for these specific tickers on free tier.
 * Tickers fetched: ^BVSP (Ibovespa), USDBRL=X (Dolar), ^GSPC (S&P 500), ^IXIC (Nasdaq), BTC-USD (Bitcoin).
 */
export async function getGlobalIndices(): Promise<MarketQuote[]> {
    const tickers = ["^BVSP", "USDBRL=X", "^GSPC", "^IXIC", "BTC-USD"]
    try {
        // Yahoo Finance v2/v3 compat
        const results = await yahooFinance.quote(tickers)

        // Ensure array (yahooFinance.quote returns array for multiple tickers)
        const quotes = Array.isArray(results) ? results : [results]

        return quotes.map((result: any) => ({
            symbol: result.symbol,
            regularMarketPrice: result.regularMarketPrice,
            regularMarketChangePercent: result.regularMarketChangePercent,
            regularMarketTime: result.regularMarketTime ? new Date(result.regularMarketTime).toISOString() : new Date().toISOString()
        }))
    } catch (error) {
        console.error("Error fetching global indices from Yahoo:", error)
        return []
    }
}
