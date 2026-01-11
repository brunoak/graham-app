/**
 * @fileoverview Unit tests for decimal precision utilities
 * @module utils/__tests__/decimal-utils.test
 */

import { describe, it, expect } from 'vitest'
import {
    roundDecimal,
    roundQuantity,
    roundPrice,
    roundCurrency,
    isLessThan,
    isGreaterThan,
    isEqual,
    isGreaterOrEqual,
    isLessOrEqual,
    QUANTITY_DECIMALS,
    PRICE_DECIMALS,
    CURRENCY_DECIMALS
} from '../decimal-utils'

describe('Decimal Utilities', () => {
    describe('roundDecimal', () => {
        it('should round to 6 decimal places by default', () => {
            expect(roundDecimal(1.123456789)).toBe(1.123457)
        })

        it('should round to specified decimal places', () => {
            expect(roundDecimal(1.123456, 2)).toBe(1.12)
            expect(roundDecimal(1.125, 2)).toBe(1.13) // Round up at 0.5
            expect(roundDecimal(1.124, 2)).toBe(1.12)
        })

        it('should handle floating point precision issue', () => {
            // Classic floating point issue: 0.1 + 0.2 = 0.30000000000000004
            const result = 0.1 + 0.2
            expect(roundDecimal(result, 2)).toBe(0.3)
        })

        it('should handle the Tesouro Prefixado case (6.609999999999999)', () => {
            expect(roundDecimal(6.609999999999999, 2)).toBe(6.61)
            expect(roundDecimal(6.609999999999999, 6)).toBe(6.61)
        })

        it('should handle zero', () => {
            expect(roundDecimal(0)).toBe(0)
            expect(roundDecimal(0, 2)).toBe(0)
        })

        it('should handle negative numbers', () => {
            expect(roundDecimal(-1.234567, 2)).toBe(-1.23)
            expect(roundDecimal(-1.235, 2)).toBe(-1.24) // Round away from zero
        })

        it('should handle very small numbers', () => {
            expect(roundDecimal(0.000001, 6)).toBe(0.000001)
            expect(roundDecimal(0.0000001, 6)).toBe(0)
        })

        it('should handle whole numbers', () => {
            expect(roundDecimal(100, 2)).toBe(100)
            expect(roundDecimal(100.00, 2)).toBe(100)
        })
    })

    describe('roundQuantity', () => {
        it('should round to QUANTITY_DECIMALS (6)', () => {
            expect(QUANTITY_DECIMALS).toBe(6)
            expect(roundQuantity(1.1234567890)).toBe(1.123457)
        })

        it('should handle typical quantity values', () => {
            expect(roundQuantity(6.61)).toBe(6.61)
            expect(roundQuantity(4.31)).toBe(4.31)
            expect(roundQuantity(100)).toBe(100)
        })

        it('should handle fractional shares', () => {
            expect(roundQuantity(0.123456)).toBe(0.123456)
            expect(roundQuantity(0.1234567)).toBe(0.123457)
        })
    })

    describe('roundPrice', () => {
        it('should round to PRICE_DECIMALS (2)', () => {
            expect(PRICE_DECIMALS).toBe(2)
            expect(roundPrice(771.6789)).toBe(771.68)
        })

        it('should handle typical price values', () => {
            expect(roundPrice(100.00)).toBe(100)
            expect(roundPrice(12.345)).toBe(12.35)
            expect(roundPrice(12.344)).toBe(12.34)
        })
    })

    describe('roundCurrency', () => {
        it('should round to CURRENCY_DECIMALS (2)', () => {
            expect(CURRENCY_DECIMALS).toBe(2)
            expect(roundCurrency(1234.567)).toBe(1234.57)
        })

        it('should handle typical currency values', () => {
            expect(roundCurrency(6610.00)).toBe(6610)
            expect(roundCurrency(1509.295)).toBe(1509.30)
        })
    })

    describe('isLessThan', () => {
        it('should return true when a < b', () => {
            expect(isLessThan(5, 10)).toBe(true)
            expect(isLessThan(6.60, 6.61)).toBe(true)
        })

        it('should return false when a >= b', () => {
            expect(isLessThan(10, 5)).toBe(false)
            expect(isLessThan(6.61, 6.61)).toBe(false)
        })

        it('should handle floating point precision issue', () => {
            // This was the original bug: 6.609999999999999 < 6.61 was true
            expect(isLessThan(6.609999999999999, 6.61)).toBe(false)
        })

        it('should use custom decimal precision', () => {
            expect(isLessThan(6.609, 6.61, 2)).toBe(false) // Both round to 6.61
            expect(isLessThan(6.604, 6.61, 2)).toBe(true) // 6.60 < 6.61
        })
    })

    describe('isGreaterThan', () => {
        it('should return true when a > b', () => {
            expect(isGreaterThan(10, 5)).toBe(true)
        })

        it('should return false when a <= b', () => {
            expect(isGreaterThan(5, 10)).toBe(false)
            expect(isGreaterThan(6.61, 6.61)).toBe(false)
        })

        it('should handle floating point precision', () => {
            expect(isGreaterThan(6.610000001, 6.61)).toBe(false)
        })
    })

    describe('isEqual', () => {
        it('should return true for equal values', () => {
            expect(isEqual(6.61, 6.61)).toBe(true)
            expect(isEqual(100, 100)).toBe(true)
        })

        it('should return false for different values', () => {
            expect(isEqual(6.60, 6.61)).toBe(false)
        })

        it('should treat floating point approximations as equal', () => {
            expect(isEqual(6.609999999999999, 6.61)).toBe(true)
            expect(isEqual(0.1 + 0.2, 0.3, 2)).toBe(true)
        })
    })

    describe('isGreaterOrEqual', () => {
        it('should return true when a >= b', () => {
            expect(isGreaterOrEqual(10, 5)).toBe(true)
            expect(isGreaterOrEqual(6.61, 6.61)).toBe(true)
            expect(isGreaterOrEqual(6.609999999999999, 6.61)).toBe(true)
        })

        it('should return false when a < b', () => {
            expect(isGreaterOrEqual(5, 10)).toBe(false)
        })
    })

    describe('isLessOrEqual', () => {
        it('should return true when a <= b', () => {
            expect(isLessOrEqual(5, 10)).toBe(true)
            expect(isLessOrEqual(6.61, 6.61)).toBe(true)
            expect(isLessOrEqual(6.609999999999999, 6.61)).toBe(true)
        })

        it('should return false when a > b', () => {
            expect(isLessOrEqual(10, 5)).toBe(false)
        })
    })

    describe('Real-world scenarios', () => {
        it('should handle the Tesouro Prefixado 2025 case', () => {
            // User had: 2 buys totaling 8.36, trying to sell 6.01
            // But floating point gave: 6.609999999999999 vs 6.61
            const availableQty = roundQuantity(4.31 + 4.05 - 1.75) // Simulating accumulated operations
            const requestedQty = roundQuantity(6.61)

            // The comparison should work correctly
            expect(isLessThan(availableQty, requestedQty)).toBe(false)
        })

        it('should handle cumulative quantity calculations', () => {
            // Simulate multiple buy operations
            let qty = 0
            qty = roundQuantity(qty + 4.31)
            qty = roundQuantity(qty + 4.05)

            expect(qty).toBe(8.36)

            // After sell
            qty = roundQuantity(qty - 6.61)
            expect(qty).toBe(1.75)
        })

        it('should handle price averaging', () => {
            const qty1 = 10
            const price1 = 100.50
            const qty2 = 5
            const price2 = 105.75

            const totalCost = qty1 * price1 + qty2 * price2
            const totalQty = qty1 + qty2
            const avgPrice = roundPrice(totalCost / totalQty)

            expect(avgPrice).toBe(102.25)
        })
    })
})
