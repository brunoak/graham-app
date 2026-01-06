/**
 * @fileoverview Parser Factory - Detects file format and routes to correct parser.
 * 
 * This is the main entry point for parsing any import file.
 * It detects the format (OFX, CSV, PDF, XLSX) and calls the appropriate parser.
 * 
 * @module parsers/parser-factory
 */

import { ParseResult, FileFormat, BankType, FileSourceType } from './types'
import { parseOFX, isValidOFX, detectBankFromOFX } from './ofx-parser'
import { parseCSV, isValidCSV, detectBankFromCSV } from './csv-parser'
import { parseXLSX, isValidXLSX, detectBankFromXLSX } from './xlsx-parser'

// Re-export PDF parser for direct use (PDFs need Buffer, not string)
export { parsePDF, isValidPDF, detectBankFromPDF } from './pdf-parser'
// Re-export XLSX parser for direct use (XLSX needs Buffer, not string)
export { parseXLSX, isValidXLSX, detectBankFromXLSX } from './xlsx-parser'

/**
 * Detects the file format based on content and file extension.
 * 
 * @param fileName - The original file name (for extension check)
 * @param content - The file content as string
 * @returns The detected file format
 */
export function detectFileFormat(fileName: string, content: string): FileFormat {
    const extension = fileName.split('.').pop()?.toLowerCase()

    // Check by extension first
    switch (extension) {
        case 'ofx':
        case 'qfx':
            return 'ofx'
        case 'csv':
            return 'csv'
        case 'pdf':
            return 'pdf'
        case 'xlsx':
        case 'xls':
            return 'xlsx'
    }

    // Fallback: check content
    if (isValidOFX(content)) return 'ofx'
    if (isValidCSV(content)) return 'csv'

    // Default to CSV if can't detect
    return 'csv'
}

/**
 * Detects the bank from file content.
 */
export function detectBank(content: string, format: FileFormat): BankType {
    switch (format) {
        case 'ofx':
            return detectBankFromOFX(content)
        case 'csv':
            return detectBankFromCSV(content)
        default:
            return 'unknown'
    }
}

/**
 * Main parsing function - routes to the correct parser.
 * 
 * @param fileName - The original file name
 * @param content - The file content as string
 * @param options - Optional configuration
 * @returns ParseResult with transactions
 * 
 * @example
 * const content = await file.text()
 * const result = await parseFile('extrato.ofx', content)
 * console.log(result.transactions)
 */
export async function parseFile(
    fileName: string,
    content: string,
    options?: {
        bank?: BankType
        sourceType?: FileSourceType
    }
): Promise<ParseResult> {
    const format = detectFileFormat(fileName, content)

    switch (format) {
        case 'ofx':
            return parseOFX(content)

        case 'csv':
            return parseCSV(content, options?.bank, options?.sourceType)

        case 'pdf':
            // PDF requires Buffer, not string. Use parsePDF directly.
            return {
                transactions: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Para arquivos PDF, use a função parsePDF com Buffer ao invés de parseFile.'],
                detectedType: options?.sourceType,
            }

        case 'xlsx':
            // XLSX requires Buffer, not string. Use parseXLSX directly.
            return {
                transactions: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Para arquivos Excel (XLSX/XLS), use a função parseXLSX com Buffer ao invés de parseFile.'],
                detectedType: options?.sourceType,
            }

        default:
            return {
                transactions: [],
                successCount: 0,
                errorCount: 1,
                errors: [`Formato de arquivo não suportado: ${format}`],
            }
    }
}

/**
 * Gets supported formats for a specific bank and source type.
 */
export function getSupportedFormats(
    bank: BankType,
    sourceType: FileSourceType
): FileFormat[] {
    const formats: FileFormat[] = []

    // OFX support (extratos only, traditional banks + some fintechs)
    const ofxBanks: BankType[] = ['itau', 'bb', 'bradesco', 'santander', 'caixa', 'inter', 'c6', 'btg']
    if (sourceType === 'extrato' && ofxBanks.includes(bank)) {
        formats.push('ofx')
    }

    // CSV support
    const csvBanks: BankType[] = ['nubank', 'inter', 'picpay']
    if (csvBanks.includes(bank)) {
        formats.push('csv')
    }

    // PDF support (all banks for faturas, most for extratos)
    formats.push('pdf')

    // XLSX support (BTG only)
    const xlsxBanks: BankType[] = ['btg']
    if (xlsxBanks.includes(bank) && sourceType === 'extrato') {
        formats.push('xlsx')
    }

    return formats
}
