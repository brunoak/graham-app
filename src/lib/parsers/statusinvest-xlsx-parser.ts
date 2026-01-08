/**
 * @fileoverview Status Invest XLSX Parser - Parses Excel files from Status Invest
 * 
 * Status Invest is a popular Brazilian investment platform that allows users
 * to track their portfolios. This parser handles the exported transaction files.
 * 
 * @module parsers/statusinvest-xlsx-parser
 * @see https://statusinvest.com.br
 */

import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { AssetType } from '@/lib/schemas/investment-schema'

// ============================================
// Types & Schemas
// ============================================

/**
 * Zod schema for a single Status Invest operation.
 */
export const StatusInvestOperationSchema = z.object({
    /** Date of the operation */
    date: z.date(),
    /** Type of operation: buy, sell */
    type: z.enum(['buy', 'sell']),
    /** Ticker symbol */
    ticker: z.string().min(1),
    /** Category (Ações, Fundos imobiliários, ETF, etc.) */
    category: z.string(),
    /** Asset type for categorization */
    assetType: z.string(),
    /** Number of shares/units */
    quantity: z.number().nonnegative(),
    /** Price per unit */
    price: z.number().nonnegative(),
    /** Total value of the operation */
    total: z.number().nonnegative(),
    /** Currency: always BRL for Status Invest */
    currency: z.literal('BRL'),
    /** Brokerage institution */
    institution: z.string().optional(),
    /** Brokerage fees */
    fees: z.number().optional(),
})

export type StatusInvestOperation = z.infer<typeof StatusInvestOperationSchema>

/**
 * Result of parsing a Status Invest XLSX file.
 */
