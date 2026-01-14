/**
 * @fileoverview Kinvo XLSX Parser - Parses Excel files exported from Kinvo
 * 
 * Kinvo is a popular Brazilian portfolio management app. This parser handles
 * the Excel files exported from the "Carteira > Resumo > Baixar planilha" feature.
 * 
 * The export contains buy/sell operations, dividends, bonifications, and income data.
 * 
 * @module parsers/kinvo-xlsx-parser
 * @see https://app.kinvo.com.br
 */

import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { AssetType } from '@/lib/schemas/investment-schema'
import { detectAssetType } from './b3-xlsx-parser'

// ============================================
// Types & Schemas
// ============================================

/**
 * Zod schema for a single Kinvo operation.
 */
export const KinvoOperationSchema = z.object({
    /** Date of the operation */
    date: z.date(),
    /** Type of operation: buy, sell, or dividend */
    type: z.enum(['buy', 'sell', 'dividend']),
    /** Ticker symbol */
    ticker: z.string().min(1),
    /** Full asset name */
    name: z.string(),
    /** Asset type for categorization */
    assetType: z.string(),
    /** Number of shares/units */
    quantity: z.number().nonnegative(),
    /** Price per unit */
    price: z.number().nonnegative(),
    /** Total value */
    total: z.number().nonnegative(),
    /** Currency: BRL */
    currency: z.string(),
    /** Description (Rendimentos, Dividendos, etc.) */
    description: z.string().optional(),
    /** Institution (XP INVEST B3, etc.) */
    institution: z.string().optional(),
})

export type KinvoOperation = z.infer<typeof KinvoOperationSchema>

/**
 * Result of parsing a Kinvo XLSX file.
 */
