/**
 * @fileoverview CSV Parser - Parses bank CSV files.
 * 
 * CSV is used primarily by fintechs for statements and invoices.
 * Supported banks: Nubank, Inter, PicPay
 * 
 * Each bank has a different column structure, so we use templates.
 * 
 * @module parsers/csv-parser
 */

import Papa from 'papaparse'
import { z } from 'zod'
import { ParsedTransaction, ParseResult, BankType, FileSourceType } from './types'
import { extractTransactionData } from './description-extractor'

/**
 * Zod schema for validating parsed CSV transactions.
 */
export const CSVTransactionSchema = z.object({
    date: z.date(),
    amount: z.number(),
    description: z.string(),
    name: z.string(),
    type: z.enum(['income', 'expense']),
    raw: z.string(),
    confidence: z.number().min(0).max(1),
})

/**
 * Template configuration for parsing bank-specific CSV formats.
 */
export interface CSVTemplate {
    bank: BankType
    /** Column index or name for date */
    dateColumn: number | string
    /** Column index or name for amount */
    amountColumn: number | string
    /** Column index or name for description */
    descriptionColumn: number | string
    /** Column index or name for title/name (optional, for separate name) */
    titleColumn?: number | string
    /** Column index or name for category (optional) */
    categoryColumn?: number | string
    /** Date format used by this bank */
    dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY'
    /** Whether amount is negative for expenses (some banks use positive with type column) */
    negativeForExpense: boolean
    /** Skip first N rows (headers) */
    skipRows: number
    /** Delimiter used */
    delimiter: ',' | ';' | '\t'
    /** Whether to auto-detect delimiter */
    autoDelimiter?: boolean
}

/**
 * Nubank CSV template for FATURA (credit card).
 * Real format from user: date, title, amount (3 columns)
 * Example: 2025-12-31,Alessandro da Silva,15.08
 * Note: Amount is POSITIVE for expenses (no negative sign)
 */
export const NUBANK_FATURA_TEMPLATE: CSVTemplate = {
    bank: 'nubank',
    dateColumn: 0,              // date
    amountColumn: 2,            // amount (3rd column, index 2)
    descriptionColumn: 1,       // title/merchant name
    dateFormat: 'YYYY-MM-DD',   // Nubank uses ISO format
    negativeForExpense: false,  // Amount is positive, ALL are expenses in fatura
    skipRows: 1,
    delimiter: ',',
}

/**
 * Nubank CSV template for EXTRATO (bank statement).
 * Real format from user: Data, Valor, Identificador, Descrição (4 columns)
 * Example: 03/11/2025,-265.34,6908fe67-4a62-495c,Transferência enviada
 * Note: Valor is NEGATIVE for expenses
 */
export const NUBANK_EXTRATO_TEMPLATE: CSVTemplate = {
    bank: 'nubank',
    dateColumn: 0,              // Data
    amountColumn: 1,            // Valor
    descriptionColumn: 3,       // Descrição
    dateFormat: 'DD/MM/YYYY',   // Brazilian format for extrato
    negativeForExpense: true,   // Negative = expense
    skipRows: 1,
    delimiter: ',',
}

/**
 * Inter CSV template for EXTRATO (bank statement).
 * Real format from user file (TAB-separated):
 * Row 1: Extrato Conta Corrente
 * Row 2: Conta  269903917
 * Row 3: Período  01/08/2025 a 04/01/2026
 * Row 4: Saldo:  0,45
 * Row 5: (empty line)
 * Row 6: Data Lançamento  Descrição  Valor  Saldo (HEADER)
 * Row 7+: Data rows
 * Columns: Data Lançamento | Descrição | Valor | Saldo
 */
export const INTER_EXTRATO_TEMPLATE: CSVTemplate = {
    bank: 'inter',
    dateColumn: 0,              // Data Lançamento
    amountColumn: 2,            // Valor
    descriptionColumn: 1,       // Descrição
    dateFormat: 'DD/MM/YYYY',
    negativeForExpense: true,   // Negative = expense
    skipRows: 5,                // 4 metadata rows + 1 header row
    delimiter: ';',             // Semicolon separated
}

