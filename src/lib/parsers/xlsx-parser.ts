/**
 * @fileoverview XLSX Parser - Parses Excel files from Brazilian banks.
 * 
 * Excel is used by traditional banks like Itaú for exporting statements.
 * 
 * @module parsers/xlsx-parser
 */

import * as XLSX from 'xlsx'
import { z } from 'zod'
import { ParsedTransaction, ParseResult, BankType, FileSourceType } from './types'
import { extractTransactionData } from './description-extractor'

/**
 * Zod schema for validating parsed XLSX transactions.
 */
export const XLSXTransactionSchema = z.object({
    date: z.date(),
    amount: z.number(),
    description: z.string(),
    name: z.string(),
    type: z.enum(['income', 'expense']),
    raw: z.string(),
    confidence: z.number().min(0).max(1),
})

/**
 * Template configuration for parsing bank-specific XLSX formats.
 */
export interface XLSXTemplate {
    bank: BankType
    /** Sheet name or index to read (0-indexed) */
    sheetName?: string
    sheetIndex?: number
    /** Column index for date (0-indexed) */
    dateColumn: number
    /** Column index for description/lançamento */
    descriptionColumn: number
    /** Column index for amount/valor */
    amountColumn: number
    /** Column index for origin (optional) */
    originColumn?: number
    /** Row to start reading data (skip headers) */
    startRow: number
    /** Date format */
    dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD'
    /** Rows to skip based on description patterns */
    skipPatterns: RegExp[]
    /** Whether positive amounts are income */
    positiveIsIncome: boolean
}

/**
 * Itaú Excel template for EXTRATO (bank statement).
 * Real format from user:
 * - Sheet: "Lançamentos"
 * - Columns: data | lançamento | ag./origem | valor (R$) | saldos (R$)
 * - Date: DD/MM/YYYY
 * - Positive values = income (e.g., PIX received)
 * - Skip rows: "SALDO ANTERIOR", "SALDO TOTAL DISPONÍVEL"
 */
export const ITAU_EXTRATO_TEMPLATE: XLSXTemplate = {
    bank: 'itau',
    sheetName: 'Lançamentos',
    sheetIndex: 0,  // Fallback to first sheet
    dateColumn: 0,           // data
    descriptionColumn: 1,    // lançamento
    originColumn: 2,         // ag./origem
    amountColumn: 3,         // valor (R$)
    startRow: 2,             // Skip header row and "lançamentos" label
    dateFormat: 'DD/MM/YYYY',
    skipPatterns: [
        /^SALDO\s+(ANTERIOR|TOTAL|DISPONÍVEL|INICIAL)/i,
        /^SALDO\s+DO\s+DIA/i,
        /^lançamentos?$/i,
    ],
    positiveIsIncome: true,
}

/**
 * All available XLSX templates.
 */
export const XLSX_TEMPLATES: Record<BankType, XLSXTemplate | undefined> = {
    itau: ITAU_EXTRATO_TEMPLATE,
    bb: undefined,
    bradesco: undefined,
    santander: undefined,
    caixa: undefined,
    nubank: undefined,
    inter: undefined,
    c6: undefined,
    btg: undefined,  // BTG uses XLSX but format TBD
    picpay: undefined,
    unknown: undefined,
}

/**
 * Detects bank from XLSX content.
 */
export function detectBankFromXLSX(workbook: XLSX.WorkBook): BankType {
    // Check sheet names
    const sheetNames = workbook.SheetNames.map(s => s.toLowerCase())

    // Itaú typically has "Lançamentos", "Posição Consolidada", "Limites" sheets
    if (sheetNames.includes('lançamentos') || sheetNames.includes('lancamentos')) {
        return 'itau'
    }

    // Check first sheet content for bank identifiers
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    if (firstSheet) {
        const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1')
        for (let r = 0; r <= Math.min(5, range.e.r); r++) {
            for (let c = 0; c <= Math.min(5, range.e.c); c++) {
                const cellAddr = XLSX.utils.encode_cell({ r, c })
                const cell = firstSheet[cellAddr]
                if (cell?.v) {
                    const value = String(cell.v).toLowerCase()
                    if (value.includes('itaú') || value.includes('itau')) return 'itau'
                    if (value.includes('banco do brasil')) return 'bb'
                    if (value.includes('bradesco')) return 'bradesco'
                    if (value.includes('santander')) return 'santander'
                    if (value.includes('caixa')) return 'caixa'
                    if (value.includes('btg')) return 'btg'
                }
            }
        }
    }

    return 'unknown'
}

