/**
 * @fileoverview Unit tests for duplicate detection functions
 * @module actions/__tests__/investment-actions-duplicates.test
 */

import { describe, it, expect } from 'vitest'
import { generateOperationFingerprint } from '../../utils/duplicate-detection'

describe('Duplicate Detection Functions', () => {
    describe('generateOperationFingerprint', () => {
        it('should generate consistent fingerprint for same operation', () => {
            const op = {
                ticker: 'PETR4',
                date: new Date('2024-06-15'),
                quantity: 100,
                price: 35.50,
                type: 'buy' as const
            }

            const fp1 = generateOperationFingerprint(op)
            const fp2 = generateOperationFingerprint(op)

            expect(fp1).toBe(fp2)
        })

        it('should generate correct format: ticker|date|qty|price|type', () => {
            const op = {
                ticker: 'VALE3',
                date: new Date('2024-01-10'),
                quantity: 50,
                price: 72.25,
                type: 'sell' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp).toBe('VALE3|2024-01-10|50|72.25|sell')
        })

        it('should uppercase ticker', () => {
            const op = {
                ticker: 'petr4',
                date: new Date('2024-06-15'),
                quantity: 100,
                price: 35.50,
                type: 'buy' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp.startsWith('PETR4|')).toBe(true)
        })

        it('should handle Date object', () => {
            const op = {
                ticker: 'XPML11',
                date: new Date('2024-03-20'),
                quantity: 10,
                price: 95.00,
                type: 'buy' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp).toContain('2024-03-20')
        })

        it('should handle date string (ISO format)', () => {
            const op = {
                ticker: 'XPML11',
                date: '2024-03-20T10:30:00.000Z',
                quantity: 10,
                price: 95.00,
                type: 'buy' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp).toContain('2024-03-20')
        })

        it('should round price to 2 decimal places', () => {
            const op = {
                ticker: 'TEST',
                date: new Date('2024-01-01'),
                quantity: 1,
                price: 10.12345,
                type: 'buy' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp).toContain('10.12')
            expect(fp).not.toContain('10.12345')
        })

        it('should round quantity to 3 decimal places', () => {
            const op = {
                ticker: 'TEST',
                date: new Date('2024-01-01'),
                quantity: 1.123456,
                price: 10,
                type: 'buy' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp).toContain('1.123')
            expect(fp).not.toContain('1.123456')
        })

        it('should produce different fingerprints for different tickers', () => {
            const baseOp = {
                date: new Date('2024-06-15'),
                quantity: 100,
                price: 35.50,
                type: 'buy' as const
            }

            const fp1 = generateOperationFingerprint({ ...baseOp, ticker: 'PETR4' })
            const fp2 = generateOperationFingerprint({ ...baseOp, ticker: 'VALE3' })

            expect(fp1).not.toBe(fp2)
        })

        it('should produce different fingerprints for different dates', () => {
            const baseOp = {
                ticker: 'PETR4',
                quantity: 100,
                price: 35.50,
                type: 'buy' as const
            }

            const fp1 = generateOperationFingerprint({ ...baseOp, date: new Date('2024-06-15') })
            const fp2 = generateOperationFingerprint({ ...baseOp, date: new Date('2024-06-16') })

            expect(fp1).not.toBe(fp2)
        })

        it('should produce different fingerprints for different quantities', () => {
            const baseOp = {
                ticker: 'PETR4',
                date: new Date('2024-06-15'),
                price: 35.50,
                type: 'buy' as const
            }

            const fp1 = generateOperationFingerprint({ ...baseOp, quantity: 100 })
            const fp2 = generateOperationFingerprint({ ...baseOp, quantity: 200 })

            expect(fp1).not.toBe(fp2)
        })

        it('should produce different fingerprints for different prices', () => {
            const baseOp = {
                ticker: 'PETR4',
                date: new Date('2024-06-15'),
                quantity: 100,
                type: 'buy' as const
            }

            const fp1 = generateOperationFingerprint({ ...baseOp, price: 35.50 })
            const fp2 = generateOperationFingerprint({ ...baseOp, price: 36.00 })

            expect(fp1).not.toBe(fp2)
        })

        it('should produce different fingerprints for different types', () => {
            const baseOp = {
                ticker: 'PETR4',
                date: new Date('2024-06-15'),
                quantity: 100,
                price: 35.50
            }

            const fp1 = generateOperationFingerprint({ ...baseOp, type: 'buy' as const })
            const fp2 = generateOperationFingerprint({ ...baseOp, type: 'sell' as const })

            expect(fp1).not.toBe(fp2)
        })

        it('should handle dividend type', () => {
            const op = {
                ticker: 'ITUB4',
                date: new Date('2024-06-15'),
                quantity: 500,
                price: 0.50,
                type: 'dividend' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp).toContain('dividend')
        })

        it('should handle zero quantity', () => {
            const op = {
                ticker: 'TEST',
                date: new Date('2024-01-01'),
                quantity: 0,
                price: 10,
                type: 'buy' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp).toContain('|0|')
        })

        it('should handle zero price', () => {
            const op = {
                ticker: 'TEST',
                date: new Date('2024-01-01'),
                quantity: 100,
                price: 0,
                type: 'buy' as const
            }

            const fp = generateOperationFingerprint(op)

            expect(fp).toContain('|0|buy')
        })
    })
})