export interface StatusInvestParseResult {
    /** Successfully parsed operations */
    operations: StatusInvestOperation[]
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
 * Expected column headers in Status Invest Excel file.
 * Columns:
 * - Data operação: Trade date
 * - Categoria: Asset category (Ações, Fundos imobiliários, ETF, Tesouro direto)
 * - Código Ativo: Ticker
 * - Operação C/V: C = Compra (buy), V = Venda (sell)
 * - Quantidade: Quantity
 * - Preço unitário: Unit price
 * - Corretora: Broker
 * - Corretage Taxas: Brokerage fees
 * - Impostos: Taxes
 * - IRRF: Withholding tax
 */
const STATUSINVEST_COLUMNS = {
    data: ['data operação', 'data operacao', 'data'],
    categoria: ['categoria', 'category', 'tipo'],
    ticker: ['código ativo', 'codigo ativo', 'código', 'codigo', 'ticker', 'ativo'],
    operacao: ['operação c/v', 'operacao c/v', 'operação', 'operacao', 'c/v'],
    quantidade: ['quantidade', 'qtd', 'qtde'],
    preco: ['preço unitário', 'preco unitario', 'preço', 'preco', 'valor'],
    corretora: ['corretora', 'broker', 'instituição', 'instituicao'],
    taxas: ['corretage taxas', 'taxas', 'corretagem'],
} as const

/**
 * Maps Status Invest "Categoria" to internal asset type.
 */
function mapCategoriaToAssetType(categoria: string): AssetType {
    const lower = categoria.toLowerCase()

    if (lower.includes('fundo') && lower.includes('imobili')) {
        return 'reit_br'
    }
    if (lower.includes('tesouro')) {
        return 'treasure'
    }
    if (lower.includes('etf')) {
        return 'etf_br'
    }
    if (lower.includes('fiagro')) {
        return 'fiagro'
    }
    if (lower.includes('ação') || lower.includes('acao') || lower.includes('ações') || lower.includes('acoes')) {
        return 'stock_br'
    }
    if (lower.includes('bdr')) {
        return 'stock_us'
    }
    if (lower.includes('cdb') || lower.includes('lci') || lower.includes('lca') || lower.includes('renda fixa')) {
        return 'fixed_income'
    }

    // Default to stock
    return 'stock_br'
}

/**
 * Parses date from Status Invest Excel.
 */
function parseStatusInvestDate(value: any): Date | null {
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
 * Parses currency value (Brazilian format).
 */
function parseBrazilianNumber(value: any): number {
    if (typeof value === 'number') return Math.abs(value)
    if (!value) return 0

    let str = String(value).trim()

    // Remove currency symbols
    str = str.replace(/^R\$\s*/i, '').trim()

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
 * Maps operation type from Status Invest "Operação C/V" column.
 * C = Compra (Buy), V = Venda (Sell)
 */
function mapOperationType(operacao: string): 'buy' | 'sell' {
    const lower = operacao.toLowerCase().trim()

    if (lower === 'v' || lower.includes('venda') || lower.includes('sell')) {
        return 'sell'
    }

    // Default to buy (C = Compra)
    return 'buy'
}

/**
 * Cleans ticker symbol (removes unnecessary suffixes like F for fractional).
 */
function cleanTicker(ticker: string): string {
    let clean = ticker.trim().toUpperCase()

    // Remove fractional marker (e.g., PETR4F -> PETR4)
    if (clean.endsWith('F') && clean.length > 5) {
        clean = clean.slice(0, -1)
    }

    return clean
}

// ============================================
// Main Parser
// ============================================

/**
 * Parses a Status Invest Excel file and extracts investment operations.
 * 
 * @param buffer - The file buffer (XLSX format)
 * @returns Parse result with operations, counts, and errors
 */
export async function parseStatusInvestXLSX(buffer: Buffer | ArrayBuffer): Promise<StatusInvestParseResult> {
    const operations: StatusInvestOperation[] = []
    const errors: string[] = []

    try {
        // Read workbook
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        console.log('[StatusInvest Parser] Sheets found:', workbook.SheetNames)

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

            if (headerStr.includes('data operação') ||
                headerStr.includes('data operacao') ||
                (headerStr.includes('código ativo') || headerStr.includes('codigo ativo')) ||
                (headerStr.includes('operação c/v') || headerStr.includes('operacao c/v'))) {
                headerRowIndex = i
                headers = row.map(h => String(h || '').trim())
                break
            }
        }

        console.log('[StatusInvest Parser] Headers:', headers)

        // Find column indices
        const cols = {
            data: findColumnIndex(headers, STATUSINVEST_COLUMNS.data),
            categoria: findColumnIndex(headers, STATUSINVEST_COLUMNS.categoria),
            ticker: findColumnIndex(headers, STATUSINVEST_COLUMNS.ticker),
            operacao: findColumnIndex(headers, STATUSINVEST_COLUMNS.operacao),
            quantidade: findColumnIndex(headers, STATUSINVEST_COLUMNS.quantidade),
            preco: findColumnIndex(headers, STATUSINVEST_COLUMNS.preco),
            corretora: findColumnIndex(headers, STATUSINVEST_COLUMNS.corretora),
            taxas: findColumnIndex(headers, STATUSINVEST_COLUMNS.taxas),
        }

        console.log('[StatusInvest Parser] Column indices:', cols)

        // Validate required columns
        if (cols.ticker < 0) {
            return {
                operations: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Coluna "Código Ativo" não encontrada. Verifique se o arquivo é do Status Invest.']
            }
        }

        // Process data rows
        let minDate: Date | null = null
        let maxDate: Date | null = null

        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i] as any[]

            try {
                // Skip empty rows
                const ticker = cleanTicker(String(row[cols.ticker] || ''))
                if (!ticker) continue

                // Parse date
                const dateValue = cols.data >= 0 ? row[cols.data] : null
                const date = parseStatusInvestDate(dateValue)

                if (!date) {
                    errors.push(`Linha ${i + 1}: Data inválida "${dateValue}"`)
                    continue
                }

                // Track date range
                if (!minDate || date < minDate) minDate = date
                if (!maxDate || date > maxDate) maxDate = date

                // Get operation type (C = buy, V = sell)
                const operacao = cols.operacao >= 0 ? String(row[cols.operacao] || 'C').trim() : 'C'
                const opType = mapOperationType(operacao)

                // Get category and asset type
                const categoria = cols.categoria >= 0 ? String(row[cols.categoria] || '').trim() : ''
                const assetType = mapCategoriaToAssetType(categoria)

                // Parse numeric values
                const quantidade = cols.quantidade >= 0
                    ? parseBrazilianNumber(row[cols.quantidade])
                    : 0

                const preco = cols.preco >= 0
                    ? parseBrazilianNumber(row[cols.preco])
                    : 0

                // Calculate total
                const total = quantidade * preco

                // Get institution
                const corretora = cols.corretora >= 0
                    ? String(row[cols.corretora] || '').trim()
                    : undefined

                // Get fees
                const taxas = cols.taxas >= 0
                    ? parseBrazilianNumber(row[cols.taxas])
                    : 0

                // Skip zero quantity operations
                if (quantidade === 0) continue

                // Create operation
                const operation: StatusInvestOperation = {
                    date,
                    type: opType,
                    ticker,
                    category: categoria,
                    assetType,
                    quantity: quantidade,
                    price: preco,
                    total: Math.abs(total),
                    currency: 'BRL',
                    institution: corretora,
                    fees: taxas,
                }

                // Validate
                const validation = StatusInvestOperationSchema.safeParse(operation)
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
 * Validates that a buffer is a valid Status Invest XLSX file.
 */
export function isValidStatusInvestXLSX(buffer: Buffer | ArrayBuffer): boolean {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        if (workbook.SheetNames.length === 0) return false

        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!sheet) return false

        // Check for Status Invest-specific headers
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 })
        const allText = data.slice(0, 10).flat().join(' ').toLowerCase()

        return allText.includes('data operação') ||
            allText.includes('data operacao') ||
            (allText.includes('código ativo') && allText.includes('operação c/v')) ||
            (allText.includes('codigo ativo') && allText.includes('operacao c/v'))

    } catch {
        return false
    }
}