/**
 * Inter CSV template for FATURA (credit card invoice).
 * Real format from user file:
 * Headers: Data,"Lançamento","Categoria","Tipo","Valor"
 * Data: 07/12/2023,"PAGAMENTO ON LINE","OUTROS","Compra à vista","-R$ 402,80"
 * Note: Valor has "R$" prefix and uses comma as decimal separator
 */
export const INTER_FATURA_TEMPLATE: CSVTemplate = {
    bank: 'inter',
    dateColumn: 0,              // Data
    amountColumn: 4,            // Valor (with R$ prefix)
    descriptionColumn: 1,       // Lançamento
    categoryColumn: 2,          // Categoria
    titleColumn: 3,             // Tipo
    dateFormat: 'DD/MM/YYYY',
    negativeForExpense: true,   // "-R$ 402,80" = expense
    skipRows: 1,                // Just 1 header row
    delimiter: ',',
}

// Legacy alias for backwards compatibility
export const INTER_TEMPLATE = INTER_EXTRATO_TEMPLATE

/**
 * PicPay CSV template.
 */
export const PICPAY_TEMPLATE: CSVTemplate = {
    bank: 'picpay',
    dateColumn: 0,
    amountColumn: 1,
    descriptionColumn: 2,
    dateFormat: 'DD/MM/YYYY',
    negativeForExpense: true,
    skipRows: 1,
    delimiter: ',',
}

/**
 * Rico Conta Digital CSV template for EXTRATO.
 * Format: Data | Descricao | Valor | Saldo
 * Date is short format: 10/11/25 (DD/MM/YY)
 * Valor has R$ prefix: -R$ 10,00 or R$ 10,00
 */
export const RICO_EXTRATO_TEMPLATE: CSVTemplate = {
    bank: 'rico',
    dateColumn: 0,              // Data
    amountColumn: 2,            // Valor
    descriptionColumn: 1,       // Descricao
    dateFormat: 'DD/MM/YYYY',   // Will handle short year in parser
    negativeForExpense: true,
    skipRows: 1,
    delimiter: ',',
    autoDelimiter: true,
}

/**
 * Rico Conta Digital CSV template for FATURA (credit card).
 * Format: Data | Estabelecimento | Portador | Valor | Parcela
 * Date is full format: 05/06/2025 (DD/MM/YYYY)
 * Valor has R$ prefix: R$69,90
 */
export const RICO_FATURA_TEMPLATE: CSVTemplate = {
    bank: 'rico',
    dateColumn: 0,              // Data
    amountColumn: 3,            // Valor
    descriptionColumn: 1,       // Estabelecimento
    dateFormat: 'DD/MM/YYYY',
    negativeForExpense: false,  // All fatura values are expenses (positive = expense)
    skipRows: 1,
    delimiter: ',',
    autoDelimiter: true,
}

// Default alias
export const RICO_TEMPLATE = RICO_EXTRATO_TEMPLATE

/**
 * All available CSV templates.
 */
export const CSV_TEMPLATES: Record<BankType, CSVTemplate | undefined> = {
    nubank: NUBANK_FATURA_TEMPLATE,  // Default to fatura (more common)
    inter: INTER_TEMPLATE,
    picpay: PICPAY_TEMPLATE,
    rico: RICO_TEMPLATE,
    // Banks that don't use CSV (or not yet supported)
    itau: undefined,
    bb: undefined,
    bradesco: undefined,
    santander: undefined,
    caixa: undefined,
    c6: undefined,
    btg: undefined,
    unknown: undefined,
}

/**
 * Attempts to detect which bank a CSV file is from.
 */
export function detectBankFromCSV(content: string): BankType {
    const lowerContent = content.toLowerCase()
    const firstLine = content.split('\n')[0]?.toLowerCase() || ''

    // Check for bank identifiers in headers or content
    if (lowerContent.includes('nubank') || lowerContent.includes('nu pagamentos')) return 'nubank'
    if (lowerContent.includes('inter') || lowerContent.includes('banco inter')) return 'inter'
    if (lowerContent.includes('picpay')) return 'picpay'

    // Nubank fatura format: date,category,title,amount (4 columns)
    if (firstLine.includes('date') && firstLine.includes('title') && firstLine.includes('amount')) return 'nubank'

    // Try to detect by column structure
    if (firstLine.includes('identificador') && firstLine.includes('descrição')) return 'nubank'
    if (firstLine.includes('lançamento') && firstLine.includes('histórico')) return 'inter'

    // Detect by column count and format
    const columns = firstLine.split(',')
    if (columns.length === 4) {
        // Check if first column looks like ISO date (YYYY-MM-DD)
        const secondLine = content.split('\n')[1] || ''
        if (secondLine.match(/^\d{4}-\d{2}-\d{2}/)) {
            return 'nubank'  // Nubank fatura uses ISO dates
        }
    }

    return 'unknown'
}

