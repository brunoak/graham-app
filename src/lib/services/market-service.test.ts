import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMarketQuote, getMarketFundamentals, getGlobalIndices } from './market-service'

// Mock Fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock Yahoo Finance
const { mockYahooQuote } = vi.hoisted(() => {
    return { mockYahooQuote: vi.fn() }
})

vi.mock('yahoo-finance2', () => {
    return {
        default: class {
            quote = mockYahooQuote
        }
    }
})

describe('Market Service', () => {
    beforeEach(() => {
        mockFetch.mockReset()
        mockYahooQuote.mockReset()
    })

    describe('getMarketQuote', () => {
        it('should return a valid Quote on success', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{
                        symbol: 'XPML11',
                        regularMarketPrice: 105.50,
                        regularMarketChangePercent: 1.25,
                        regularMarketTime: '2025-12-14T10:30:00'
                    }]
                })
            })

            const result = await getMarketQuote('XPML11')

            expect(result).not.toBeNull()
            expect(result?.symbol).toBe('XPML11')
            expect(result?.regularMarketPrice).toBe(105.50)
        })

        it('should return null on API error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            })

            const result = await getMarketQuote('INVALID')
            expect(result).toBeNull()
        })
    })

    describe('getGlobalIndices', () => {
        it('should return formatted quotes from Yahoo Finance', async () => {
            mockYahooQuote.mockResolvedValue([
                { symbol: '^BVSP', regularMarketPrice: 128000, regularMarketChangePercent: 0.5, regularMarketTime: new Date() },
                { symbol: 'USDBRL=X', regularMarketPrice: 5.50, regularMarketChangePercent: -0.2, regularMarketTime: new Date() }
            ])

            const result = await getGlobalIndices()

            expect(result).toHaveLength(2)
            expect(result[0].symbol).toBe('^BVSP')
            expect(result[1].symbol).toBe('USDBRL=X')
            expect(result[1].regularMarketPrice).toBe(5.50)
        })

        it('should return empty array on Yahoo error', async () => {
            mockYahooQuote.mockRejectedValue(new Error("Yahoo API Error"))

            const result = await getGlobalIndices()
            expect(result).toEqual([])
        })
    })

    describe('getMarketFundamentals', () => {
        it('should map API result to Fundamentals interface', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{
                        symbol: 'XPML11',
                        priceEarnings: 10.5,
                        defaultKeyStatistics: { yield: 12.5 },
                        summaryProfile: { priceToBook: 0.95 },
                        enterpriseValueEbitda: 8.5,
                        financialData: {
                            bookValue: 110.00,
                            grossMargins: 0.45,
                            profitMargins: 0.20,
                            returnOnEquity: 0.15
                        }
                    }]
                })
            })

            const result = await getMarketFundamentals('XPML11')

            expect(result).not.toBeNull()
            expect(result?.valuation.dy).toBe(12.5) // Yield
            expect(result?.valuation.pe).toBe(10.5) // P/L
            expect(result?.efficiency.grossMargin).toBe(0.45) // Margem Bruta
        })

        it('should handle partial data gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    results: [{
                        symbol: 'UNKNOWN',
                        // Missing most fields
                    }]
                })
            })

            const result = await getMarketFundamentals('UNKNOWN')

            // Should fallback to 0
            expect(result?.valuation.pe).toBe(0)
            expect(result?.efficiency.netMargin).toBe(0)
        })
    })
})
