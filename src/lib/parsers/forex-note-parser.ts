/**
 * Parser para Notas de Câmbio (Foreign Exchange Notes)
 * 
 * Usado para conversão de moeda em corretoras (USD → BRL, etc)
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse")

// ============================================
// Types
// ============================================

export interface ForexNote {
    noteNumber: string
    operationDate: Date
    settlementDate: Date
    broker: string
    clientName: string
    clientCpf: string
    operationType: "buy" | "sell"  // Buy USD = sell BRL, Sell USD = buy BRL
    foreignCurrency: string        // USD, EUR, etc
    foreignAmount: number          // Amount in foreign currency
    exchangeRate: number           // BRL per 1 unit of foreign currency
    brlAmount: number              // Total in BRL
    spread: number                 // Spread/taxa cambial
    iof: number                    // IOF (Imposto sobre Operações Financeiras)
    otherFees: number              // Outras taxas
    netBrlAmount: number           // Valor líquido em BRL
}

// ============================================
// Regex Patterns
// ============================================

const PATTERNS = {
    // Note info
    noteNumber: /Contrato\s*n[º°]?\s*[:\s]*(\d+)/i,
    operationDate: /Data\s*(?:da\s*)?opera[çc][aã]o\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
    settlementDate: /Data\s*(?:de\s*)?liquida[çc][aã]o\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i,

    // Operation details
    operationType: /(COMPRA|VENDA)\s*DE\s*(USD|EUR|GBP|CHF|JPY)/i,
    foreignAmount: /(USD|EUR|GBP|CHF|JPY)\s*([\d.,]+)/i,
    exchangeRate: /Taxa\s*(?:de\s*)?c[aâ]mbio\s*[:\s]*([\d.,]+)/i,
    brlAmount: /Valor\s*(?:em\s*)?(?:R\$|BRL)\s*[:\s]*([\d.,]+)/i,

    // Fees
    iof: /IOF\s*[:\s]*([\d.,]+)/i,
    spread: /Spread\s*[:\s]*([\d.,]+)/i,

    // Client
    clientName: /Nome\s*[:\s]*(.+?)(?:\s+CPF|\n)/i,
    clientCpf: /CPF\s*[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i,
}

// ============================================
// Helper Functions
// ============================================

function parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split("/").map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
}

function parseNumber(numStr: string): number {
    return parseFloat(
        numStr
            .replace(/\./g, "")
            .replace(",", ".")
    )
}

function extractNumber(text: string, pattern: RegExp): number {
    const match = text.match(pattern)
    if (!match) return 0
    // Get the last capture group that looks like a number
    const numStr = match[match.length - 1] || match[1]
    return parseNumber(numStr)
}

function extractString(text: string, pattern: RegExp): string {
    const match = text.match(pattern)
    return match ? match[1].trim() : ""
}

// ============================================
// Main Parser
// ============================================

export async function parseForexNote(pdfBuffer: Buffer): Promise<ForexNote> {
    const pdf = await pdfParse(pdfBuffer)
    const text = pdf.text

    // Extract note info
    const noteNumber = extractString(text, PATTERNS.noteNumber)
    const operationDateStr = extractString(text, PATTERNS.operationDate)
    const settlementDateStr = extractString(text, PATTERNS.settlementDate)

    // Extract operation type
    const opTypeMatch = text.match(PATTERNS.operationType)
    const isBuy = opTypeMatch?.[1]?.toUpperCase() === "COMPRA"
    const foreignCurrency = opTypeMatch?.[2] || "USD"

    // Extract amounts
    const foreignAmountMatch = text.match(PATTERNS.foreignAmount)
    const foreignAmount = foreignAmountMatch ? parseNumber(foreignAmountMatch[2]) : 0
    const exchangeRate = extractNumber(text, PATTERNS.exchangeRate)
    const brlAmount = extractNumber(text, PATTERNS.brlAmount)

    // Extract fees
    const iof = extractNumber(text, PATTERNS.iof)
    const spread = extractNumber(text, PATTERNS.spread)

    // Calculate net amount
    const otherFees = 0
    const totalFees = iof + spread + otherFees
    const netBrlAmount = isBuy
        ? brlAmount + totalFees  // Buying USD costs more BRL
        : brlAmount - totalFees  // Selling USD gives less BRL

    // Extract client info
    const clientName = extractString(text, PATTERNS.clientName)
    const clientCpf = extractString(text, PATTERNS.clientCpf)

    return {
        noteNumber,
        operationDate: operationDateStr ? parseDate(operationDateStr) : new Date(),
        settlementDate: settlementDateStr ? parseDate(settlementDateStr) : new Date(),
        broker: "", // Usually same as brokerage
        clientName,
        clientCpf,
        operationType: isBuy ? "buy" : "sell",
        foreignCurrency,
        foreignAmount,
        exchangeRate,
        brlAmount,
        spread,
        iof,
        otherFees,
        netBrlAmount
    }
}

// ============================================
// Utility: Convert to Investment Transaction
// ============================================

export interface ForexTransaction {
    type: "forex_buy" | "forex_sell"
    foreignCurrency: string
    foreignAmount: number
    exchangeRate: number
    brlAmount: number
    fees: number
    date: Date
    notes: string
}

export function toForexTransaction(note: ForexNote): ForexTransaction {
    return {
        type: note.operationType === "buy" ? "forex_buy" : "forex_sell",
        foreignCurrency: note.foreignCurrency,
        foreignAmount: note.foreignAmount,
        exchangeRate: note.exchangeRate,
        brlAmount: note.brlAmount,
        fees: note.iof + note.spread + note.otherFees,
        date: note.operationDate,
        notes: `Contrato ${note.noteNumber}`
    }
}