/**
 * Detects the best template based on content analysis.
 * If sourceType is provided, it forces the appropriate template.
 */
function detectTemplate(content: string, bank: BankType, sourceType?: FileSourceType): CSVTemplate | undefined {
    const firstDataLine = content.split('\n')[1] || ''

    if (bank === 'nubank') {
        // If user explicitly selected source type, use that
        if (sourceType === 'fatura') {
            console.log('[CSV Parser] Using Nubank FATURA template (user selected)')
            return NUBANK_FATURA_TEMPLATE
        }
        if (sourceType === 'extrato') {
            console.log('[CSV Parser] Using Nubank EXTRATO template (user selected)')
            return NUBANK_EXTRATO_TEMPLATE
        }

        // Auto-detect: Check if it's ISO date format (YYYY-MM-DD) = fatura style
        if (firstDataLine.match(/^\d{4}-\d{2}-\d{2}/)) {
            console.log('[CSV Parser] Auto-detected Nubank FATURA (ISO date)')
            return NUBANK_FATURA_TEMPLATE
        }
        // Otherwise use extrato template
        console.log('[CSV Parser] Auto-detected Nubank EXTRATO (BR date)')
        return NUBANK_EXTRATO_TEMPLATE
    }

    if (bank === 'inter') {
        // If user explicitly selected source type, use that
        if (sourceType === 'fatura') {
            console.log('[CSV Parser] Using Inter FATURA template (user selected)')
            return INTER_FATURA_TEMPLATE
        }
        if (sourceType === 'extrato') {
            console.log('[CSV Parser] Using Inter EXTRATO template (user selected)')
            return INTER_EXTRATO_TEMPLATE
        }

        // Auto-detect: Check if content has "Extrato Conta Corrente" header
        if (content.toLowerCase().includes('extrato conta corrente')) {
            console.log('[CSV Parser] Auto-detected Inter EXTRATO')
            return INTER_EXTRATO_TEMPLATE
        }
        // Check for fatura format (has "Lançamento","Categoria","Tipo","Valor")
        if (content.toLowerCase().includes('categoria') && content.toLowerCase().includes('tipo')) {
            console.log('[CSV Parser] Auto-detected Inter FATURA')
            return INTER_FATURA_TEMPLATE
        }
        // Default to extrato
        console.log('[CSV Parser] Defaulting to Inter EXTRATO')
        return INTER_EXTRATO_TEMPLATE
    }

    if (bank === 'rico') {
        // If user explicitly selected source type, use that
        if (sourceType === 'fatura') {
            console.log('[CSV Parser] Using Rico FATURA template (user selected)')
            return RICO_FATURA_TEMPLATE
        }
        if (sourceType === 'extrato') {
            console.log('[CSV Parser] Using Rico EXTRATO template (user selected)')
            return RICO_EXTRATO_TEMPLATE
        }

        // Auto-detect: Fatura has "Estabelecimento" and "Portador" columns
        if (content.toLowerCase().includes('estabelecimento') && content.toLowerCase().includes('portador')) {
            console.log('[CSV Parser] Auto-detected Rico FATURA')
            return RICO_FATURA_TEMPLATE
        }
        // Default to extrato
        console.log('[CSV Parser] Defaulting to Rico EXTRATO')
        return RICO_EXTRATO_TEMPLATE
    }

    return CSV_TEMPLATES[bank]
}

/**
 * Parses a date string based on the format.
 */
