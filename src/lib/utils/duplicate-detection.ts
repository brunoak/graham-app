/**
 * @fileoverview Duplicate detection utilities for investment imports
 * 
 * These are pure utility functions that can be used on both client and server.
 * They are NOT server actions, so they're kept in a separate file.
 */

/**
 * Generate a fingerprint for an operation to compare against existing transactions.
 * Fingerprint format: `${ticker}|${date}|${quantity}|${price}|${type}`
 */
export function generateOperationFingerprint(op: {
    ticker: string
    date: Date | string
    quantity: number
    price: number
    type: 'buy' | 'sell' | 'dividend'
}): string {
    const dateStr = op.date instanceof Date
        ? op.date.toISOString().split('T')[0]
        : new Date(op.date).toISOString().split('T')[0]

    const priceRounded = Math.round(op.price * 100) / 100
    const qtyRounded = Math.round(op.quantity * 1000) / 1000

    return `${op.ticker.toUpperCase()}|${dateStr}|${qtyRounded}|${priceRounded}|${op.type}`
}
