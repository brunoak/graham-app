/**
 * @fileoverview PDF Parser for bank statements and credit card bills.
 * 
 * Supports:
 * - Itaú Fatura (credit card bill)
 * - Itaú Extrato (bank statement)
 * 
 * Uses pdfjs-dist for text extraction and regex templates for each bank format.
 * 
 * @module parsers/pdf-parser
 */

import { ParseResult, ParsedTransaction, BankType, FileSourceType } from './types'
import { extractTransactionData } from './description-extractor'

/**
 * Checks if buffer is a valid PDF file.
 */
export function isValidPDF(buffer: Buffer): boolean {
    // PDF files start with %PDF-
    const header = buffer.slice(0, 5).toString('ascii')
    return header === '%PDF-'
}

/**
 * Extracts text from PDF using pdfjs-dist legacy (Node.js compatible).
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    // Use legacy build for Node.js (no DOM dependencies)
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')

    // Load document
    const data = new Uint8Array(buffer)
    const loadingTask = pdfjsLib.getDocument({
        data,
        useSystemFonts: true,
        isEvalSupported: false,
        disableFontFace: true,
    })
    const doc = await loadingTask.promise

    console.log('[PDF Debug] pdfjs-dist legacy loaded, pages:', doc.numPages)

    let fullText = ''

    // Extract text from each page
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()

        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ')

        console.log(`[PDF Debug] Page ${i}: ${pageText.length} chars`)
        fullText += pageText + '\n'
    }

    return fullText
}

/**
 * Detects bank from PDF text content.
 */
export function detectBankFromPDF(text: string): BankType {
    const upper = text.toUpperCase()

    // Itaú patterns
    if (upper.includes('ITAÚ') || upper.includes('ITAU') ||
        upper.includes('BANCO ITAÚ') || upper.includes('ITAÚ UNIBANCO') ||
        upper.includes('ITAUUNICLASS')) {
        return 'itau'
    }

    // Bradesco patterns
    if (upper.includes('BRADESCO')) {
        return 'bradesco'
    }

    // Banco do Brasil patterns
    if (upper.includes('BANCO DO BRASIL') || upper.includes('BB S.A')) {
        return 'bb'
    }

    // Santander patterns
    if (upper.includes('SANTANDER')) {
        return 'santander'
    }

    // Caixa patterns
    if (upper.includes('CAIXA ECONOMICA') || upper.includes('CEF')) {
        return 'caixa'
    }

    // Inter patterns
    if (upper.includes('BANCO INTER') || upper.includes('INTER S.A')) {
        return 'inter'
    }

    // C6 patterns
    if (upper.includes('C6 BANK')) {
        return 'c6'
    }

    // BTG patterns
    if (upper.includes('BTG PACTUAL')) {
        return 'btg'
    }

    return 'unknown'
}

/**
 * Detects if PDF is fatura (credit card) or extrato (statement).
 */
export function detectSourceType(text: string): FileSourceType {
    const upper = text.toUpperCase()

    // Fatura indicators
    if (upper.includes('FATURA') ||
        upper.includes('CARTÃO DE CRÉDITO') ||
        upper.includes('TOTAL DA SUA FATURA') ||
        upper.includes('LANÇAMENTOS: COMPRAS E SAQUES') ||
        upper.includes('VALOR DA FATURA')) {
        return 'fatura'
    }

    // Extrato indicators
    if (upper.includes('EXTRATO') ||
        upper.includes('CONTA CORRENTE') ||
        upper.includes('SALDO ANTERIOR') ||
        upper.includes('EXTRATO BANCÁRIO')) {
        return 'extrato'
    }

    return 'extrato' // Default
}

/**
 * Extracts year from PDF text (from vencimento or emissão date).
 */
function extractYear(text: string): number {
    // Try to find vencimento date: "Vencimento: DD/MM/YYYY" or "vencimento em: DD/MM/YYYY"
    const vencimentoMatch = text.match(/vencimento[:\s]+(\d{2}\/\d{2}\/(\d{4}))/i)
    if (vencimentoMatch) {
        return parseInt(vencimentoMatch[2])
    }

    // Try período: "período de visualização: ... de DD/MM/YYYY a DD/MM/YYYY"
    const periodoMatch = text.match(/(\d{2}\/\d{2}\/(\d{4}))\s*a\s*(\d{2}\/\d{2}\/\d{4})/i)
    if (periodoMatch) {
        return parseInt(periodoMatch[2])
    }

    // Default to current year
    return new Date().getFullYear()
}

/**
 * Simple name extraction from description (for PDF).
 */
function extractNameFromDescription(description: string): string {
    let text = description.trim()

    // Remove parcela info (XX/YY at end)
    text = text.replace(/\s+\d{2}\/\d{2}$/, '')

    // Limit to 40 chars
    if (text.length > 40) {
        text = text.substring(0, 40).replace(/\s+\S*$/, '').trim()
    }

    return text
}

/**
 * Parses Itaú credit card bill (fatura).
 */
