/**
 * @fileoverview Unit tests for PDF Parser
 * 
 * Tests Itaú formats:
 * - Fatura: DD/MM description value (credit card bill)
 * - Extrato: DD/MM/YYYY description value saldo (bank statement)
 */

import { describe, it, expect } from 'vitest'
import { isValidPDF, detectBankFromPDF, detectSourceType } from '../pdf-parser'

describe('PDF Parser', () => {
    describe('isValidPDF', () => {
        it('should return true for valid PDF header', () => {
            const pdfBuffer = Buffer.from('%PDF-1.4\n%some content')
            expect(isValidPDF(pdfBuffer)).toBe(true)
        })

        it('should return false for non-PDF content', () => {
            const textBuffer = Buffer.from('Hello World')
            expect(isValidPDF(textBuffer)).toBe(false)
        })

        it('should return false for CSV content', () => {
            const csvBuffer = Buffer.from('date,title,amount\n2024-12-10,TEST,50.00')
            expect(isValidPDF(csvBuffer)).toBe(false)
        })
    })

    describe('detectBankFromPDF', () => {
        it('should detect Itaú by name', () => {
            expect(detectBankFromPDF('Banco Itaú S.A.')).toBe('itau')
            expect(detectBankFromPDF('ITAÚ UNIBANCO')).toBe('itau')
            expect(detectBankFromPDF('ItauUniclass')).toBe('itau')
        })

        it('should detect Bradesco', () => {
            expect(detectBankFromPDF('BANCO BRADESCO S.A.')).toBe('bradesco')
        })

        it('should detect Banco do Brasil', () => {
            expect(detectBankFromPDF('BANCO DO BRASIL S.A.')).toBe('bb')
        })

        it('should detect Santander', () => {
            expect(detectBankFromPDF('BANCO SANTANDER BRASIL')).toBe('santander')
        })

        it('should detect Caixa', () => {
            expect(detectBankFromPDF('CAIXA ECONOMICA FEDERAL')).toBe('caixa')
        })

        it('should detect Inter', () => {
            expect(detectBankFromPDF('BANCO INTER S.A.')).toBe('inter')
        })

        it('should return unknown for unrecognized content', () => {
            expect(detectBankFromPDF('Some random text')).toBe('unknown')
        })
    })

    describe('detectSourceType', () => {
        it('should detect fatura from credit card keywords', () => {
            expect(detectSourceType('TOTAL DA SUA FATURA')).toBe('fatura')
            expect(detectSourceType('Lançamentos: compras e saques')).toBe('fatura')
            expect(detectSourceType('VALOR DA FATURA')).toBe('fatura')
            expect(detectSourceType('CARTÃO DE CRÉDITO')).toBe('fatura')
        })

        it('should detect extrato from bank statement keywords', () => {
            expect(detectSourceType('EXTRATO CONTA CORRENTE')).toBe('extrato')
            expect(detectSourceType('SALDO ANTERIOR')).toBe('extrato')
            expect(detectSourceType('EXTRATO BANCÁRIO')).toBe('extrato')
        })

        it('should default to extrato for unknown content', () => {
            expect(detectSourceType('Some random text')).toBe('extrato')
        })
    })
})

// Tests that require actual PDF parsing would need mock pdf-parse
// These are integration tests that require the pdf-parse library to be installed
describe('PDF Parser - Integration (requires pdf-parse)', () => {
    // Note: These tests would be run after npm install pdf-parse

    describe('Itaú Fatura Parsing', () => {
        it.todo('should parse transaction lines from fatura text')
        it.todo('should extract parcela info from description')
        it.todo('should handle year rollover correctly')
    })

    describe('Itaú Extrato Parsing', () => {
        it.todo('should parse transaction lines from extrato text')
        it.todo('should detect income vs expense from sign')
    })
})

// Text-based tests that don't require pdf-parse
describe('PDF Parser - Text Parsing Logic', () => {
    // Simulated text that would come from pdf-parse

    it('should match transaction line regex for fatura format', () => {
        const regex = /(\d{2}\/\d{2})\s+(.+?)\s+([\d.]+,\d{2})\s*$/

        // Test cases from real Itaú fatura
        const line1 = '10/03   DI GASPI LJ 19 03/04         175,02'
        const match1 = line1.match(regex)
        expect(match1).not.toBeNull()
        expect(match1?.[1]).toBe('10/03')
        expect(match1?.[2]).toBe('DI GASPI LJ 19 03/04')
        expect(match1?.[3]).toBe('175,02')

        const line2 = '08/02   Amazon Music                  11,90'
        const match2 = line2.match(regex)
        expect(match2).not.toBeNull()
        expect(match2?.[2].trim()).toBe('Amazon Music')

        // With thousand separator
        const line3 = '15/01   COMPRA GRANDE                1.234,56'
        const match3 = line3.match(regex)
        expect(match3).not.toBeNull()
        expect(match3?.[3]).toBe('1.234,56')
    })

    it('should match transaction line regex for extrato format', () => {
        const regex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?[\d.]+,\d{2})\s+([-]?[\d.]+,\d{2})/

        const line = '03/12/2025  PIX ENVIADO    -100,00    900,00'
        const match = line.match(regex)
        expect(match).not.toBeNull()
        expect(match?.[1]).toBe('03/12/2025')
        expect(match?.[2].trim()).toBe('PIX ENVIADO')
        expect(match?.[3]).toBe('-100,00')
        expect(match?.[4]).toBe('900,00')
    })

    it('should parse Brazilian number format correctly', () => {
        const parseValue = (s: string) => parseFloat(s.replace(/\./g, '').replace(',', '.'))

        expect(parseValue('175,02')).toBe(175.02)
        expect(parseValue('1.234,56')).toBe(1234.56)
        expect(parseValue('-100,00')).toBe(-100.00)
        expect(parseValue('10.000,00')).toBe(10000.00)
    })

    it('should extract parcela info from description', () => {
        const parcelaRegex = /\s+(\d{2}\/\d{2})$/

        expect('DI GASPI LJ 19 03/04'.match(parcelaRegex)?.[1]).toBe('03/04')
        expect('SOMPO *Parcela*4-6'.match(parcelaRegex)).toBeNull()
        expect('PG *COSMETICOGOLD 01/02'.match(parcelaRegex)?.[1]).toBe('01/02')
    })
})
