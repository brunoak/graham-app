/**
 * @fileoverview MyProfit XLSX Parser - Parses Excel files exported from MyProfit
 * 
 * MyProfit is a popular Brazilian portfolio management app that consolidates
 * investments from multiple brokers. This parser handles the exported Excel files.
 * 
 * @module parsers/myprofit-xlsx-parser
 * @see https://myprofitweb.com
 */

import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { AssetType } from '@/lib/schemas/investment-schema'
import { detectAssetType } from './b3-xlsx-parser'

// ============================================
// Types & Schemas
// ============================================

/**
 * Zod schema for a single MyProfit operation.
 */
export const MyProfitOperationSchema = z.object({
    /** Date of the operation */
    date: z.date(),
    /** Type of operation: buy, sell */
    type: z.enum(['buy', 'sell']),
    /** Ticker symbol */
    ticker: z.string().min(1),
    /** Full asset name (Grupo column) */
    name: z.string(),
    /** Asset type for categorization */
    assetType: z.string(),
    /** Number of shares/units */
    quantity: z.number().nonnegative(),
    /** Price per unit (with fees) */
    price: z.number().nonnegative(),
    /** Total value of the operation (with fees) */
    total: z.number().nonnegative(),
    /** Currency: BRL or USD */
    currency: z.string(),
    /** Brokerage institution */
    institution: z.string().optional(),
})

export type MyProfitOperation = z.infer<typeof MyProfitOperationSchema>

/**
 * Result of parsing a MyProfit XLSX file.
 */
export interface MyProfitParseResult {
    /** Successfully parsed operations */
    operations: MyProfitOperation[]
    /** Number of successful parses */
    successCount: number
    /** Number of errors encountered */
    errorCount: number
    /** Error messages */
    errors: string[]
    /** Date range of operations */
    dateRange?: {
        start: Date
        end: Date
    }
}

// ============================================
// Column Mapping
// ============================================

/**
 * Expected column headers in MyProfit Excel file (Portuguese).
 * MyProfit columns:
 * - Data de Negociação: Trade date
 * - Instituição: Broker (Rico, XP, Avenue, etc.)
 * - Número: Document number
 * - Documento: Document type (Nota de corretagem)
 * - Moeda: Currency (BRL, USD)
 * - Total de Taxas: Total fees
 * - Ativo: Ticker (JSRE11, AAPL, etc.)
 * - Grupo: Asset type description (Fundo Imobiliário, Ações EUA, etc.)
 * - Quantidade: Quantity
 * - Operação: Débito/Crédito
 * - Tipo: Operation type (Compra, Venda)
 * - Preço sem Taxas: Price without fees
 * - Preço com Taxas: Price with fees
 * - Total sem Taxas: Total without fees
 * - Total com Taxas: Total with fees
 */
const MYPROFIT_COLUMNS = {
    data: ['data de negociação', 'data de negociacao', 'data'],
    instituicao: ['instituição', 'instituicao', 'corretora'],
    moeda: ['moeda', 'currency'],
    ativo: ['ativo', 'ticker', 'símbolo', 'simbolo'],
    grupo: ['grupo', 'tipo de ativo', 'asset type'],
    quantidade: ['quantidade', 'qtd', 'qtde'],
    operacao: ['operação', 'operacao'],
    tipo: ['tipo'],
    precoComTaxas: ['preço com taxas', 'preco com taxas', 'preço c/ taxas'],
    totalComTaxas: ['total com taxas', 'total c/ taxas'],
} as const

/**
 * Maps MyProfit "Grupo" to internal asset type.
 */
function mapGrupoToAssetType(grupo: string, ticker: string): AssetType {
    const lower = grupo.toLowerCase()

    if (lower.includes('fundo imobiliário') || lower.includes('fii')) {
        return 'reit_br'
    }
    if (lower.includes('ações eua') || lower.includes('acoes eua') || lower.includes('stocks usa')) {
        return 'stock_us'
    }
    if (lower.includes('tesouro')) {
        return 'treasure'
    }
    if (lower.includes('etf')) {
        return lower.includes('eua') || lower.includes('usa') ? 'etf_us' : 'etf_br'
    }
    if (lower.includes('reit')) {
        return 'reit_us'
    }
    if (lower.includes('bdr')) {
        return 'stock_us'
    }
    if (lower.includes('ações') || lower.includes('acoes')) {
        return 'stock_br'
    }
    if (lower.includes('fiagro')) {
        return 'fiagro'
    }
    if (lower.includes('cdb') || lower.includes('lci') || lower.includes('lca')) {
        return 'fixed_income'
    }

    // Fallback to detection by ticker
    return detectAssetType(ticker)
}