export interface KinvoParseResult {
    /** Successfully parsed operations */
    operations: KinvoOperation[]
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
 * Expected column headers in Kinvo Excel file (Portuguese).
 * Kinvo columns:
 * - Data: Date of operation
 * - Produto: Ticker + Name (e.g., "KNSC11 - FII KINEA SCCI")
 * - Tipo: Asset type (Fundo Imobiliário, Ação)
 * - Descrição: Operation description (Rendimentos, Dividendos, Juros sobre capital, Bonificação X%)
 * - Instituição/Conexão: Institution (XP INVEST B3)
 * - Valor: Unit value
 * - Quantidade: Quantity
 * - Custo: Cost
 * - Câmbio: Exchange rate
 * - Valor Total: Total value
 */
const KINVO_COLUMNS = {
    data: ['data'],
    produto: ['produto', 'ativo'],
    tipo: ['tipo', 'tipo de ativo'],
    descricao: ['descrição', 'descricao', 'operação', 'operacao'],
    instituicao: ['instituição', 'instituicao', 'instituição/conexão', 'conexão'],
    valor: ['valor'],
    quantidade: ['quantidade', 'qtd', 'qtde'],
    custo: ['custo'],
    cambio: ['câmbio', 'cambio'],
    valorTotal: ['valor total', 'total'],
} as const

/**
 * Maps Kinvo "Tipo" to internal asset type.
 */
export function mapTipoToAssetType(tipo: string, ticker: string): AssetType {
    const lower = tipo.toLowerCase()

    if (lower.includes('fundo imobiliário') || lower.includes('fii')) {
        return 'reit_br'
    }
    if (lower.includes('ação') || lower.includes('acão') || lower.includes('acao')) {
        return 'stock_br'
    }
    if (lower.includes('bdr')) {
        return 'stock_br'
    }
    if (lower.includes('etf')) {
        return 'etf_br'
    }
    if (lower.includes('fiagro')) {
        return 'fiagro'
    }
    if (lower.includes('tesouro')) {
        return 'treasure'
    }
    if (lower.includes('renda fixa') || lower.includes('cdb') || lower.includes('lci') || lower.includes('lca')) {
        return 'fixed_income'
    }
    if (lower.includes('fundo')) {
        return 'fund'
    }

    // Fallback to detection by ticker
    return detectAssetType(ticker)
}

/**
 * Parses date from Kinvo Excel.
 */
export function parseKinvoDate(value: any): Date | null {
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
 * Parses currency value.
 */
export function parseCurrency(value: any): number {
    if (typeof value === 'number') return Math.abs(value)
    if (!value) return 0

    let str = String(value).trim()

    // Remove currency symbols
    str = str.replace(/^(R\$|US\$|\$)\s*/i, '').trim()

    // Handle Brazilian format: 1.234,56
    if (str.includes(',') && str.includes('.')) {
        str = str.replace(/\./g, '').replace(',', '.')
    } else if (str.includes(',') && !str.includes('.')) {
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
 * Extracts ticker from "Produto" column.
 * Format: "TICKER - NAME" or just "TICKER"
 */
function extractTicker(produto: string): { ticker: string; name: string } {
    const parts = produto.split(' - ')
    if (parts.length >= 2) {
        return {
            ticker: parts[0].trim().toUpperCase(),
            name: parts.slice(1).join(' - ').trim()
        }
    }
    return {
        ticker: produto.trim().toUpperCase(),
        name: ''
    }
}

/**
 * Maps operation type from Kinvo description.
 * - Aplicação = buy (purchase)
 * - Resgate = sell
 * - Bonificação = buy (stock bonus)
 * - Rendimentos, Dividendos, Juros sobre capital, JCP = dividend
 */
export function mapOperationType(descricao: string): 'buy' | 'sell' | 'dividend' {
    const lower = descricao.toLowerCase()

    // Aplicação = buy (purchase)
    if (lower.includes('aplicação') || lower.includes('aplicacao')) {
        return 'buy'
    }

    // Resgate = sell
    if (lower.includes('resgate')) {
        return 'sell'
    }

    // Bonificação = stock bonus, treat as buy
    if (lower.includes('bonificação') || lower.includes('bonificacao')) {
        return 'buy'
    }

    // Everything else (Rendimentos, Dividendos, JCP, etc.) = dividend
    return 'dividend'
}

// ============================================
// Main Parser
// ============================================

/**
 * Parses a Kinvo Excel file and extracts dividend/income operations.
 * 
 * @param buffer - The file buffer (XLSX format)
 * @returns Parse result with operations, counts, and errors
 */
export async function parseKinvoXLSX(buffer: Buffer | ArrayBuffer): Promise<KinvoParseResult> {
    const operations: KinvoOperation[] = []
    const errors: string[] = []

    try {
        // Read workbook
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        console.log('[Kinvo Parser] Sheets found:', workbook.SheetNames)

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

        // Find header row
        let headerRowIndex = 0
        let headers: string[] = []

        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i] as string[]
            const headerStr = row.join(' ').toLowerCase()

            if (headerStr.includes('produto') ||
                headerStr.includes('descrição') ||
                (headerStr.includes('data') && headerStr.includes('valor'))) {
                headerRowIndex = i
                headers = row.map(h => String(h || '').trim())
                break
            }
        }

        console.log('[Kinvo Parser] Headers:', headers)

        // Find column indices
        const cols = {
            data: findColumnIndex(headers, KINVO_COLUMNS.data),
            produto: findColumnIndex(headers, KINVO_COLUMNS.produto),
            tipo: findColumnIndex(headers, KINVO_COLUMNS.tipo),
            descricao: findColumnIndex(headers, KINVO_COLUMNS.descricao),
            instituicao: findColumnIndex(headers, KINVO_COLUMNS.instituicao),
            valor: findColumnIndex(headers, KINVO_COLUMNS.valor),
            quantidade: findColumnIndex(headers, KINVO_COLUMNS.quantidade),
            custo: findColumnIndex(headers, KINVO_COLUMNS.custo),
            cambio: findColumnIndex(headers, KINVO_COLUMNS.cambio),
            valorTotal: findColumnIndex(headers, KINVO_COLUMNS.valorTotal),
        }

        console.log('[Kinvo Parser] Column indices:', cols)

        // Validate required columns
        if (cols.produto < 0 && cols.data < 0) {
            return {
                operations: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Colunas "Produto" ou "Data" não encontradas. Verifique se o arquivo é do Kinvo.']
            }
        }

        // Process data rows
        let minDate: Date | null = null
        let maxDate: Date | null = null

        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i] as any[]

            try {
                // Get produto and extract ticker
                const produtoValue = cols.produto >= 0 ? String(row[cols.produto] || '').trim() : ''
                if (!produtoValue) continue

                const { ticker, name } = extractTicker(produtoValue)
                if (!ticker) continue

                // Parse date
                const dateValue = cols.data >= 0 ? row[cols.data] : null
                const date = parseKinvoDate(dateValue)

                if (!date) {
                    errors.push(`Linha ${i + 1}: Data inválida "${dateValue}"`)
                    continue
                }

                // Track date range
                if (!minDate || date < minDate) minDate = date
                if (!maxDate || date > maxDate) maxDate = date

                // Get description and map to operation type
                const descricao = cols.descricao >= 0 ? String(row[cols.descricao] || '').trim() : ''
                const opType = mapOperationType(descricao)

                // Get asset type from Tipo column
                const tipo = cols.tipo >= 0 ? String(row[cols.tipo] || '').trim() : ''
                const assetType = mapTipoToAssetType(tipo, ticker)

                // Parse numeric values
                const quantidade = cols.quantidade >= 0
                    ? parseCurrency(row[cols.quantidade])
                    : 0

                const valor = cols.valor >= 0
                    ? parseCurrency(row[cols.valor])
                    : 0

                const valorTotal = cols.valorTotal >= 0
                    ? parseCurrency(row[cols.valorTotal])
                    : quantidade * valor

                // Get institution
                const instituicao = cols.instituicao >= 0
                    ? String(row[cols.instituicao] || '').trim()
                    : undefined

                // Skip zero total operations (some rows might be informational only)
                if (valorTotal === 0 && quantidade === 0) continue

                // Create operation
                const operation: KinvoOperation = {
                    date,
                    type: opType,
                    ticker,
                    name: name || tipo,
                    assetType,
                    quantity: quantidade || 1, // Default to 1 for dividends
                    price: valor || valorTotal, // Use valorTotal if valor is empty
                    total: valorTotal || valor, // Use valor if valorTotal is empty
                    currency: 'BRL',
                    description: descricao,
                    institution: instituicao,
                }

                // Validate
                const validation = KinvoOperationSchema.safeParse(operation)
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
 * Validates that a buffer is a valid Kinvo XLSX file.
 */
export function isValidKinvoXLSX(buffer: Buffer | ArrayBuffer): boolean {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        if (workbook.SheetNames.length === 0) return false

        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!sheet) return false

        // Check for Kinvo-specific headers
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 })
        const allText = data.slice(0, 10).flat().join(' ').toLowerCase()

        return allText.includes('produto') &&
            (allText.includes('descrição') || allText.includes('descricao')) &&
            allText.includes('valor')

    } catch {
        return false
    }
}
