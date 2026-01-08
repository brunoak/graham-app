/**
 * @fileoverview Unit tests for Status Invest XLSX Parser
 * @module parsers/__tests__/statusinvest-xlsx-parser.test
 */

import { describe, it, expect } from 'vitest'
import {
    mapCategoriaToAssetType,
    parseStatusInvestDate,
    parseBrazilianNumber,
    mapOperationType,
    cleanTicker,
    isValidStatusInvestXLSX,
} from '../statusinvest-xlsx-parser'

describe('Status Invest XLSX Parser', () => {
    describe('mapCategoriaToAssetType', () => {
        // FIIs
        it('should map "Fundos imobiliários" to "reit_br"', () => {
            expect(mapCategoriaToAssetType('Fundos imobiliários')).toBe('reit_br')
        })

        // Note: "FII" by itself is not matched, needs "fundo" and "imobili"
        it('should fallback to stock_br for plain "FII"', () => {
            expect(mapCategoriaToAssetType('FII')).toBe('stock_br')
        })

        it('should map "Fundo imobiliário" to "reit_br"', () => {
            expect(mapCategoriaToAssetType('Fundo imobiliário')).toBe('reit_br')
        })

        // Brazilian Stocks
        it('should map "Ações" to "stock_br"', () => {
            expect(mapCategoriaToAssetType('Ações')).toBe('stock_br')
        })

        it('should map "Ação" to "stock_br"', () => {
            expect(mapCategoriaToAssetType('Ação')).toBe('stock_br')
        })

        // ETFs Brazilian
        it('should map "ETF" to "etf_br"', () => {
            expect(mapCategoriaToAssetType('ETF')).toBe('etf_br')
        })

        it('should map "ETFs" to "etf_br"', () => {
            expect(mapCategoriaToAssetType('ETFs')).toBe('etf_br')
        })

        // Tesouro Direto
        it('should map "Tesouro direto" to "treasure"', () => {
            expect(mapCategoriaToAssetType('Tesouro direto')).toBe('treasure')
        })

        it('should map "Tesouro" to "treasure"', () => {
            expect(mapCategoriaToAssetType('Tesouro')).toBe('treasure')
        })

        // Fixed Income
        it('should map "CDB" to "fixed_income"', () => {
            expect(mapCategoriaToAssetType('CDB')).toBe('fixed_income')
        })

        it('should map "LCI" to "fixed_income"', () => {
            expect(mapCategoriaToAssetType('LCI')).toBe('fixed_income')
        })

        it('should map "LCA" to "fixed_income"', () => {
            expect(mapCategoriaToAssetType('LCA')).toBe('fixed_income')
        })

        it('should map "Renda Fixa" to "fixed_income"', () => {
            expect(mapCategoriaToAssetType('Renda Fixa')).toBe('fixed_income')
        })

        // BDRs
        it('should map "BDR" to "stock_us"', () => {
            expect(mapCategoriaToAssetType('BDR')).toBe('stock_us')
        })

        it('should map "BDRs" to "stock_us"', () => {
            expect(mapCategoriaToAssetType('BDRs')).toBe('stock_us')
        })

        // FIAGRO
        it('should map "FIAGRO" to "fiagro"', () => {
            expect(mapCategoriaToAssetType('FIAGRO')).toBe('fiagro')
        })

        // Default
        it('should default to stock_br for unknown categories', () => {
            expect(mapCategoriaToAssetType('Unknown Category')).toBe('stock_br')
        })

        // Case insensitive
        it('should be case insensitive', () => {
            expect(mapCategoriaToAssetType('FUNDOS IMOBILIÁRIOS')).toBe('reit_br')
            expect(mapCategoriaToAssetType('ações')).toBe('stock_br')
            expect(mapCategoriaToAssetType('etf')).toBe('etf_br')
        })
    })

    describe('parseStatusInvestDate', () => {
        it('should parse DD/MM/YYYY format', () => {
            const result = parseStatusInvestDate('15/06/2024')
            expect(result).toBeInstanceOf(Date)
            expect(result?.getDate()).toBe(15)
            expect(result?.getMonth()).toBe(5) // 0-indexed
            expect(result?.getFullYear()).toBe(2024)
        })

        it('should parse YYYY-MM-DD format', () => {
            const result = parseStatusInvestDate('2024-06-15')
            expect(result).toBeInstanceOf(Date)
            expect(result?.getFullYear()).toBe(2024)
        })

        it('should parse Excel serial date numbers', () => {
            // Excel serial date 45000 = 2023-03-15
            const result = parseStatusInvestDate(45000)
            expect(result).toBeInstanceOf(Date)
        })

        it('should return null for invalid dates', () => {
            expect(parseStatusInvestDate('')).toBeNull()
            expect(parseStatusInvestDate(null)).toBeNull()
            expect(parseStatusInvestDate(undefined)).toBeNull()
            expect(parseStatusInvestDate('invalid')).toBeNull()
        })
    })

    describe('parseBrazilianNumber', () => {
        it('should parse Brazilian format "1.234,56"', () => {
            expect(parseBrazilianNumber('1.234,56')).toBe(1234.56)
        })

        it('should parse with R$ prefix', () => {
            expect(parseBrazilianNumber('R$ 1.234,56')).toBe(1234.56)
        })

        it('should parse simple numbers', () => {
            expect(parseBrazilianNumber(1234.56)).toBe(1234.56)
            expect(parseBrazilianNumber('1234,56')).toBe(1234.56)
        })

        it('should handle zero', () => {
            expect(parseBrazilianNumber(0)).toBe(0)
            expect(parseBrazilianNumber('0')).toBe(0)
        })

        it('should return 0 for invalid values', () => {
            expect(parseBrazilianNumber('')).toBe(0)
            expect(parseBrazilianNumber(null)).toBe(0)
            expect(parseBrazilianNumber(undefined)).toBe(0)
        })

        // Note: parseBrazilianNumber always returns absolute values (uses Math.abs)
        it('should parse and return absolute value for negative values', () => {
            expect(parseBrazilianNumber('-1.234,56')).toBe(1234.56)
        })

        it('should parse large numbers', () => {
            expect(parseBrazilianNumber('1.234.567,89')).toBe(1234567.89)
        })
    })

    describe('mapOperationType', () => {
        it('should map "C" to "buy"', () => {
            expect(mapOperationType('C')).toBe('buy')
        })

        it('should map "Compra" to "buy"', () => {
            expect(mapOperationType('Compra')).toBe('buy')
        })

        it('should map "V" to "sell"', () => {
            expect(mapOperationType('V')).toBe('sell')
        })

        it('should map "Venda" to "sell"', () => {
            expect(mapOperationType('Venda')).toBe('sell')
        })

        it('should default to "buy" for unknown values', () => {
            expect(mapOperationType('')).toBe('buy')
            expect(mapOperationType('Unknown')).toBe('buy')
        })

        it('should be case insensitive', () => {
            expect(mapOperationType('c')).toBe('buy')
            expect(mapOperationType('v')).toBe('sell')
            expect(mapOperationType('COMPRA')).toBe('buy')
            expect(mapOperationType('VENDA')).toBe('sell')
        })
    })

    describe('cleanTicker', () => {
        it('should keep regular tickers unchanged', () => {
            expect(cleanTicker('PETR4')).toBe('PETR4')
            expect(cleanTicker('VALE3')).toBe('VALE3')
            expect(cleanTicker('XPML11')).toBe('XPML11')
        })

        it('should remove F suffix from fractional tickers', () => {
            expect(cleanTicker('PETR4F')).toBe('PETR4')
            expect(cleanTicker('VALE3F')).toBe('VALE3')
        })

        it('should uppercase tickers', () => {
            expect(cleanTicker('petr4')).toBe('PETR4')
            expect(cleanTicker('vale3f')).toBe('VALE3')
        })

        it('should trim whitespace', () => {
            expect(cleanTicker(' PETR4 ')).toBe('PETR4')
            expect(cleanTicker('  VALE3F  ')).toBe('VALE3')
        })

        it('should handle empty input', () => {
            expect(cleanTicker('')).toBe('')
        })
    })

    describe('isValidStatusInvestXLSX', () => {
        it('should return false for empty buffer', () => {
            const emptyBuffer = Buffer.from([])
            expect(isValidStatusInvestXLSX(emptyBuffer)).toBe(false)
        })

        it('should return false for non-XLSX data', () => {
            const textBuffer = Buffer.from('This is not an Excel file')
            expect(isValidStatusInvestXLSX(textBuffer)).toBe(false)
        })
    })
})
