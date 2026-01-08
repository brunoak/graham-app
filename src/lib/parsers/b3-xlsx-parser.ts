/**
 * @fileoverview B3 XLSX Parser - Parses Excel files from B3 (Brazilian Stock Exchange)
 * 
 * The B3 portal allows investors to download their movement history as Excel files.
 * This parser extracts buy, sell, and dividend transactions from those files.
 * 
 * @module parsers/b3-xlsx-parser
 * @see https://www.investidor.b3.com.br/
 */

import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { AssetType } from '@/lib/schemas/investment-schema'

// ============================================
// Types & Schemas
// ============================================

/**
 * Zod schema for a single B3 operation parsed from the Excel file.
 */
export const B3OperationSchema = z.object({
    /** Date of the operation */
    date: z.date(),
    /** Type of operation: buy, sell, or dividend */
    type: z.enum(['buy', 'sell', 'dividend']),
    /** Ticker symbol (e.g., "XPML11", "PETR4") */
    ticker: z.string().min(1),
    /** Full asset name */
    name: z.string(),
    /** Asset type for categorization */
    assetType: z.string(),
    /** Number of shares/units */
    quantity: z.number().nonnegative(),
    /** Price per unit in BRL */
    price: z.number().nonnegative(),
    /** Total value of the operation */
    total: z.number().nonnegative(),
    /** Brokerage institution */
    institution: z.string().optional(),
    /** Original movement description from B3 */
    movement: z.string(),
})

export type B3Operation = z.infer<typeof B3OperationSchema>

/**
 * Result of parsing a B3 XLSX file.
 */
export interface B3ParseResult {
    /** Successfully parsed operations */
    operations: B3Operation[]
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
 * Expected column headers in B3 Excel file (Portuguese).
 * The parser will try to find these columns by name.
 */
const B3_COLUMNS = {
    entradaSaida: ['entrada/saída', 'entrada/saida', 'entrada / saída'],
    data: ['data'],
    movimentacao: ['movimentação', 'movimentacao', 'tipo'],
    produto: ['produto', 'ativo'],
    instituicao: ['instituição', 'instituicao', 'corretora'],
    quantidade: ['quantidade', 'qtd', 'qtde'],
    precoUnitario: ['preço unitário', 'preco unitario', 'preço', 'preco'],
    valorOperacao: ['valor da operação', 'valor da operacao', 'valor', 'total'],
} as const

/**
 * Fixed income product prefixes that should use full name as ticker.
 */
const FIXED_INCOME_PREFIXES = [
    'tesouro', 'lci', 'lca', 'cdb', 'rdb',
    'cri', 'cra', 'coe', 'debenture', 'debênture'
]

/**
 * Generates a ticker-safe string from a product name.
 * Removes special characters, replaces spaces with dashes, uppercases.
 * 
 * @param name - Product name
 * @returns Cleaned ticker string (max 30 chars)
 * 
 * @example
 * generateFixedIncomeTicker("Tesouro Selic 2026") // Returns: "TESOURO-SELIC-2026"
 */
function generateFixedIncomeTicker(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[+%]/g, '')             // Remove + and %
        .replace(/[^a-zA-Z0-9\s-]/g, '')  // Remove special chars except dash
        .trim()
        .replace(/\s+/g, '-')             // Spaces to dashes
        .replace(/-+/g, '-')              // Collapse multiple dashes into one
        .toUpperCase()
        .slice(0, 30)                      // Max 30 chars
}

/**
 * Extracts ticker symbol and asset name from B3 product column.
 * 
 * For stocks/FIIs: Uses the standard ticker (e.g., PETR4, XPML11)
 * For fixed income: Generates ticker from full name (e.g., TESOURO-SELIC-2026)
 * 
 * B3 format examples:
 * - "XPML11 - XP MALLS FUNDO DE INVESTIMENTO..." → ticker: XPML11
 * - "PETR4 - PETROLEO BRASILEIRO S.A." → ticker: PETR4
 * - "Tesouro Selic 2026" → ticker: TESOURO-SELIC-2026
 * - "LCI - Banco ABC 2024" → ticker: LCI-BANCO-ABC-2024
 * 
 * @param product - The product string from B3
 * @returns Object with ticker and name
 */