function parseItauFatura(text: string): ParseResult {
    const transactions: ParsedTransaction[] = []
    const errors: string[] = []
    const year = extractYear(text)

    const lines = text.split('\n')
    const transactionRegex = /(\d{2}\/\d{2})\s+(.+?)\s+([\d.]+,\d{2})\s*$/

    for (const line of lines) {
        if (line.includes('DATA') && line.includes('ESTABELECIMENTO')) continue
        if (line.includes('Lançamentos no cartão')) continue
        if (line.includes('Total dos lançamentos')) continue
        if (line.trim().length < 10) continue

        const match = line.match(transactionRegex)
        if (!match) continue

        const [, dateStr, description, valueStr] = match
        const [day, month] = dateStr.split('/').map(Number)

        let txYear = year
        const vencimentoMatch = text.match(/vencimento[:\s]+\d{2}\/(\d{2})\/\d{4}/i)
        if (vencimentoMatch) {
            const billMonth = parseInt(vencimentoMatch[1])
            if (month > billMonth + 3) txYear = year - 1
        }

        const date = new Date(txYear, month - 1, day)
        if (isNaN(date.getTime())) continue

        const amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'))
        if (isNaN(amount) || amount <= 0) continue

        let cleanDesc = description.trim()
        const parcelaMatch = cleanDesc.match(/\s+(\d{2}\/\d{2})$/)
        let paymentMethod = 'Cartão de crédito'
        if (parcelaMatch) {
            paymentMethod = `Cartão de crédito (${parcelaMatch[1]})`
            cleanDesc = cleanDesc.replace(/\s+\d{2}\/\d{2}$/, '').trim()
        }

        transactions.push({
            date,
            amount,
            description: cleanDesc,
            name: extractNameFromDescription(cleanDesc),
            paymentMethod,
            type: 'expense',
            raw: line,
            confidence: 0.85,
        })
    }

    if (transactions.length === 0) {
        errors.push('Nenhuma transação encontrada nesta fatura.')
    }

    return {
        transactions,
        successCount: transactions.length,
        errorCount: errors.length,
        errors,
        detectedBank: 'itau',
        detectedType: 'fatura',
    }
}

/**
 * Parses Itaú bank statement (extrato).
 */
function parseItauExtrato(text: string): ParseResult {
    const transactions: ParsedTransaction[] = []
    const errors: string[] = []

    const lines = text.split('\n')
    const transactionRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?[\d.]+,\d{2})\s+([-]?[\d.]+,\d{2})/
    const altRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([-]?[\d.]+,\d{2})\s*$/

    for (const line of lines) {
        if (line.includes('SALDO ANTERIOR')) continue
        if (line.includes('data') && line.includes('lançamentos')) continue
        if (line.trim().length < 15) continue

        const match = line.match(transactionRegex) || line.match(altRegex)
        if (!match) continue

        const [, dateStr, description, valueStr] = match
        const [day, month, year] = dateStr.split('/').map(Number)
        const date = new Date(year, month - 1, day)

        if (isNaN(date.getTime())) continue

        let amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'))
        if (isNaN(amount)) continue

        const type = amount < 0 ? 'expense' : 'income'
        amount = Math.abs(amount)
        if (amount === 0) continue

        const cleanDesc = description.trim()
        const extracted = extractTransactionData(cleanDesc, 'extrato')

        transactions.push({
            date,
            amount,
            description: cleanDesc,
            name: extracted.name,
            paymentMethod: extracted.paymentMethod,
            type,
            raw: line,
            confidence: 0.85,
        })
    }

    if (transactions.length === 0) {
        errors.push('Nenhuma transação encontrada neste extrato.')
    }

    return {
        transactions,
        successCount: transactions.length,
        errorCount: errors.length,
        errors,
        detectedBank: 'itau',
        detectedType: 'extrato',
    }
}

/**
 * Main PDF parsing function.
 */
export async function parsePDF(
    buffer: Buffer,
    bank?: BankType,
    sourceType?: FileSourceType
): Promise<ParseResult> {
    try {
        console.log('[PDF Debug] Step 1: Validating PDF header...')
        if (!isValidPDF(buffer)) {
            return {
                transactions: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Arquivo não é um PDF válido.'],
            }
        }
        console.log('[PDF Debug] Step 1: PDF header valid ✓')

        console.log('[PDF Debug] Step 2: Extracting text with pdfjs-dist...')
        const text = await extractTextFromPDF(buffer)
        console.log('[PDF Debug] Step 2: Text extracted ✓, length:', text.length)

        if (!text || text.trim().length === 0) {
            return {
                transactions: [],
                successCount: 0,
                errorCount: 1,
                errors: ['Não foi possível extrair texto do PDF.'],
            }
        }

        console.log('[PDF Debug] Extracted text preview:')
        console.log(text.substring(0, 2000))

        const detectedBank = bank || detectBankFromPDF(text)
        const detectedType = sourceType || detectSourceType(text)
        console.log('[PDF Debug] Detected bank:', detectedBank, ', type:', detectedType)

        switch (detectedBank) {
            case 'itau':
                if (detectedType === 'fatura') {
                    return parseItauFatura(text)
                } else {
                    return parseItauExtrato(text)
                }
            default:
                return {
                    transactions: [],
                    successCount: 0,
                    errorCount: 1,
                    errors: [`Parser PDF para ${detectedBank} ainda não implementado.`],
                    detectedBank,
                    detectedType,
                }
        }
    } catch (error: any) {
        console.log('[PDF Debug] Error:', error?.message || error)
        return {
            transactions: [],
            successCount: 0,
            errorCount: 1,
            errors: [`Erro ao processar PDF: ${error?.message || error}`],
        }
    }
}

/**
 * Extracts raw text from PDF for debugging/testing.
 */
export async function extractPDFText(buffer: Buffer): Promise<string> {
    try {
        return await extractTextFromPDF(buffer)
    } catch {
        return ''
    }
}