/**
 * Parses a date from Excel.
 * Excel stores dates as serial numbers, but may also be strings.
 */
function parseXLSXDate(value: any, format: XLSXTemplate['dateFormat']): Date | null {
    if (!value) return null

    // Excel serial date number
    if (typeof value === 'number') {
        // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
        const excelEpoch = new Date(1899, 11, 30)  // Dec 30, 1899
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
        return date
    }

    // String date
    const dateStr = String(value).trim()

    // Try DD/MM/YYYY format
    const brMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (brMatch) {
        const day = parseInt(brMatch[1])
        const month = parseInt(brMatch[2]) - 1
        const year = parseInt(brMatch[3])
        return new Date(year, month, day)
    }

    // Try YYYY-MM-DD format
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
        const year = parseInt(isoMatch[1])
        const month = parseInt(isoMatch[2]) - 1
        const day = parseInt(isoMatch[3])
        return new Date(year, month, day)
    }

    return null
}

/**
 * Parses Brazilian number format.
 * Handles: "1.234,56" -> 1234.56
 *          "1234,56" -> 1234.56
 *          "1234.56" -> 1234.56
 */
function parseBrazilianNumber(value: any): number {
    if (typeof value === 'number') return value
    if (!value) return NaN

    let cleanValue = String(value).trim()

    // Remove R$ prefix if present
    cleanValue = cleanValue.replace(/^R\$\s*/i, '')

    // Detect Brazilian format
    const hasComma = cleanValue.includes(',')
    const hasDot = cleanValue.includes('.')

    if (hasComma && hasDot) {
        // Brazilian: 1.234,56 -> remove dots, replace comma
        cleanValue = cleanValue.replace(/\./g, '').replace(',', '.')
    } else if (hasComma) {
        // Just comma as decimal
        cleanValue = cleanValue.replace(',', '.')
    }

    // Remove non-numeric except . and -
    cleanValue = cleanValue.replace(/[^\d.\-]/g, '')

    return parseFloat(cleanValue)
}

/**
 * Parses an XLSX file buffer.
 * 
 * @param buffer - The file buffer
 * @param bank - Optional bank hint
 * @param sourceType - Optional source type hint
 * @returns ParseResult with transactions
 */