export function extractTickerFromProduct(product: string): { ticker: string; name: string } {
    if (!product) return { ticker: '', name: '' }

    const trimmed = product.trim()
    const lower = trimmed.toLowerCase()

    // Check if it's a fixed income product
    const isFixedIncome = FIXED_INCOME_PREFIXES.some(prefix => lower.startsWith(prefix))

    if (isFixedIncome) {
        return {
            ticker: generateFixedIncomeTicker(trimmed),
            name: trimmed
        }
    }

    // Pattern: TICKER - NAME (for stocks, FIIs, ETFs)
    const dashMatch = trimmed.match(/^([A-Z0-9]{4,6})\s*-\s*(.+)$/i)
    if (dashMatch) {
        return {
            ticker: dashMatch[1].toUpperCase(),
            name: dashMatch[2].trim()
        }
    }

    // Pattern: Just ticker (e.g., "PETR4")
    const tickerMatch = trimmed.match(/^([A-Z]{4}\d{1,2}[A-Z]?)$/i)
    if (tickerMatch) {
        return {
            ticker: tickerMatch[1].toUpperCase(),
            name: ''
        }
    }

    // Fallback: use first word as ticker
    const firstWord = trimmed.split(/[\s-]/)[0]
    return {
        ticker: firstWord.toUpperCase().slice(0, 6),
        name: trimmed
    }
}

/**
 * Maps B3 movement type to internal transaction type.
 * 
 * B3 Movement Types (from Movimentação column):
 * - Rendimento → dividend (income from investments)
 * - Empréstimo → ignore (stock lending, tracked separately)
 * - Leilão de Fração → sell (fractional share auction)
 * - Reembolso → dividend (refund/reimbursement)
 * - Fração em Ativos → buy (fractional share acquisition)
 * - Atualização → ignore (price update, no transaction)
 * - Resgate → sell (redemption)
 * - Vencimento/Resgate saldo em conta → sell (maturity/redemption)
 * - Pagamento de juros → dividend (interest payment)
 * - Compra/Venda → depends on Entrada/Saída (Crédito=buy, Débito=sell)
 * - Transferência - Liquidação → depends on Entrada/Saída
 * 
 * @param movement - Movement description from B3 (Movimentação column)
 * @param entradaSaida - Entry/Exit indicator (Entrada/Saída column): "Débito" = sell, "Crédito" = buy/dividend
 * @returns Transaction type: "buy", "sell", "dividend", or "ignore"
 */
export function mapMovementToType(movement: string, entradaSaida?: string): 'buy' | 'sell' | 'dividend' | 'ignore' {
    const lowerMovement = movement.toLowerCase().trim()
    const lowerEntradaSaida = (entradaSaida || '').toLowerCase().trim()

    // ========================================
    // MOVEMENTS TO IGNORE (don't create transactions)
    // ========================================
    if (lowerMovement.includes('atualização') ||
        lowerMovement.includes('atualizacao') ||
        lowerMovement.includes('empréstimo') ||
        lowerMovement.includes('emprestimo')) {
        return 'ignore'
    }

    // ========================================
    // DIVIDEND / INCOME INDICATORS
    // ========================================
    if (lowerMovement.includes('rendimento') ||
        lowerMovement.includes('dividendo') ||
        lowerMovement.includes('juros sobre capital') ||
        lowerMovement.includes('jcp') ||
        lowerMovement.includes('provento') ||
        lowerMovement.includes('amortização') ||
        lowerMovement.includes('amortizacao') ||
        lowerMovement.includes('bonificação') ||
        lowerMovement.includes('bonificacao') ||
        lowerMovement.includes('reembolso') ||
        lowerMovement.includes('pagamento de juros')) {
        return 'dividend'
    }

    // ========================================
    // EXPLICIT SELL INDICATORS
    // ========================================
    if (lowerMovement.includes('leilão de fração') ||
        lowerMovement.includes('leilao de fracao') ||
        lowerMovement.includes('vencimento') ||
        lowerMovement.includes('resgate')) {
        return 'sell'
    }

    // ========================================
    // EXPLICIT BUY INDICATORS
    // ========================================
    if (lowerMovement.includes('fração em ativos') ||
        lowerMovement.includes('fracao em ativos')) {
        return 'buy'
    }

    // ========================================
    // COMPRA/VENDA - Check Entrada/Saída to determine
    // ========================================
    if (lowerMovement.includes('compra/venda') ||
        lowerMovement.includes('compra / venda')) {
        // Use Entrada/Saída to determine: Crédito = buy, Débito = sell
        if (lowerEntradaSaida.includes('débito') || lowerEntradaSaida.includes('debito')) {
            return 'sell'
        }
        return 'buy'
    }

    // ========================================
    // GENERIC RULES BASED ON Entrada/Saída
    // ========================================
    // "Débito" = Assets LEAVING portfolio = SELL
    if (lowerEntradaSaida.includes('débito') || lowerEntradaSaida.includes('debito')) {
        return 'sell'
    }

    // "Crédito" with "Venda" in movement = SELL (edge case)
    if (lowerMovement.includes('venda')) {
        return 'sell'
    }

    // Default for "Crédito" entries = BUY
    // Includes: Compra, Transferência - Liquidação (Crédito), etc.
    return 'buy'
}