/**
 * Parses date from MyProfit Excel.
 */
function parseMyProfitDate(value: any): Date | null {
    if (!value) return null

    // Excel serial date number
    if (typeof value === 'number') {
        const excelEpoch = new Date(1899, 11, 30)
        return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
    }

    const str = String(value).trim()

    // DD/MM/YYYY format
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (brMatch) {
        return new Date(
            parseInt(brMatch[3]),
            parseInt(brMatch[2]) - 1,
            parseInt(brMatch[1])
        )
    }

    // YYYY-MM-DD format
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
        return new Date(
            parseInt(isoMatch[1]),
            parseInt(isoMatch[2]) - 1,
            parseInt(isoMatch[3])
        )
    }

    return null
}

/**
 * Parses currency value (handles both BRL and USD formats).
 */
function parseCurrency(value: any): number {
    if (typeof value === 'number') return Math.abs(value)
    if (!value) return 0

    let str = String(value).trim()

    // Remove currency symbols
    str = str.replace(/^(R\$|US\$|\$)\s*/i, '').trim()

    // Handle Brazilian format: 1.234,56
    if (str.includes(',') && str.includes('.')) {
        // Brazilian: dots as thousands, comma as decimal
        str = str.replace(/\./g, '').replace(',', '.')
    } else if (str.includes(',') && !str.includes('.')) {
        // Just comma as decimal
        str = str.replace(',', '.')
    }

    // Remove any remaining non-numeric except . and -
    str = str.replace(/[^\d.\-]/g, '')

    return Math.abs(parseFloat(str) || 0)
}

/**
 * Finds column index by trying multiple header names.
 */
function findColumnIndex(headers: string[], possibleNames: readonly string[]): number {
    const normalizedHeaders = headers.map(h => h?.toLowerCase().trim() || '')

    for (const name of possibleNames) {
        const index = normalizedHeaders.indexOf(name.toLowerCase())
        if (index >= 0) return index
    }

    // Try partial match
    for (const name of possibleNames) {
        const index = normalizedHeaders.findIndex(h => h.includes(name.toLowerCase()))
        if (index >= 0) return index
    }

    return -1
}

/**
 * Maps operation type from MyProfit columns.
 */
function mapOperationType(tipo: string, operacao: string): 'buy' | 'sell' | 'ignore' {
    const lowerTipo = tipo.toLowerCase().trim()
    const lowerOperacao = operacao.toLowerCase().trim()

    // Explicit buy/sell from Tipo column
    if (lowerTipo.includes('compra') || lowerTipo === 'buy') {
        return 'buy'
    }
    if (lowerTipo.includes('venda') || lowerTipo === 'sell') {
        return 'sell'
    }

    // Fallback to Operação column (Débito = sell, Crédito = buy)
    if (lowerOperacao.includes('débito') || lowerOperacao.includes('debito')) {
        return 'sell'
    }
    if (lowerOperacao.includes('crédito') || lowerOperacao.includes('credito')) {
        return 'buy'
    }

    // Default to buy if unclear
    return 'buy'
}

// ============================================
// Main Parser
// ============================================

/**
 * Parses a MyProfit Excel file and extracts investment operations.
 * 
 * @param buffer - The file buffer (XLSX format)
 * @returns Parse result with operations, counts, and errors
 */
