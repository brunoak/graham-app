/**
 * @fileoverview Unit tests for XLSX Parser
 * 
 * Tests Itaú Excel file parsing with the Lançamentos sheet format:
 * - data | lançamento | ag./origem | valor (R$) | saldos (R$)
 */

import { describe, it, expect, vi } from 'vitest'

// Mock xlsx module since it needs to be installed
vi.mock('xlsx', () => ({
    read: vi.fn((buffer) => ({
        SheetNames: ['Lançamentos', 'Posição Consolidada', 'Limites'],
        Sheets: {
            'Lançamentos': {
                '!ref': 'A1:E5',
                'A1': { v: 'data' },
                'B1': { v: 'lançamento' },
                'C1': { v: 'ag./origem' },
                'D1': { v: 'valor (R$)' },
                'E1': { v: 'saldos (R$)' },
                'A2': { v: 'lançamentos' },
                'A3': { v: '05/10/2025' },
                'B3': { v: 'SALDO ANTERIOR' },
                'E3': { v: 0.00 },
                'A4': { v: '02/01/2026' },
                'B4': { v: 'PIX TRANSF Bruno M01/01' },
                'D4': { v: 10.00 },
                'E4': { v: 10.00 },
                'A5': { v: '02/01/2026' },
                'B5': { v: 'SALDO TOTAL DISPONÍVEL DIA' },
                'E5': { v: 10.00 },
            },
        },
    })),
    utils: {
        decode_range: vi.fn((ref) => ({
            s: { r: 0, c: 0 },
            e: { r: 4, c: 4 },
        })),
        encode_cell: vi.fn(({ r, c }) => {
            const cols = ['A', 'B', 'C', 'D', 'E']
            return `${cols[c]}${r + 1}`
        }),
    },
}))

import { parseXLSX, detectBankFromXLSX, ITAU_EXTRATO_TEMPLATE } from '../xlsx-parser'

describe('XLSX Parser', () => {
    describe('ITAU_EXTRATO_TEMPLATE', () => {
        it('should have correct column mappings', () => {
            expect(ITAU_EXTRATO_TEMPLATE.bank).toBe('itau')
            expect(ITAU_EXTRATO_TEMPLATE.dateColumn).toBe(0)
            expect(ITAU_EXTRATO_TEMPLATE.descriptionColumn).toBe(1)
            expect(ITAU_EXTRATO_TEMPLATE.originColumn).toBe(2)
            expect(ITAU_EXTRATO_TEMPLATE.amountColumn).toBe(3)
            expect(ITAU_EXTRATO_TEMPLATE.sheetName).toBe('Lançamentos')
        })

        it('should skip SALDO rows', () => {
            const patterns = ITAU_EXTRATO_TEMPLATE.skipPatterns

            expect(patterns.some(p => p.test('SALDO ANTERIOR'))).toBe(true)
            expect(patterns.some(p => p.test('SALDO TOTAL DISPONÍVEL DIA'))).toBe(true)
            expect(patterns.some(p => p.test('SALDO DO DIA'))).toBe(true)
            expect(patterns.some(p => p.test('lançamentos'))).toBe(true)

            // Should NOT skip regular transactions
            expect(patterns.some(p => p.test('PIX TRANSF Bruno'))).toBe(false)
            expect(patterns.some(p => p.test('COMPRA CARTAO'))).toBe(false)
        })

        it('should treat positive amounts as income', () => {
            expect(ITAU_EXTRATO_TEMPLATE.positiveIsIncome).toBe(true)
        })
    })

    describe('parseXLSX', () => {
        it('should parse Itaú Excel file correctly', async () => {
            // Create a mock buffer
            const mockBuffer = Buffer.from('mock xlsx content')

            const result = await parseXLSX(mockBuffer, 'itau', 'extrato')

            // Should have parsed 1 transaction (PIX TRANSF, skipping SALDO rows)
            expect(result.successCount).toBe(1)
            expect(result.detectedBank).toBe('itau')
            expect(result.transactions).toHaveLength(1)

            const tx = result.transactions[0]
            expect(tx.description).toContain('PIX TRANSF')
            expect(tx.amount).toBe(10.00)
            expect(tx.type).toBe('income')  // Positive = income
        })

        it('should skip SALDO ANTERIOR rows', async () => {
            const mockBuffer = Buffer.from('mock')

            const result = await parseXLSX(mockBuffer, 'itau', 'extrato')

            // Should not include SALDO rows
            const saldoTx = result.transactions.find(tx =>
                tx.description.includes('SALDO')
            )
            expect(saldoTx).toBeUndefined()
        })
    })
})