/**
 * Detects asset type based on ticker pattern.
 * 
 * @param ticker - Ticker symbol
 * @returns Asset type for categorization
 * 
 * @example
 * detectAssetType("XPML11") // Returns: "reit_br" (FII)
 * detectAssetType("PETR4") // Returns: "stock_br"
 * detectAssetType("TESOURO-SELIC-2026") // Returns: "treasure"
 */
export function detectAssetType(ticker: string): AssetType {
    const upper = ticker.toUpperCase()

    // Fixed income - Tesouro Direto (TESOURO-* pattern)
    if (upper.startsWith('TESOURO-') || upper === 'TESOURO') {
        return 'treasure'
    }

    // Fixed income - LCI, LCA, CDB, RDB (bank deposits)
    if (upper.startsWith('LCI-') || upper.startsWith('LCA-') ||
        upper.startsWith('CDB-') || upper.startsWith('RDB-') ||
        upper.startsWith('LF-') || upper === 'LCI' || upper === 'LCA' ||
        upper === 'CDB' || upper === 'RDB') {
        return 'fixed_income'
    }

    // Fixed income - Credit instruments (CRI, CRA, Debêntures, COE)
    if (upper.startsWith('CRI-') || upper.startsWith('CRA-') ||
        upper.startsWith('DEBENTURE-') || upper.startsWith('COE-') ||
        upper === 'CRI' || upper === 'CRA') {
        return 'fixed_income' // Could be a new "credit" type in the future
    }

    // ETFs (check BEFORE FIIs since some ETFs also end with 11)
    // Common Brazilian ETF prefixes
    if (upper.startsWith('IVVB') ||
        upper.startsWith('BOVA') ||
        upper.startsWith('HASH') ||
        upper.startsWith('SMAL') ||
        upper.startsWith('XFIX') ||
        upper.startsWith('DIVO') ||
        upper.startsWith('BRAX') ||
        upper.startsWith('ECOO') ||
        upper.startsWith('FIND') ||
        upper.startsWith('GOVE') ||
        upper.startsWith('ISUS') ||
        upper.startsWith('MATB') ||
        upper.startsWith('PIBB') ||
        upper.startsWith('SPXI') ||
        upper.startsWith('XBOV')) {
        return 'etf_br'
    }

    // FIIs (end with 11, 12, 13)
    if (/^[A-Z]{4}11[A-Z]?$/.test(upper) ||
        /^[A-Z]{4}12$/.test(upper) ||
        /^[A-Z]{4}13$/.test(upper)) {
        return 'reit_br'
    }

    // US stocks/ETFs (typically 2-4 letters, no numbers)
    if (/^[A-Z]{2,4}$/.test(upper)) {
        return 'stock_us'
    }

    // BDRs (end with 34, 35, 39)
    if (/^[A-Z]{4}34$/.test(upper) ||
        /^[A-Z]{4}35$/.test(upper) ||
        /^[A-Z]{4}39$/.test(upper)) {
        return 'stock_us' // BDRs treated as US exposure
    }

    // Default: Brazilian stock
    return 'stock_br'
}

/**
 * Parses Brazilian currency format to number.
 * 
 * @param value - Value in Brazilian format (e.g., "R$ 1.234,56")
 * @returns Parsed number
 */
function parseBrazilianCurrency(value: any): number {
    if (typeof value === 'number') return value
    if (!value) return 0

    let str = String(value).trim()

    // Remove currency symbol and spaces
    str = str.replace(/^R\$\s*/i, '').trim()

    // Handle Brazilian format: 1.234,56
    if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.')
    }

    // Remove any remaining non-numeric except . and -
    str = str.replace(/[^\d.\-]/g, '')

    return parseFloat(str) || 0
}

/**
 * Parses date from B3 Excel.
 * 
 * @param value - Date value (can be Excel serial number or string)
 * @returns Parsed Date object or null
 */
