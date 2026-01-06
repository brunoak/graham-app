/**
 * @fileoverview OFX Parser - Parses Open Financial Exchange files.
 * 
 * OFX is the standard format for Brazilian bank statements.
 * Supported banks: Itaú, BB, Bradesco, Santander, Caixa, Inter, C6, BTG, Nubank
 * 
 * @module parsers/ofx-parser
 * @see https://www.ofx.org/
 */

import { z } from 'zod'
import { ParsedTransaction, ParseResult, BankType } from './types'
import { extractTransactionData } from './description-extractor'

/**
 * Zod schema for validating parsed OFX transactions.
 */
export const OFXTransactionSchema = z.object({
    date: z.date(),
    amount: z.number(),
    description: z.string(),
    name: z.string(),
    type: z.enum(['income', 'expense']),
    raw: z.string(),
    confidence: z.number().min(0).max(1),
})

/**
 * Bank code mappings for Brazilian banks.
 */
const BANK_CODES: Record<string, BankType> = {
    '0341': 'itau',
    '341': 'itau',
    '001': 'bb',
    '0001': 'bb',
    '0237': 'bradesco',
    '237': 'bradesco',
    '0033': 'santander',
    '033': 'santander',
    '33': 'santander',
    '0104': 'caixa',
    '104': 'caixa',
    '0077': 'inter',
    '077': 'inter',
    '77': 'inter',
    '0336': 'c6',
    '336': 'c6',
    '0208': 'btg',
    '208': 'btg',
    '0260': 'nubank',
    '260': 'nubank',
}

/**
 * Extracts bank ID from OFX content.
 * Uses multiple detection strategies.
 */
export function detectBankFromOFX(content: string): BankType {
    const upperContent = content.toUpperCase()

    // 1. Try to find bank code in BANKID or FID tags
    const bankIdMatch = content.match(/<BANKID>(\d+)/i) ||
        content.match(/<FID>(\d+)/i) ||
        content.match(/<ORG>.*?(\d{3,4})/i)

    if (bankIdMatch) {
        const code = bankIdMatch[1]
        if (BANK_CODES[code]) {
            return BANK_CODES[code]
        }
    }

    // 2. Check for bank names
    if (upperContent.includes('ITAU') || upperContent.includes('ITAÚ')) return 'itau'
    if (upperContent.includes('NUBANK') || upperContent.includes('NU PAGAMENTOS')) return 'nubank'
    if (upperContent.includes('BANCO INTER') || upperContent.includes('INTERMEDIUM')) return 'inter'
    if (upperContent.includes('BANCO DO BRASIL') || upperContent.includes('BB ')) return 'bb'
    if (upperContent.includes('BRADESCO')) return 'bradesco'
    if (upperContent.includes('SANTANDER')) return 'santander'
    if (upperContent.includes('CAIXA ECONOMICA') || upperContent.includes('CEF')) return 'caixa'
    if (upperContent.includes('C6 BANK') || upperContent.includes('C6BANK')) return 'c6'
    if (upperContent.includes('BTG')) return 'btg'

    // 3. Check ORG tag
    const orgMatch = content.match(/<ORG>([^<\r\n]+)/i)
    if (orgMatch) {
        const org = orgMatch[1].toUpperCase()
        if (org.includes('ITAU')) return 'itau'
        if (org.includes('NUBANK') || org.includes('NU')) return 'nubank'
        if (org.includes('INTER')) return 'inter'
        if (org.includes('BRASIL') || org.includes('BB')) return 'bb'
        if (org.includes('BRADESCO')) return 'bradesco'
        if (org.includes('SANTANDER')) return 'santander'
        if (org.includes('CAIXA')) return 'caixa'
        if (org.includes('C6')) return 'c6'
        if (org.includes('BTG')) return 'btg'
    }

    return 'unknown'
}

/**
 * Gets the display name for a bank.
 */
export function getBankDisplayName(bank: BankType): string {
    const names: Record<BankType, string> = {
        itau: 'Itaú',
        bb: 'Banco do Brasil',
        bradesco: 'Bradesco',
        santander: 'Santander',
        caixa: 'Caixa Econômica',
        nubank: 'Nubank',
        inter: 'Banco Inter',
        c6: 'C6 Bank',
        btg: 'BTG Pactual',
        picpay: 'PicPay',
        unknown: 'Banco',
    }
    return names[bank] || 'Banco'
}