export async function parseMyProfitXLSX(buffer: Buffer | ArrayBuffer): Promise<MyProfitParseResult> {
    const operations: MyProfitOperation[] = []
    const errors: string[] = []

    try {
        // Read workbook
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        console.log('[MyProfit Parser] Sheets found:', workbook.SheetNames)

        // Use first sheet
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]

        if (!sheet) {
            return {
                operations: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Arquivo Excel vazio ou inválido.']
            }
        }

        // Convert to JSON array
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
            header: 1,
            defval: ''
        })

        if (data.length < 2) {
            return {
                operations: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Arquivo não contém dados suficientes.']
            }
        }

        // Find header row (first row with recognizable columns)
        let headerRowIndex = 0
        let headers: string[] = []

        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i] as string[]
            const headerStr = row.join(' ').toLowerCase()

            if (headerStr.includes('data de negociação') ||
                headerStr.includes('data de negociacao') ||
                (headerStr.includes('ativo') && headerStr.includes('quantidade'))) {
                headerRowIndex = i
                headers = row.map(h => String(h || '').trim())
                break
            }
        }

        console.log('[MyProfit Parser] Headers:', headers)

        // Find column indices
        const cols = {
            data: findColumnIndex(headers, MYPROFIT_COLUMNS.data),
            instituicao: findColumnIndex(headers, MYPROFIT_COLUMNS.instituicao),
            moeda: findColumnIndex(headers, MYPROFIT_COLUMNS.moeda),
            ativo: findColumnIndex(headers, MYPROFIT_COLUMNS.ativo),
            grupo: findColumnIndex(headers, MYPROFIT_COLUMNS.grupo),
            quantidade: findColumnIndex(headers, MYPROFIT_COLUMNS.quantidade),
            operacao: findColumnIndex(headers, MYPROFIT_COLUMNS.operacao),
            tipo: findColumnIndex(headers, MYPROFIT_COLUMNS.tipo),
            precoComTaxas: findColumnIndex(headers, MYPROFIT_COLUMNS.precoComTaxas),
            totalComTaxas: findColumnIndex(headers, MYPROFIT_COLUMNS.totalComTaxas),
        }

        console.log('[MyProfit Parser] Column indices:', cols)

        // Validate required columns
        if (cols.ativo < 0) {
            return {
                operations: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Coluna "Ativo" não encontrada. Verifique se o arquivo é do MyProfit.']
            }
        }

        // Process data rows
        let minDate: Date | null = null
        let maxDate: Date | null = null

        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i] as any[]

            try {
                // Skip empty rows
                const ticker = String(row[cols.ativo] || '').trim().toUpperCase()
                if (!ticker) continue

                // Parse date
                const dateValue = cols.data >= 0 ? row[cols.data] : null
                const date = parseMyProfitDate(dateValue)

                if (!date) {
                    errors.push(`Linha ${i + 1}: Data inválida "${dateValue}"`)
                    continue
                }

                // Track date range
                if (!minDate || date < minDate) minDate = date
                if (!maxDate || date > maxDate) maxDate = date

                // Get operation type
                const tipo = cols.tipo >= 0 ? String(row[cols.tipo] || '').trim() : ''
                const operacao = cols.operacao >= 0 ? String(row[cols.operacao] || '').trim() : ''
                const opType = mapOperationType(tipo, operacao)

                if (opType === 'ignore') continue

                // Get currency
                const moeda = cols.moeda >= 0
                    ? String(row[cols.moeda] || 'BRL').trim().toUpperCase()
                    : 'BRL'
                const currency = moeda === 'USD' ? 'USD' : 'BRL'

                // Get asset type from Grupo
                const grupo = cols.grupo >= 0 ? String(row[cols.grupo] || '').trim() : ''
                const assetType = mapGrupoToAssetType(grupo, ticker)

                // Parse numeric values
                const quantidade = cols.quantidade >= 0
                    ? parseCurrency(row[cols.quantidade])
                    : 0

                const precoComTaxas = cols.precoComTaxas >= 0
                    ? parseCurrency(row[cols.precoComTaxas])
                    : 0

                const totalComTaxas = cols.totalComTaxas >= 0
                    ? parseCurrency(row[cols.totalComTaxas])
                    : quantidade * precoComTaxas

                // Get institution
                const instituicao = cols.instituicao >= 0
                    ? String(row[cols.instituicao] || '').trim()
                    : undefined

                // Skip zero quantity operations
                if (quantidade === 0) continue

                // Create operation
                const operation: MyProfitOperation = {
                    date,
                    type: opType,
                    ticker,
                    name: grupo || '',
                    assetType,
                    quantity: quantidade,
                    price: precoComTaxas,
                    total: Math.abs(totalComTaxas),
                    currency,
                    institution: instituicao,
                }

                // Validate
                const validation = MyProfitOperationSchema.safeParse(operation)
                if (!validation.success) {
                    errors.push(`Linha ${i + 1}: ${validation.error.issues[0]?.message}`)
                    continue
                }

                operations.push(operation)

            } catch (err: any) {
                errors.push(`Linha ${i + 1}: ${err.message}`)
            }
        }

        return {
            operations,
            successCount: operations.length,
            errorCount: errors.length,
            errors,
            dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : undefined
        }

    } catch (err: any) {
        return {
            operations: [],
            successCount: 0,
            errorCount: 1,
            errors: [`Erro ao ler arquivo Excel: ${err.message}`]
        }
    }
}

/**
 * Validates that a buffer is a valid MyProfit XLSX file.
 */
export function isValidMyProfitXLSX(buffer: Buffer | ArrayBuffer): boolean {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        if (workbook.SheetNames.length === 0) return false

        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!sheet) return false

        // Check for MyProfit-specific headers
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 })
        const allText = data.slice(0, 10).flat().join(' ').toLowerCase()

        return allText.includes('data de negociação') ||
            allText.includes('data de negociacao') ||
            (allText.includes('ativo') && allText.includes('grupo') && allText.includes('quantidade'))

    } catch {
        return false
    }
}
