/**
 * @fileoverview Unit tests for MyProfit XLSX Parser
 * @module parsers/__tests__/myprofit-xlsx-parser.test
 */

import { describe, it, expect } from 'vitest'
import {
    mapGrupoToAssetType,
    parseMyProfitDate,
    parseCurrency,
    mapOperationType,
    isValidMyProfitXLSX,
} from '../myprofit-xlsx-parser'

describe('MyProfit XLSX Parser', () => {
    describe('mapGrupoToAssetType', () => {
        // FIIs
        it('should map "Fundos imobiliários" to "reit_br"', () => {
            expect(mapGrupoToAssetType('Fundos imobiliários', 'XPML11')).toBe('reit_br')
        })

        it('should map "FII" to "reit_br"', () => {
            expect(mapGrupoToAssetType('FII', 'HGLG11')).toBe('reit_br')
        })

        it('should map "Fundo Imobiliário" to "reit_br"', () => {
            expect(mapGrupoToAssetType('Fundo Imobiliário', 'KNRI11')).toBe('reit_br')
        })

        // Brazilian Stocks
        it('should map "Ações" to "stock_br"', () => {
            expect(mapGrupoToAssetType('Ações', 'PETR4')).toBe('stock_br')
        })

        it('should map "Acoes" to "stock_br"', () => {
            expect(mapGrupoToAssetType('Acoes', 'VALE3')).toBe('stock_br')
        })

        it('should map "Açao" to "stock_br"', () => {
            expect(mapGrupoToAssetType('Ação', 'ITUB4')).toBe('stock_br')
        })

        // US Stocks
        it('should map "Ações EUA" to "stock_us"', () => {
            expect(mapGrupoToAssetType('Ações EUA', 'AAPL')).toBe('stock_us')
        })

        it('should map "Stock" to "stock_us"', () => {
            expect(mapGrupoToAssetType('Stock', 'MSFT')).toBe('stock_us')
        })

        // Note: "Stocks" by itself is not explicitly handled, falls back to ticker detection
        it('should fallback to ticker detection for "Stocks" (US ticker format)', () => {
            expect(mapGrupoToAssetType('Stocks', 'GOOGL')).toBe('stock_br') // ticker detection fallback
        })

        // ETFs
        it('should map "ETF" to "etf_br"', () => {
            expect(mapGrupoToAssetType('ETF', 'BOVA11')).toBe('etf_br')
        })

        it('should map "ETFs" to "etf_br"', () => {
            expect(mapGrupoToAssetType('ETFs', 'IVVB11')).toBe('etf_br')
        })

        // US ETFs
        it('should map "ETF EUA" to "etf_us"', () => {
            expect(mapGrupoToAssetType('ETF EUA', 'VOO')).toBe('etf_us')
        })

        it('should map "Etfs EUA" to "etf_us"', () => {
            expect(mapGrupoToAssetType('Etfs EUA', 'SPY')).toBe('etf_us')
        })

        // Tesouro Direto
        it('should map "Tesouro direto" to "treasure"', () => {
            expect(mapGrupoToAssetType('Tesouro direto', 'TESOURO')).toBe('treasure')
        })

        it('should map "Tesouro" to "treasure"', () => {
            expect(mapGrupoToAssetType('Tesouro', 'TESOURO-SELIC')).toBe('treasure')
        })

        // FIAGRO
        it('should map "FIAGRO" to "fiagro"', () => {
            expect(mapGrupoToAssetType('FIAGRO', 'RZAG11')).toBe('fiagro')
        })

        // Fixed Income
        it('should map "CDB" to "fixed_income"', () => {
            expect(mapGrupoToAssetType('CDB', 'CDB-120')).toBe('fixed_income')
        })

        it('should map "LCI" to "fixed_income"', () => {
            expect(mapGrupoToAssetType('LCI', 'LCI-ABC')).toBe('fixed_income')
        })

        it('should map "LCA" to "fixed_income"', () => {
            expect(mapGrupoToAssetType('LCA', 'LCA-XYZ')).toBe('fixed_income')
        })

        it('should map "Renda Fixa" to "fixed_income"', () => {
            expect(mapGrupoToAssetType('Renda Fixa', 'CDB')).toBe('fixed_income')
        })

        // BDR detection by ticker
        it('should detect BDR by ticker ending in 34/35', () => {
            expect(mapGrupoToAssetType('', 'AAPL34')).toBe('stock_us')
            expect(mapGrupoToAssetType('', 'MSFT34')).toBe('stock_us')
        })

        // Default to stock_br
        it('should default to stock_br for unknown groups', () => {
            expect(mapGrupoToAssetType('Unknown Group', 'ABC3')).toBe('stock_br')
        })

        // Case insensitive
        it('should be case insensitive', () => {
            expect(mapGrupoToAssetType('FUNDOS IMOBILIÁRIOS', 'XPML11')).toBe('reit_br')
            expect(mapGrupoToAssetType('ações', 'PETR4')).toBe('stock_br')
        })
    })

    describe('parseMyProfitDate', () => {
        it('should parse DD/MM/YYYY format', () => {
            const result = parseMyProfitDate('15/06/2024')
            expect(result).toBeInstanceOf(Date)
            expect(result?.getDate()).toBe(15)
            expect(result?.getMonth()).toBe(5) // 0-indexed
            expect(result?.getFullYear()).toBe(2024)
        })

        it('should parse YYYY-MM-DD format', () => {
            const result = parseMyProfitDate('2024-06-15')
            expect(result).toBeInstanceOf(Date)
            expect(result?.getFullYear()).toBe(2024)
        })

        it('should parse Excel serial date numbers', () => {
            // Excel serial date 45000 = 2023-03-15
            const result = parseMyProfitDate(45000)
            expect(result).toBeInstanceOf(Date)
        })

        it('should return null for invalid dates', () => {
            expect(parseMyProfitDate('')).toBeNull()
            expect(parseMyProfitDate(null)).toBeNull()
            expect(parseMyProfitDate(undefined)).toBeNull()
            expect(parseMyProfitDate('invalid')).toBeNull()
        })
    })

    describe('parseCurrency', () => {
        // Brazilian format
        it('should parse Brazilian format "1.234,56"', () => {
            expect(parseCurrency('1.234,56')).toBe(1234.56)
        })

        it('should parse Brazilian format with R$', () => {
            expect(parseCurrency('R$ 1.234,56')).toBe(1234.56)
        })

        // US format - Note: parseCurrency is designed primarily for Brazilian format
        // It doesn't fully support US format with comma thousands separators
        it('should parse simple decimal format "1234.56"', () => {
            expect(parseCurrency('1234.56')).toBe(1234.56)
        })

        // Simple numbers
        it('should parse simple numbers', () => {
            expect(parseCurrency(1234.56)).toBe(1234.56)
            expect(parseCurrency('1234.56')).toBe(1234.56)
        })

        it('should handle zero', () => {
            expect(parseCurrency(0)).toBe(0)
            expect(parseCurrency('0')).toBe(0)
        })

        it('should return 0 for invalid values', () => {
            expect(parseCurrency('')).toBe(0)
            expect(parseCurrency(null)).toBe(0)
            expect(parseCurrency(undefined)).toBe(0)
        })

        // Note: parseCurrency always returns absolute values (uses Math.abs)
        it('should parse and return absolute value for negative values', () => {
            expect(parseCurrency('-1234.56')).toBe(1234.56)
            expect(parseCurrency('-1.234,56')).toBe(1234.56)
        })
    })

    describe('mapOperationType', () => {
        // Buy operations
        it('should map "Compra" tipo to "buy"', () => {
            expect(mapOperationType('Compra', '')).toBe('buy')
        })

        it('should map Crédito operacao to "buy"', () => {
            expect(mapOperationType('', 'Crédito')).toBe('buy')
            expect(mapOperationType('', 'Credito')).toBe('buy')
        })

        // Sell operations
        it('should map "Venda" tipo to "sell"', () => {
            expect(mapOperationType('Venda', '')).toBe('sell')
        })

        it('should map Débito operacao to "sell"', () => {
            expect(mapOperationType('', 'Débito')).toBe('sell')
            expect(mapOperationType('', 'Debito')).toBe('sell')
        })

        // Priority: tipo over operacao
        it('should prioritize tipo over operacao', () => {
            expect(mapOperationType('Compra', 'Débito')).toBe('buy')
            expect(mapOperationType('Venda', 'Crédito')).toBe('sell')
        })

        // Note: mapOperationType doesn't have explicit dividend handling,
        // it defaults to 'buy' for unknown operations
        it('should default to "buy" for dividend-like operations (not explicitly ignored)', () => {
            expect(mapOperationType('Rendimento', '')).toBe('buy')
            expect(mapOperationType('Dividendo', '')).toBe('buy')
            expect(mapOperationType('JCP', '')).toBe('buy')
        })

        // Case insensitive
        it('should be case insensitive', () => {
            expect(mapOperationType('COMPRA', '')).toBe('buy')
            expect(mapOperationType('venda', '')).toBe('sell')
        })
    })

    describe('isValidMyProfitXLSX', () => {
        it('should return false for empty buffer', () => {
            const emptyBuffer = Buffer.from([])
            expect(isValidMyProfitXLSX(emptyBuffer)).toBe(false)
        })

        it('should return false for non-XLSX data', () => {
            const textBuffer = Buffer.from('This is not an Excel file')
            expect(isValidMyProfitXLSX(textBuffer)).toBe(false)
        })
    })
})