/**
 * Parses a date string in OFX format (YYYYMMDD or YYYYMMDDHHMMSS).
 */
function parseOFXDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.length < 8) return null

    // OFX dates are in format YYYYMMDD or YYYYMMDDHHMMSS[TZ]
    const cleanDate = dateStr.replace(/\[.*\]/, '') // Remove timezone info

    const year = parseInt(cleanDate.substring(0, 4))
    const month = parseInt(cleanDate.substring(4, 6)) - 1 // JS months are 0-indexed
    const day = parseInt(cleanDate.substring(6, 8))

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null

    return new Date(year, month, day)
}

/**
 * Extracts value from an OFX tag.
 * Example: "<TRNAMT>-50.00" returns "-50.00"
 */
function extractTagValue(content: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i')
    const match = content.match(regex)
    return match ? match[1].trim() : null
}

/**
 * Parses raw OFX content and extracts transactions.
 */
export async function parseOFX(content: string): Promise<ParseResult> {
    const transactions: ParsedTransaction[] = []
    const errors: string[] = []

    // Detect bank for logging/debugging
    const detectedBank = detectBankFromOFX(content)

    console.log(`[OFX Parser] Detected bank: ${detectedBank} (${getBankDisplayName(detectedBank)})`)

    // Split by STMTTRN tags (each transaction block)
    const transactionBlocks = content.split(/<STMTTRN>/i).slice(1)

    console.log(`[OFX Parser] Found ${transactionBlocks.length} transactions`)

    for (let i = 0; i < transactionBlocks.length; i++) {
        const block = transactionBlocks[i]
        const endIndex = block.indexOf('</STMTTRN>')
        const txContent = endIndex > 0 ? block.substring(0, endIndex) : block

        try {
            // Extract fields
            const dateStr = extractTagValue(txContent, 'DTPOSTED')
            const amountStr = extractTagValue(txContent, 'TRNAMT')
            const memo = extractTagValue(txContent, 'MEMO') || ''
            const name = extractTagValue(txContent, 'NAME') || ''
            const trnType = extractTagValue(txContent, 'TRNTYPE')
            const checkNum = extractTagValue(txContent, 'CHECKNUM') || ''

            // Parse date
            const date = dateStr ? parseOFXDate(dateStr) : null
            if (!date) {
                errors.push(`Transação ${i + 1}: Data inválida "${dateStr}"`)
                continue
            }

            // Parse amount
            const amount = amountStr ? parseFloat(amountStr.replace(',', '.')) : NaN
            if (isNaN(amount)) {
                errors.push(`Transação ${i + 1}: Valor inválido "${amountStr}"`)
                continue
            }

            // Determine type
            let type: 'income' | 'expense' = amount >= 0 ? 'income' : 'expense'

            // Some banks use TRNTYPE
            if (trnType) {
                const lowerType = trnType.toLowerCase()
                if (lowerType === 'credit' || lowerType === 'dep') {
                    type = 'income'
                } else if (lowerType === 'debit') {
                    type = 'expense'
                }
            }

            // Build description: prefer MEMO, fallback to NAME
            // Keep both separate for better display
            const fullDescription = memo || name || checkNum || 'Sem descrição'

            // Extract name and payment method from the description
            const extracted = extractTransactionData(fullDescription)

            const transaction: ParsedTransaction = {
                date,
                amount: Math.abs(amount),
                description: extracted.fullDescription.trim(),
                name: extracted.name,
                paymentMethod: extracted.paymentMethod,
                type,
                raw: txContent.substring(0, 200),
                confidence: 1.0,
            }

            // Validate with Zod
            const validation = OFXTransactionSchema.safeParse(transaction)
            if (!validation.success) {
                errors.push(`Transação ${i + 1}: ${validation.error.issues[0]?.message}`)
                continue
            }

            transactions.push(transaction)

        } catch (err: any) {
            errors.push(`Transação ${i + 1}: Erro ao processar - ${err.message}`)
        }
    }

    return {
        transactions,
        successCount: transactions.length,
        errorCount: errors.length,
        errors,
        detectedBank,
        detectedType: 'extrato',
    }
}

/**
 * Validates that a file is a valid OFX file.
 */
export function isValidOFX(content: string): boolean {
    return content.includes('<OFX>') ||
        content.includes('OFXHEADER') ||
        content.includes('<STMTTRN>')
}