export async function parseXLSX(
    buffer: Buffer | ArrayBuffer,
    bank?: BankType,
    sourceType?: FileSourceType
): Promise<ParseResult> {
    const transactions: ParsedTransaction[] = []
    const errors: string[] = []

    try {
        // Read workbook
        const workbook = XLSX.read(buffer, { type: 'buffer' })

        // Detect bank if not provided
        const detectedBank = bank || detectBankFromXLSX(workbook)

        console.log(`[XLSX Parser] Detected bank: ${detectedBank}`)
        console.log(`[XLSX Parser] Sheets: ${workbook.SheetNames.join(', ')}`)

        // Get template
        const template = XLSX_TEMPLATES[detectedBank]

        if (!template) {
            return {
                transactions: [],
                successCount: 0,
                errorCount: 1,
                errors: [`Banco "${detectedBank}" não tem template XLSX configurado.`],
                detectedBank,
            }
        }

        // Find the correct sheet
        let sheet: XLSX.WorkSheet | undefined
        if (template.sheetName && workbook.SheetNames.includes(template.sheetName)) {
            sheet = workbook.Sheets[template.sheetName]
        } else if (template.sheetIndex !== undefined) {
            sheet = workbook.Sheets[workbook.SheetNames[template.sheetIndex]]
        } else {
            sheet = workbook.Sheets[workbook.SheetNames[0]]
        }

        if (!sheet) {
            return {
                transactions: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Não foi possível encontrar a planilha de lançamentos.'],
                detectedBank,
            }
        }

        // Get sheet range
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')

        console.log(`[XLSX Parser] Range: ${sheet['!ref']}, Rows: ${range.e.r + 1}`)

        // Process rows
        for (let r = template.startRow; r <= range.e.r; r++) {
            try {
                // Get cell values
                const dateCell = sheet[XLSX.utils.encode_cell({ r, c: template.dateColumn })]
                const descCell = sheet[XLSX.utils.encode_cell({ r, c: template.descriptionColumn })]
                const amountCell = sheet[XLSX.utils.encode_cell({ r, c: template.amountColumn })]
                const originCell = template.originColumn !== undefined
                    ? sheet[XLSX.utils.encode_cell({ r, c: template.originColumn })]
                    : undefined

                const dateValue = dateCell?.v
                const description = descCell?.v ? String(descCell.v).trim() : ''
                const amountValue = amountCell?.v
                const origin = originCell?.v ? String(originCell.v).trim() : ''

                // Skip empty rows
                if (!description && !amountValue) continue

                // Skip special rows (SALDO ANTERIOR, etc.)
                const shouldSkip = template.skipPatterns.some(pattern =>
                    pattern.test(description)
                )
                if (shouldSkip) {
                    console.log(`[XLSX Parser] Skipping row ${r + 1}: "${description}"`)
                    continue
                }

                // Parse date
                const date = parseXLSXDate(dateValue, template.dateFormat)
                if (!date) {
                    // If no date but has description, might be a continuation row - skip
                    if (description && !amountValue) continue
                    errors.push(`Linha ${r + 1}: Data inválida "${dateValue}"`)
                    continue
                }

                // Parse amount
                const amount = parseBrazilianNumber(amountValue)
                if (isNaN(amount) || amount === 0) {
                    // Skip zero amount rows (usually just info rows)
                    continue
                }

                // Determine type based on template
                let type: 'income' | 'expense'
                if (template.positiveIsIncome) {
                    type = amount >= 0 ? 'income' : 'expense'
                } else {
                    type = amount <= 0 ? 'income' : 'expense'
                }

                // Build full description
                const fullDescription = origin
                    ? `${description} - ${origin}`.trim()
                    : description

                // Extract name and payment method
                const extracted = extractTransactionData(fullDescription, sourceType)

                const transaction: ParsedTransaction = {
                    date,
                    amount: Math.abs(amount),
                    description: extracted.fullDescription.trim(),
                    name: extracted.name,
                    paymentMethod: extracted.paymentMethod,
                    type,
                    raw: `${dateValue}|${description}|${origin}|${amountValue}`,
                    confidence: 0.95,
                }

                // Validate
                const validation = XLSXTransactionSchema.safeParse(transaction)
                if (!validation.success) {
                    errors.push(`Linha ${r + 1}: ${validation.error.issues[0]?.message}`)
                    continue
                }

                transactions.push(transaction)

            } catch (err: any) {
                errors.push(`Linha ${r + 1}: Erro ao processar - ${err.message}`)
            }
        }

        return {
            transactions,
            successCount: transactions.length,
            errorCount: errors.length,
            errors,
            detectedBank,
            detectedType: sourceType || 'extrato',
        }

    } catch (err: any) {
        return {
            transactions: [],
            successCount: 0,
            errorCount: 1,
            errors: [`Erro ao ler arquivo Excel: ${err.message}`],
        }
    }
}

/**
 * Validates that a buffer is a valid XLSX/XLS file.
 */
export function isValidXLSX(buffer: Buffer | ArrayBuffer): boolean {
    try {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        return workbook.SheetNames.length > 0
    } catch {
        return false
    }
}
