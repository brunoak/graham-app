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

// ...

export async function getMarketQuote(ticker: string): Promise<MarketQuote | null> {
    try {
        const url = `${BRAPI_BASE_URL}/quote/${ticker}?token=${BRAPI_TOKEN}`
        const response = await fetch(url, {
            next: { revalidate: 60 }
        })

        if (!response.ok) {
            // Mask token in logs
            const maskedUrl = url.replace(BRAPI_TOKEN, "TOKEN")
            console.warn(`Brapi API Error: ${response.status} for URL: ${maskedUrl}`)
            throw new Error(`Brapi Error: ${response.status}`)
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
        console.warn(`Brapi failed for ${ticker}, trying Yahoo Fallback...`)
        return getYahooQuote(ticker)
    }
}

async function getYahooQuote(ticker: string): Promise<MarketQuote | null> {
    try {
        // Yahoo expects .SA for Brazilian stocks
        // Heuristic: If it looks like a BR stock (e.g. WEGE3, PETR4) and no suffix, add .SA
        // US stocks (AAPL, VOO) don't need suffix.
        let text = ticker.toUpperCase();
        if (!text.includes('.') && (text.match(/^[A-Z]{4}[0-9]+$/))) {
            text += ".SA";
        }

        const result = await yahooFinance.quote(text)
        if (!result) return null;

        let logourl = undefined;
        try {
            // Attempt to get website for logo generation (slower, but requested)
            const profile = await yahooFinance.quoteSummary(text, { modules: ['assetProfile'] });
            if (profile.assetProfile?.website) {
                const domain = new URL(profile.assetProfile.website).hostname.replace('www.', '');
                logourl = `https://logo.clearbit.com/${domain}`;
            }
        } catch (e) {
            // Ignore profile fetch errors (it's optional)
        }

        return {
            symbol: result.symbol,
            regularMarketPrice: result.regularMarketPrice,
            regularMarketChangePercent: result.regularMarketChangePercent,
            regularMarketTime: result.regularMarketTime ? new Date(result.regularMarketTime).toISOString() : new Date().toISOString(),
            logourl: logourl
        }
    } catch (err) {
        console.error(`Yahoo Fallback failed for ${ticker}:`, err)
        return null
    }
}

export async function getMarketFundamentals(ticker: string): Promise<MarketFundamentals | null> {
    try {
        const response = await fetch(`${BRAPI_BASE_URL}/quote/${ticker}?token=${BRAPI_TOKEN}&modules=summaryProfile,financialData,defaultKeyStatistics,balanceSheetHistory,incomeStatementHistory`, {
            next: { revalidate: 3600 }
        })

        if (!response.ok) {
            console.warn(`Brapi Fundamentals API Error: ${response.status}.`)
            throw new Error(`Brapi Error: ${response.status}`)
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
        console.warn(`Brapi Fundamentals failed for ${ticker}, trying Yahoo Fallback...`)
        return getYahooFundamentals(ticker)
    }
}

async function getYahooFundamentals(ticker: string): Promise<MarketFundamentals | null> {
    try {
        let text = ticker.toUpperCase();
        if (!text.includes('.') && (text.match(/^[A-Z]{4}[0-9]+$/))) {
            text += ".SA";
        }

        const result = await yahooFinance.quoteSummary(text, {
            modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics']
        });

        const stats = result.defaultKeyStatistics;
        const finance = result.financialData;
        const summary = result.summaryDetail;

        return {
            valuation: {
                dy: summary?.dividendYield || 0,
                pe: summary?.trailingPE || 0,
                pvp: stats?.priceToBook || 0,
                evebitda: stats?.enterpriseToEbitda || 0,
                evebit: 0, // Yahoo doesn't give EV/EBIT directly easily
                vpa: stats?.bookValue || 0,
            },
            debt: {
                netDebtPl: 0, // Requires manual calc from balance sheet
                netDebtEbitda: 0,
                plAssets: 0
            },
            efficiency: {
                grossMargin: finance?.grossMargins || 0,
                netMargin: finance?.profitMargins || 0
            },
            profitability: {
                roe: finance?.returnOnEquity || 0,
                roic: 0 // Requires manual calc
            }
        }
    } catch (err) {
        console.error(`Yahoo Fundamentals Fallback failed for ${ticker}:`, err)
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
 * 
 * Note: Yahoo Finance has rate limits. This function gracefully returns empty data on 429 errors.
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
    } catch (error: any) {
        // Handle rate limiting gracefully
        const errorMessage = error?.toString() || ''
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
            console.warn("[MarketService] Yahoo Finance rate limited (429). Returning empty indices.")
        } else {
            console.error("[MarketService] Error fetching global indices:", error)
        }
        // Return empty array - UI should handle gracefully
        return []
    }
}
