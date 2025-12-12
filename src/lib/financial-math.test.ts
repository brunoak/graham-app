import { expect, test, describe } from 'vitest'
import { formatCurrency, calculateGrowth, formatPercentage, calculatePositionTotal } from './financial-math'

describe('Financial Math Utils', () => {

    describe('formatCurrency', () => {
        test('formats BRL correctly', () => {
            expect(formatCurrency(1000, 'BRL')).toContain('R$')
            expect(formatCurrency(1000, 'BRL')).toContain('1.000,00')
        })

        test('formats USD correctly', () => {
            expect(formatCurrency(1000, 'USD')).toContain('$')
            // Intl format might be US$ or $, checking mostly for the container logic
        })

        test('handles zero', () => {
            expect(formatCurrency(0, 'BRL')).toContain('0,00')
        })
    })

    describe('calculateGrowth', () => {
        test('calculates positive growth', () => {
            expect(calculateGrowth(150, 100)).toBe(0.5) // 50%
        })

        test('calculates negative growth (loss)', () => {
            expect(calculateGrowth(80, 100)).toBe(-0.2) // -20%
        })

        test('handles zero initial value (safety)', () => {
            expect(calculateGrowth(100, 0)).toBe(0)
        })

        test('handles zero current value (total loss)', () => {
            expect(calculateGrowth(0, 100)).toBe(-1)
        })
    })

    describe('formatPercentage', () => {
        test('formats decimal to string', () => {
            expect(formatPercentage(0.156)).toBe('15.6%')
        })

        test('rounds decimals correctly', () => {
            expect(formatPercentage(0.1567, 1)).toBe('15.7%')
        })
    })

    describe('calculatePositionTotal', () => {
        test('pure multiplication', () => {
            expect(calculatePositionTotal(10, 50.5)).toBe(505)
        })
    })
})