function parseCSVDate(dateStr: string, format: CSVTemplate['dateFormat']): Date | null {
    if (!dateStr) return null

    const cleanDate = dateStr.trim()

    // Handle ISO format (YYYY-MM-DD)
    if (format === 'YYYY-MM-DD' || cleanDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parts = cleanDate.split('-')
        if (parts.length >= 3) {
            const year = parseInt(parts[0])
            const month = parseInt(parts[1]) - 1
            const day = parseInt(parts[2])
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                return new Date(year, month, day)
            }
        }
    }

    const parts = cleanDate.split(/[\/\-]/)
    if (parts.length !== 3) return null

    let year: number, month: number, day: number

    switch (format) {
        case 'DD/MM/YYYY':
            day = parseInt(parts[0])
            month = parseInt(parts[1]) - 1
            year = parseInt(parts[2])
            break
        case 'MM/DD/YYYY':
            month = parseInt(parts[0]) - 1
            day = parseInt(parts[1])
            year = parseInt(parts[2])
            break
        default:
            return null
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null
    if (year < 100) year += 2000 // Handle 2-digit years

    return new Date(year, month, day)
}

/**
 * Parses Brazilian number format correctly.
 * Handles: "1.234,56" -> 1234.56
 *          "-1.234,56" -> -1234.56
 *          "1234.56" -> 1234.56
 *          "1234,56" -> 1234.56
 *          "R$ 402,80" -> 402.80
 *          "-R$ 402,80" -> -402.80
 */
function parseBrazilianNumber(value: string): number {
    if (!value) return NaN

    let cleanValue = value.trim()

    // Remove currency prefix (R$, $, etc)
    cleanValue = cleanValue.replace(/R\$\s*/gi, '').trim()

    // Check for negative sign (can be before or after R$)
    const isNegative = cleanValue.startsWith('-') || value.trim().startsWith('-')
    cleanValue = cleanValue.replace(/^-/, '').trim()

    // Detect if it's Brazilian format (uses comma as decimal)
    const hasComma = cleanValue.includes(',')
    const hasDot = cleanValue.includes('.')

    if (hasComma && hasDot) {
        // Brazilian format: 1.234,56 -> remove dots, replace comma with dot
        cleanValue = cleanValue.replace(/\./g, '').replace(',', '.')
    } else if (hasComma && !hasDot) {
        // Just comma as decimal: 1234,56 -> replace comma with dot
        cleanValue = cleanValue.replace(',', '.')
    }
    // If only dots, it's already US format (1234.56)

    // Remove any remaining non-numeric chars except . and -
    cleanValue = cleanValue.replace(/[^\d.]/g, '')

    const result = parseFloat(cleanValue)
    return isNegative ? -result : result
}

/**
 * Gets column value by index or name.
 */
function getColumnValue(
    row: string[],
    headers: string[],
    column: number | string
): string {
    if (typeof column === 'number') {
        return row[column] || ''
    }

    // Find by header name
    const index = headers.findIndex(h =>
        h.toLowerCase().includes(column.toLowerCase())
    )
    return index >= 0 ? row[index] || '' : ''
}

/**
 * Auto-detects the delimiter used in CSV.
 */
function detectDelimiter(content: string): ',' | ';' | '\t' {
    const firstLine = content.split('\n')[0] || ''

    const commaCount = (firstLine.match(/,/g) || []).length
    const semicolonCount = (firstLine.match(/;/g) || []).length
    const tabCount = (firstLine.match(/\t/g) || []).length

    if (semicolonCount > commaCount && semicolonCount > tabCount) return ';'
    if (tabCount > commaCount && tabCount > semicolonCount) return '\t'
    return ','
}

/**
 * Parses CSV content using a specific bank template.
 * 
 * @param content - The raw CSV file content
 * @param bank - The bank to use template for (auto-detects if not provided)
 * @param sourceType - The source type (extrato/fatura) to force template selection
 * @returns ParseResult with transactions
 */
