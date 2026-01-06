/**
 * @fileoverview Unit tests for CSV Parser
 * 
 * Tests Nubank formats:
 * - Fatura: date,title,amount (YYYY-MM-DD, positive = expense)
 * - Extrato: Data,Valor,Identificador,Descrição (DD/MM/YYYY, negative = expense)
 */

import { describe, it, expect } from 'vitest'
import { parseCSV, isValidCSV, detectBankFromCSV } from '../csv-parser'

describe('CSV Parser', () => {
    describe('isValidCSV', () => {
        it('should return true for valid CSV content', () => {
            const csv = 'date,title,amount\n2024-12-10,IFOOD,50.00'
            expect(isValidCSV(csv)).toBe(true)
        })

        it('should return true for semicolon-delimited CSV', () => {
            const csv = 'Data;Valor;Descrição\n10/12/2024;-50.00;IFOOD'
            expect(isValidCSV(csv)).toBe(true)
        })

        it('should return false for non-CSV content', () => {
            expect(isValidCSV('single line no delimiter')).toBe(false)
            expect(isValidCSV('')).toBe(false)
        })
    })

    describe('detectBankFromCSV', () => {
        it('should detect Nubank fatura by headers', () => {
            const content = 'date,title,amount\n2024-12-10,IFOOD,50.00'
            expect(detectBankFromCSV(content)).toBe('nubank')
        })

        it('should detect Nubank extrato by headers', () => {
            const content = 'Data,Valor,Identificador,Descrição\n10/12/2024,-50.00,abc123,PIX'
            expect(detectBankFromCSV(content)).toBe('nubank')
        })

        it('should detect Inter', () => {
            const content = 'Data;Lançamento;Ag./Origem;Histórico;Documento;Valor;Saldo\n10/12/2024;PIX;123;DESC;456;-50.00;1000.00'
            expect(detectBankFromCSV(content)).toBe('inter')
        })

        it('should return unknown for unrecognized CSV', () => {
            const content = 'Col1,Col2,Col3\nVal1,Val2,Val3'
            expect(detectBankFromCSV(content)).toBe('unknown')
        })
    })

    describe('parseCSV', () => {
        describe('Nubank Fatura (credit card)', () => {
            it('should parse Nubank fatura with 3 columns (date,title,amount)', async () => {
                // Real Nubank fatura format from user
                const csv = `date,title,amount
2025-12-31,Alessandro da Silva,15.08
2025-12-31,Tennessee Sacoma,252.38
2025-12-30,Recargapay *Bilhunico,30.00`

                const result = await parseCSV(csv, 'nubank')

                expect(result.successCount).toBe(3)
                expect(result.errorCount).toBe(0)
                expect(result.detectedBank).toBe('nubank')

                // All fatura transactions are expenses
                expect(result.transactions[0].type).toBe('expense')
                expect(result.transactions[0].amount).toBe(15.08)
                expect(result.transactions[0].description).toBe('Alessandro da Silva')
                expect(result.transactions[0].date.getDate()).toBe(31)
                expect(result.transactions[0].date.getMonth()).toBe(11) // December

                expect(result.transactions[1].type).toBe('expense')
                expect(result.transactions[1].amount).toBe(252.38)

                expect(result.transactions[2].type).toBe('expense')
                expect(result.transactions[2].amount).toBe(30.00)
            })

            it('should treat all fatura transactions as expenses', async () => {
                const csv = `date,title,amount
2025-12-10,IFOOD *RESTAURANTE,50.00
2025-12-09,UBER *TRIP,30.00`

                const result = await parseCSV(csv, 'nubank')

                expect(result.successCount).toBe(2)
                // All are expenses in fatura (credit card bill)
                expect(result.transactions.every(t => t.type === 'expense')).toBe(true)
            })
        })

        describe('Nubank Extrato (bank statement)', () => {
            it('should parse Nubank extrato with 4 columns (Data,Valor,Id,Descrição)', async () => {
                // Real Nubank extrato format from user
                const csv = `Data,Valor,Identificador,Descrição
03/11/2025,-265.34,6908fe67-4a62-495c,Transferência enviada
06/11/2025,5057.34,690cdee6-31cc-487,Transferência Recebida
06/11/2025,-20,690cdf49-c707-4ab8,Transferência enviada`

                const result = await parseCSV(csv, 'nubank')

                expect(result.successCount).toBe(3)
                expect(result.errorCount).toBe(0)

                // First: expense (negative)
                expect(result.transactions[0].type).toBe('expense')
                expect(result.transactions[0].amount).toBe(265.34)
                expect(result.transactions[0].description).toBe('Transferência enviada')
                expect(result.transactions[0].date.getDate()).toBe(3)
                expect(result.transactions[0].date.getMonth()).toBe(10) // November

                // Second: income (positive)
                expect(result.transactions[1].type).toBe('income')
                expect(result.transactions[1].amount).toBe(5057.34)
                expect(result.transactions[1].description).toBe('Transferência Recebida')

                // Third: expense (negative)
                expect(result.transactions[2].type).toBe('expense')
                expect(result.transactions[2].amount).toBe(20)
            })
        })

        describe('Inter format', () => {
            it('should parse Inter CSV with semicolon delimiter', async () => {
                // Real Inter extrato format with 5 metadata rows
                const csv = `Extrato Conta Corrente
Conta;269903917
Período;01/08/2025 a 04/01/2026
Saldo:;0,45

Data Lançamento;Descrição;Valor;Saldo
10/12/2024;PIX ENVIADO;-100,50;5000,00
09/12/2024;TED RECEBIDA;3500,00;5100,50`

                const result = await parseCSV(csv, 'inter', 'extrato')

                expect(result.successCount).toBe(2)
                expect(result.detectedBank).toBe('inter')

                // Expense (negative)
                expect(result.transactions[0].amount).toBe(100.50)
                expect(result.transactions[0].type).toBe('expense')

                // Income (positive)
                expect(result.transactions[1].amount).toBe(3500.00)
                expect(result.transactions[1].type).toBe('income')
            })
        })

        describe('Error handling', () => {
            it('should report errors for invalid dates', async () => {
                const csv = `date,title,amount
invalid,TEST,50.00`

                const result = await parseCSV(csv, 'nubank')

                expect(result.successCount).toBe(0)
                expect(result.errorCount).toBe(1)
                expect(result.errors[0]).toContain('Data inválida')
            })

            it('should report errors for invalid amounts', async () => {
                const csv = `date,title,amount
2024-12-10,TEST,notanumber`

                const result = await parseCSV(csv, 'nubank')

                expect(result.successCount).toBe(0)
                expect(result.errorCount).toBe(1)
                expect(result.errors[0]).toContain('Valor inválido')
            })

            it('should return error for unsupported bank', async () => {
                const result = await parseCSV('some,csv,data', 'itau')

                expect(result.successCount).toBe(0)
                expect(result.errorCount).toBe(1)
                expect(result.errors[0]).toContain('não tem template CSV configurado')
            })
        })

        describe('Brazilian number format', () => {
            it('should handle Brazilian number format with comma as decimal', async () => {
                const csv = `Data,Valor,Identificador,Descrição
03/11/2025,"-1234,56",abc123,COMPRA GRANDE`

                const result = await parseCSV(csv, 'nubank')

                expect(result.successCount).toBe(1)
                expect(result.transactions[0].amount).toBeCloseTo(1234.56, 2)
            })
        })

        describe('Template auto-detection', () => {
            it('should auto-detect fatura template from ISO date', async () => {
                // ISO date (YYYY-MM-DD) = fatura
                const csv = `date,title,amount
2024-12-10,IFOOD,50.00`

                const result = await parseCSV(csv, 'nubank')

                expect(result.successCount).toBe(1)
                expect(result.transactions[0].type).toBe('expense') // Fatura = expense
            })

            it('should auto-detect extrato template from BR date', async () => {
                // Brazilian date (DD/MM/YYYY) = extrato
                const csv = `Data,Valor,Identificador,Descrição
10/12/2024,-50.00,abc123,PIX ENVIADO`

                const result = await parseCSV(csv, 'nubank')

                expect(result.successCount).toBe(1)
                expect(result.transactions[0].type).toBe('expense') // Negative = expense
            })
        })
    })
})