function parseB3Date(value: any): Date | null {
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
 * Finds column index by trying multiple header names.
 * 
 * @param headers - Array of header names from the sheet
 * @param possibleNames - Array of possible column names to match
 * @returns Column index or -1 if not found
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

// ============================================
// Main Parser
// ============================================

/**
 * Parses a B3 Excel file and extracts investment operations.
 * 
 * @param buffer - The file buffer (XLSX format)
 * @returns Parse result with operations, counts, and errors
 * 
 * @example
 * const result = await parseB3XLSX(fileBuffer)
 * console.log(`Found ${result.successCount} operations`)
 * for (const op of result.operations) {
 *     console.log(`${op.type} ${op.quantity}x ${op.ticker} @ ${op.price}`)
 * }
 */
export async function parseB3XLSX(buffer: Buffer | ArrayBuffer): Promise<B3ParseResult> {
    const operations: B3Operation[] = []
    const errors: string[] = []

    try {
        // Read workbook
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        console.log('[B3 Parser] Sheets found:', workbook.SheetNames)

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

        for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i] as string[]
            const headerStr = row.join(' ').toLowerCase()

            if (headerStr.includes('movimentação') ||
                headerStr.includes('movimentacao') ||
                headerStr.includes('produto') ||
                headerStr.includes('quantidade')) {
                headerRowIndex = i
                headers = row.map(h => String(h || '').trim())
                break
            }
        }

        console.log('[B3 Parser] Headers:', headers)

        // Find column indices
        const cols = {
            entradaSaida: findColumnIndex(headers, B3_COLUMNS.entradaSaida),
            data: findColumnIndex(headers, B3_COLUMNS.data),
            movimentacao: findColumnIndex(headers, B3_COLUMNS.movimentacao),
            produto: findColumnIndex(headers, B3_COLUMNS.produto),
            instituicao: findColumnIndex(headers, B3_COLUMNS.instituicao),
            quantidade: findColumnIndex(headers, B3_COLUMNS.quantidade),
            precoUnitario: findColumnIndex(headers, B3_COLUMNS.precoUnitario),
            valorOperacao: findColumnIndex(headers, B3_COLUMNS.valorOperacao),
        }

        console.log('[B3 Parser] Column indices:', cols)

        // Validate required columns
        if (cols.produto < 0) {
            return {
                operations: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Coluna "Produto" não encontrada. Verifique se o arquivo é do B3.']
            }
        }

        // Process data rows
        let minDate: Date | null = null
        let maxDate: Date | null = null

        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i] as any[]

            try {
                // Skip empty rows
                const produto = String(row[cols.produto] || '').trim()
                if (!produto) continue

                // Extract ticker and name
                const { ticker, name } = extractTickerFromProduct(produto)
                if (!ticker) {
                    errors.push(`Linha ${i + 1}: Ticker não encontrado em "${produto}"`)
                    continue
                }

                // Parse date
                const dateValue = cols.data >= 0 ? row[cols.data] : null
                const date = parseB3Date(dateValue)

                if (!date) {
                    errors.push(`Linha ${i + 1}: Data inválida "${dateValue}"`)
                    continue
                }

                // Track date range
                if (!minDate || date < minDate) minDate = date
                if (!maxDate || date > maxDate) maxDate = date

                // Get entrada/saida (Débito = sell, Crédito = buy/dividend)
                const entradaSaida = cols.entradaSaida >= 0
                    ? String(row[cols.entradaSaida] || '').trim()
                    : ''

                // Get movement description
                const movimentacao = cols.movimentacao >= 0
                    ? String(row[cols.movimentacao] || '').trim()
                    : 'Compra'

                // Determine type using both columns
                const typeResult = mapMovementToType(movimentacao, entradaSaida)

                // Skip movements that shouldn't create transactions (Empréstimo, Atualização, etc.)
                if (typeResult === 'ignore') {
                    continue
                }

                const type = typeResult as 'buy' | 'sell' | 'dividend'

                // Parse numeric values
                const quantidade = cols.quantidade >= 0
                    ? parseBrazilianCurrency(row[cols.quantidade])
                    : 0

                const precoUnitario = cols.precoUnitario >= 0
                    ? parseBrazilianCurrency(row[cols.precoUnitario])
                    : 0

                const valorOperacao = cols.valorOperacao >= 0
                    ? parseBrazilianCurrency(row[cols.valorOperacao])
                    : quantidade * precoUnitario

                // Get institution
                const instituicao = cols.instituicao >= 0
                    ? String(row[cols.instituicao] || '').trim()
                    : undefined

                // Create operation
                const operation: B3Operation = {
                    date,
                    type,
                    ticker,
                    name,
                    assetType: detectAssetType(ticker),
                    quantity: quantidade,
                    price: precoUnitario,
                    total: Math.abs(valorOperacao),
                    institution: instituicao,
                    movement: movimentacao,
                }

                // Validate
                const validation = B3OperationSchema.safeParse(operation)
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
 * Validates that a buffer is a valid B3 XLSX file.
 * 
 * @param buffer - File buffer to validate
 * @returns true if the file appears to be a valid B3 export
 */
export function isValidB3XLSX(buffer: Buffer | ArrayBuffer): boolean {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        if (workbook.SheetNames.length === 0) return false

        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        if (!sheet) return false

        // Check for B3-specific headers
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1 })
        const allText = data.slice(0, 5).flat().join(' ').toLowerCase()

        return allText.includes('movimentação') ||
            allText.includes('produto') ||
            allText.includes('quantidade')

    } catch {
        return false
    }
}