export async function parseCSV(
    content: string,
    bank?: BankType,
    sourceType?: FileSourceType
): Promise<ParseResult> {
    const transactions: ParsedTransaction[] = []
    const errors: string[] = []

    // Detect bank if not provided
    const detectedBank = bank || detectBankFromCSV(content)

    // Get appropriate template (uses sourceType if provided)
    const template = detectTemplate(content, detectedBank, sourceType)

    if (!template) {
        return {
            transactions: [],
            successCount: 0,
            errorCount: 1,
            errors: [`Banco "${detectedBank}" não tem template CSV configurado.`],
            detectedBank,
        }
    }

    // Auto-detect delimiter if needed
    let delimiter = template.autoDelimiter ? detectDelimiter(content) : template.delimiter
    let processedContent = content

    // For Inter files, pre-process to remove embedded quotes that break CSV parsing
    if (detectedBank === 'inter') {
        // Remove all double quotes from the content - Inter has embedded quotes like "08834" in descriptions
        processedContent = content.replace(/"/g, '')
        // Force semicolon delimiter for Inter extrato
        if (sourceType === 'extrato' || content.toLowerCase().includes('extrato conta corrente')) {
            delimiter = ';'
        }
        console.log('[CSV Parser] Inter: Removed embedded quotes, using delimiter:', delimiter)
    }

    // Parse CSV
    const parsed = Papa.parse<string[]>(processedContent, {
        delimiter,
        skipEmptyLines: true,
    })

    if (parsed.errors.length > 0) {
        errors.push(...parsed.errors.map(e => `Linha ${e.row}: ${e.message}`))
    }

    const rows = parsed.data
    const headers = rows[0] || []
    const dataRows = rows.slice(template.skipRows)

    console.log(`[CSV Parser] Bank: ${detectedBank}, Template: ${template.dateFormat}, Rows: ${dataRows.length}`)

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]
        const lineNumber = i + template.skipRows + 1

        try {
            // Extract values
            const dateStr = getColumnValue(row, headers, template.dateColumn)
            const amountStr = getColumnValue(row, headers, template.amountColumn)
            const description = getColumnValue(row, headers, template.descriptionColumn)
            const title = template.titleColumn
                ? getColumnValue(row, headers, template.titleColumn)
                : ''

            // Parse date
            const date = parseCSVDate(dateStr.trim(), template.dateFormat)
            if (!date) {
                errors.push(`Linha ${lineNumber}: Data inválida "${dateStr}"`)
                continue
            }

            // Parse amount using Brazilian number handling
            const amount = parseBrazilianNumber(amountStr)

            if (isNaN(amount)) {
                errors.push(`Linha ${lineNumber}: Valor inválido "${amountStr}"`)
                continue
            }

            // Determine type based on template configuration
            let type: 'income' | 'expense'

            if (template.negativeForExpense) {
                // Standard: negative = expense, positive = income (extrato)
                type = amount < 0 ? 'expense' : 'income'
            } else {
                // Fatura style: all positive amounts, ALL are expenses (cartão de crédito)
                // In fatura, you only see spending, not income
                type = 'expense'
            }

            // Build description: prefer title, use category as fallback
            const fullDescription = title || description || 'Sem descrição'

            // Extract name and payment method from the description
            // Pass sourceType to detect credit card for fatura files
            const extracted = extractTransactionData(fullDescription, sourceType)

            const transaction: ParsedTransaction = {
                date,
                amount: Math.abs(amount),
                description: extracted.fullDescription.trim(),
                name: extracted.name,
                paymentMethod: extracted.paymentMethod,
                type,
                raw: row.join(delimiter).substring(0, 200),
                confidence: 0.9,
            }

            // Validate
            const validation = CSVTransactionSchema.safeParse(transaction)
            if (!validation.success) {
                errors.push(`Linha ${lineNumber}: ${validation.error.issues[0]?.message}`)
                continue
            }

            transactions.push(transaction)

        } catch (err: any) {
            errors.push(`Linha ${lineNumber}: Erro ao processar - ${err.message}`)
        }
    }

    return {
        transactions,
        successCount: transactions.length,
        errorCount: errors.length,
        errors,
        detectedBank,
    }
}

/**
 * Checks if content looks like a valid CSV file.
 */
export function isValidCSV(content: string): boolean {
    // Basic checks
    if (!content || content.length < 10) return false

    // Should have multiple lines
    const lines = content.split('\n')
    if (lines.length < 2) return false

    // First line should have delimiters
    const firstLine = lines[0]
    return firstLine.includes(',') || firstLine.includes(';') || firstLine.includes('\t')
}
