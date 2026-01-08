/**
 * @fileoverview Unit tests for B3 XLSX Parser
 * @module parsers/__tests__/b3-xlsx-parser.test
 */

import { describe, it, expect } from 'vitest'
import {
    extractTickerFromProduct,
    mapMovementToType,
    detectAssetType,
} from '../b3-xlsx-parser'

describe('B3 XLSX Parser', () => {
    describe('extractTickerFromProduct', () => {
        it('should extract ticker from "TICKER - NAME" format', () => {
            const result = extractTickerFromProduct('XPML11 - XP MALLS FUNDO DE INVESTIMENTO IMOBILIARIO')
            expect(result.ticker).toBe('XPML11')
            expect(result.name).toBe('XP MALLS FUNDO DE INVESTIMENTO IMOBILIARIO')
        })

        it('should extract ticker from stock format', () => {
            const result = extractTickerFromProduct('PETR4 - PETROLEO BRASILEIRO S.A.')
            expect(result.ticker).toBe('PETR4')
            expect(result.name).toBe('PETROLEO BRASILEIRO S.A.')
        })

        it('should handle ticker-only input', () => {
            const result = extractTickerFromProduct('VALE3')
            expect(result.ticker).toBe('VALE3')
        })

        // Fixed income products - each gets unique ticker
        it('should generate unique ticker for Tesouro Selic', () => {
            const result = extractTickerFromProduct('Tesouro Selic 2026')
            expect(result.ticker).toBe('TESOURO-SELIC-2026')
            expect(result.name).toBe('Tesouro Selic 2026')
        })

        it('should generate unique ticker for Tesouro IPCA+', () => {
            const result = extractTickerFromProduct('Tesouro IPCA+ 2035')
            expect(result.ticker).toBe('TESOURO-IPCA-2035')
            expect(result.name).toBe('Tesouro IPCA+ 2035')
        })

        it('should generate unique ticker for Tesouro Prefixado', () => {
            const result = extractTickerFromProduct('Tesouro Prefixado 2025')
            expect(result.ticker).toBe('TESOURO-PREFIXADO-2025')
        })

        it('should generate unique ticker for LCI', () => {
            const result = extractTickerFromProduct('LCI - Banco ABC 2024')
            expect(result.ticker).toBe('LCI-BANCO-ABC-2024')
        })

        it('should generate unique ticker for CDB', () => {
            const result = extractTickerFromProduct('CDB 120% CDI')
            expect(result.ticker).toBe('CDB-120-CDI')
        })

        it('should handle empty input', () => {
            const result = extractTickerFromProduct('')
            expect(result.ticker).toBe('')
            expect(result.name).toBe('')
        })

        it('should uppercase ticker', () => {
            const result = extractTickerFromProduct('xpml11 - Test Fund')
            expect(result.ticker).toBe('XPML11')
        })
    })

    describe('mapMovementToType', () => {
        it('should map "Compra" to "buy"', () => {
            expect(mapMovementToType('Compra', 'Crédito')).toBe('buy')
        })

        it('should map "Venda" to "sell"', () => {
            expect(mapMovementToType('Venda', 'Débito')).toBe('sell')
        })

        it('should map "Rendimento" to "dividend"', () => {
            expect(mapMovementToType('Rendimento', 'Crédito')).toBe('dividend')
        })

        it('should map "Dividendo" to "dividend"', () => {
            expect(mapMovementToType('Dividendo', 'Crédito')).toBe('dividend')
        })

        it('should map "Juros sobre Capital Próprio" to "dividend"', () => {
            expect(mapMovementToType('Juros sobre Capital Próprio', 'Crédito')).toBe('dividend')
        })

        it('should map "JCP" to "dividend"', () => {
            expect(mapMovementToType('JCP', 'Crédito')).toBe('dividend')
        })

        it('should map "Transferência - Liquidação" with Crédito to "buy"', () => {
            expect(mapMovementToType('Transferência - Liquidação', 'Crédito')).toBe('buy')
        })

        it('should map "Transferência - Liquidação" with Débito to "sell"', () => {
            expect(mapMovementToType('Transferência - Liquidação', 'Débito')).toBe('sell')
        })

        it('should map "Resgate" to "sell"', () => {
            expect(mapMovementToType('Resgate', '')).toBe('sell')
        })

        it('should map "Amortização" to "dividend"', () => {
            expect(mapMovementToType('Amortização', 'Crédito')).toBe('dividend')
        })

        it('should default to "buy" for unknown movements with Crédito', () => {
            expect(mapMovementToType('Unknown Operation', 'Crédito')).toBe('buy')
        })

        it('should map any movement with Débito to "sell"', () => {
            expect(mapMovementToType('Compra', 'Débito')).toBe('sell')
            expect(mapMovementToType('Unknown', 'Debito')).toBe('sell')
        })

        it('should be case insensitive', () => {
            expect(mapMovementToType('COMPRA', 'CRÉDITO')).toBe('buy')
            expect(mapMovementToType('venda', 'DÉBITO')).toBe('sell')
            expect(mapMovementToType('RENDIMENTO', 'crédito')).toBe('dividend')
        })

        // New B3 movement types
        it('should map "Empréstimo" to "ignore"', () => {
            expect(mapMovementToType('Empréstimo', 'Crédito')).toBe('ignore')
            expect(mapMovementToType('Emprestimo', 'Débito')).toBe('ignore')
        })

        it('should map "Atualização" to "ignore"', () => {
            expect(mapMovementToType('Atualização', 'Crédito')).toBe('ignore')
        })

        it('should map "Leilão de Fração" to "sell"', () => {
            expect(mapMovementToType('Leilão de Fração', 'Crédito')).toBe('sell')
        })

        it('should map "Pagamento de juros" to "dividend"', () => {
            expect(mapMovementToType('PAGAMENTO DE JUROS', 'Crédito')).toBe('dividend')
        })

        it('should map "Compra/Venda" based on Entrada/Saída', () => {
            expect(mapMovementToType('COMPRA / VENDA', 'Crédito')).toBe('buy')
            expect(mapMovementToType('Compra/Venda', 'Débito')).toBe('sell')
        })

        it('should map "Vencimento" to "sell"', () => {
            expect(mapMovementToType('Vencimento/Resgate saldo em conta', '')).toBe('sell')
        })

        it('should map "Reembolso" to "dividend"', () => {
            expect(mapMovementToType('Reembolso', 'Crédito')).toBe('dividend')
        })

        it('should map "Fração em Ativos" to "buy"', () => {
            expect(mapMovementToType('Fração em Ativos', 'Crédito')).toBe('buy')
        })
    })

    describe('detectAssetType', () => {
        it('should detect FIIs (ending with 11)', () => {
            expect(detectAssetType('XPML11')).toBe('reit_br')
            expect(detectAssetType('HGLG11')).toBe('reit_br')
            expect(detectAssetType('KNRI11')).toBe('reit_br')
        })

        it('should detect Brazilian stocks', () => {
            expect(detectAssetType('PETR4')).toBe('stock_br')
            expect(detectAssetType('VALE3')).toBe('stock_br')
            expect(detectAssetType('ITUB4')).toBe('stock_br')
        })

        it('should detect BDRs as US exposure', () => {
            expect(detectAssetType('AAPL34')).toBe('stock_us')
            expect(detectAssetType('MSFT34')).toBe('stock_us')
        })

        it('should detect Brazilian ETFs', () => {
            expect(detectAssetType('IVVB11')).toBe('etf_br')
            expect(detectAssetType('BOVA11')).toBe('etf_br')
            expect(detectAssetType('HASH11')).toBe('etf_br')
        })

        // Fixed income types
        it('should detect Tesouro Direto with unique tickers', () => {
            expect(detectAssetType('TESOURO')).toBe('treasure')
            expect(detectAssetType('TESOURO-SELIC-2026')).toBe('treasure')
            expect(detectAssetType('TESOURO-IPCA-2035')).toBe('treasure')
            expect(detectAssetType('TESOURO-PREFIXADO-2025')).toBe('treasure')
        })

        it('should detect LCI/LCA/CDB as fixed income', () => {
            expect(detectAssetType('LCI-BANCO-ABC-2024')).toBe('fixed_income')
            expect(detectAssetType('LCA-BANCO-XYZ')).toBe('fixed_income')
            expect(detectAssetType('CDB-120-CDI')).toBe('fixed_income')
        })

        it('should detect CRI/CRA as fixed income', () => {
            expect(detectAssetType('CRI-EXAMPLE-2025')).toBe('fixed_income')
            expect(detectAssetType('CRA-AGRO-2026')).toBe('fixed_income')
        })

        it('should detect US stocks (2-4 letter tickers)', () => {
            expect(detectAssetType('AAPL')).toBe('stock_us')
            expect(detectAssetType('MSFT')).toBe('stock_us')
            expect(detectAssetType('VOO')).toBe('stock_us')
        })
    })
})

