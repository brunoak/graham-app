/**
 * @fileoverview Duplicate detection utilities for investment imports
 * 
 * These are pure utility functions that can be used on both client and server.
 * They are NOT server actions, so they're kept in a separate file.
 * 
 * Improved duplicate detection with:
 * - Fuzzy price matching (tolerance for small variations like 100.05 vs 100.06)
 * - Fuzzy quantity matching (tolerance for rounding differences)
 * - Date normalization (handles timezone issues)
 * - Multiple fingerprint formats for better matching
 */

/**
 * Generate a fingerprint for an operation to compare against existing transactions.
 * Fingerprint format: `${ticker}|${date}|${quantity}|${price}|${type}`
 * 
 * Uses normalized values to handle floating point precision issues.
 */
export function generateOperationFingerprint(op: {
    ticker: string
    date: Date | string
    quantity: number
    price: number
    type: 'buy' | 'sell' | 'dividend'
}): string {
    const dateStr = normalizeDate(op.date)
    const priceNorm = normalizePrice(op.price)
    const qtyNorm = normalizeQuantity(op.quantity)

    return `${op.ticker.toUpperCase()}|${dateStr}|${qtyNorm}|${priceNorm}|${op.type}`
}

/**
 * Generate multiple fingerprints with slight variations for fuzzy matching.
 * This helps catch duplicates even when there are small rounding differences.
 */
export function generateFuzzyFingerprints(op: {
    ticker: string
    date: Date | string
    quantity: number
    price: number
    type: 'buy' | 'sell' | 'dividend'
}): string[] {
    const fingerprints: string[] = []
    const dateStr = normalizeDate(op.date)
    const ticker = op.ticker.toUpperCase()

    // Base fingerprint
    const priceNorm = normalizePrice(op.price)
    const qtyNorm = normalizeQuantity(op.quantity)
    fingerprints.push(`${ticker}|${dateStr}|${qtyNorm}|${priceNorm}|${op.type}`)

    // Price variations (+/- 0.01, +/- 0.02)
    const priceVariations = [
        normalizePrice(op.price + 0.01),
        normalizePrice(op.price - 0.01),
        normalizePrice(op.price + 0.02),
        normalizePrice(op.price - 0.02),
    ]

    for (const pvar of priceVariations) {
        fingerprints.push(`${ticker}|${dateStr}|${qtyNorm}|${pvar}|${op.type}`)
    }

    // Quantity variations for fractional quantities (common with dividends)
    if (op.quantity % 1 !== 0) { // Has decimals
        const qtyVariations = [
            normalizeQuantity(Math.floor(op.quantity * 100) / 100), // Round down 2 decimals
            normalizeQuantity(Math.ceil(op.quantity * 100) / 100),  // Round up 2 decimals
            normalizeQuantity(Math.round(op.quantity)),             // Round to int
        ]

        for (const qvar of qtyVariations) {
            fingerprints.push(`${ticker}|${dateStr}|${qvar}|${priceNorm}|${op.type}`)
        }
    }

    return [...new Set(fingerprints)] // Remove duplicates
}

/**
 * Check if two operations are duplicates using fuzzy matching.
 * More sophisticated than just fingerprint comparison.
 */
export function areOperationsSimilar(
    op1: { ticker: string; date: Date | string; quantity: number; price: number; type: string },
    op2: { ticker: string; date: Date | string; quantity: number; price: number; type: string },
    options: { priceTolerance?: number; quantityTolerance?: number } = {}
): boolean {
    const { priceTolerance = 0.03, quantityTolerance = 0.01 } = options

    // Must have same ticker and type
    if (op1.ticker.toUpperCase() !== op2.ticker.toUpperCase()) return false
    if (op1.type !== op2.type) return false

    // Must have same date (normalized)
    if (normalizeDate(op1.date) !== normalizeDate(op2.date)) return false

    // Check price within tolerance (percentage-based for larger values)
    const priceDiff = Math.abs(op1.price - op2.price)
    const priceThreshold = Math.max(priceTolerance, op1.price * 0.001) // 0.1% or absolute tolerance
    if (priceDiff > priceThreshold) return false

    // Check quantity within tolerance
    const qtyDiff = Math.abs(op1.quantity - op2.quantity)
    if (qtyDiff > quantityTolerance) return false

    return true
}

/**
 * Calculate a hash for an operation based on total value.
 * Useful for detecting duplicates when price/quantity might slightly vary
 * but total value stays the same.
 */
export function generateTotalValueFingerprint(op: {
    ticker: string
    date: Date | string
    quantity: number
    price: number
    type: 'buy' | 'sell' | 'dividend'
}): string {
    const dateStr = normalizeDate(op.date)
    const total = Math.round(op.quantity * op.price * 100) / 100 // Total rounded to 2 decimals

    return `${op.ticker.toUpperCase()}|${dateStr}|${total}|${op.type}`
}

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize date to YYYY-MM-DD string, handling timezone issues.
 */
function normalizeDate(date: Date | string): string {
    if (typeof date === 'string') {
        // If already a date string like "2025-01-14T00:00:00.000Z", extract date part
        if (date.includes('T')) {
            return date.split('T')[0]
        }
        // If already YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date
        }
        // If DD/MM/YYYY format (Brazilian)
        const brMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        if (brMatch) {
            return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`
        }
        // Try parsing
        const parsed = new Date(date)
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0]
        }
        return date // Return as-is if can't parse
    }

    return date.toISOString().split('T')[0]
}

/**
 * Normalize price to 2 decimal places.
 */
function normalizePrice(price: number): number {
    return Math.round(price * 100) / 100
}

/**
 * Normalize quantity to 3 decimal places (handles fractional shares).
 */
function normalizeQuantity(quantity: number): number {
    return Math.round(quantity * 1000) / 1000
}
