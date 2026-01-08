/**
 * Parser para Notas de Corretagem (SINACOR format)
 * 
 * Formato padrão usado por 95% das corretoras brasileiras
 * Extrai: operações, taxas, custos e totais
 * 
 * Uses pdf2json for server-side PDF parsing
 */

import PDFParser from "pdf2json"

// ============================================
// Types
// ============================================

export interface BrokerageOperation {
    type: "buy" | "sell"
    ticker: string
    tickerName: string
    quantity: number
    unitPrice: number
    totalValue: number
    market: "BOVESPA" | "FRACIONARIO" | "OPCOES" | "FUTURO"
}

export interface BrokerageFees {
    liquidacao: number
    registro: number
    emolumentos: number
    corretagem: number
    iss: number
    irrf: number
    outras: number
}

export interface BrokerageNote {
    noteNumber: string
    tradeDate: Date
    settlementDate: Date
    broker: string
    brokerCnpj: string
    clientName: string
    clientCpf: string
    operations: BrokerageOperation[]
    fees: BrokerageFees
    grossTotal: number
    netTotal: number
    isDayTrade: boolean
}

// ============================================
// Regex Patterns (SINACOR format)
// ============================================

const PATTERNS = {
    noteNumber: /Nr\.\s*nota\s*[:\s]*(\d+)/i,
    tradeDate: /Data\s*preg[aã]o\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
    settlementDate: /Data\s*liquida[çc][aã]o\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i,
    clientName: /Cliente\s*[:\s]*(.+?)(?:\s+CPF|\s+C\.P\.F)/i,
    clientCpf: /CPF\s*[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i,
    brokerName: /Corretora\s*[:\s]*(.+?)(?:\s+CNPJ|\n)/i,
    brokerCnpj: /CNPJ\s*[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i,
    taxaLiquidacao: /Taxa\s*de\s*liquida[çc][aã]o\s*[:\s]*([\d.,]+)/i,
    taxaRegistro: /Taxa\s*de\s*registro\s*[:\s]*([\d.,]+)/i,
    emolumentos: /Emolumentos\s*[:\s]*([\d.,]+)/i,
    corretagem: /Corretagem\s*[:\s]*([\d.,]+)/i,
    iss: /ISS\s*[:\s]*([\d.,]+)/i,
    irrf: /I\.?R\.?R\.?F\.?\s*[:\s]*([\d.,]+)/i,
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
    return parseNumber(match[1])
}

function extractString(text: string, pattern: RegExp): string {
    const match = text.match(pattern)
    return match ? match[1].trim() : ""
}

/**
 * Cleans extracted PDF text by removing extra spaces between characters
 * PDF extraction often returns "M e r c a d o" instead of "Mercado"
 * 
 * IMPORTANT: Numbers must be handled carefully to preserve:
 * - Quantity: single number (e.g., "5")
 * - Price: number with 2 decimals (e.g., "121,81")
 * - Total: number with 2 decimals (e.g., "609,05")
 */
function cleanText(text: string): string {
    const singleCharCount = (text.match(/[A-Za-z0-9] /g) || []).length
    const totalChars = text.length
    const ratio = singleCharCount / totalChars

    console.log("[BrokerageParser] Single char spaces:", singleCharCount, "Total:", totalChars, "Ratio:", ratio)

    if (ratio > 0.1) {
        console.log("[BrokerageParser] Detected spaced text, cleaning...")

        // Step 1: Join letters (but not numbers yet)
        // "B O V E S P A" -> "BOVESPA"
        // "M e r c a d o" -> "Mercado"
        let cleaned = text.replace(/([A-Za-z]) (?=[A-Za-z])/g, "$1")

        // Step 2: Join digits that form decimal numbers with comma
        // "1 2 1 , 8 1" -> "121,81"
        // First fix the comma: ", " -> ","
        cleaned = cleaned.replace(/, /g, ",")
        // Then join digits around comma: "1 2 1,8 1" -> "121,81"
        cleaned = cleaned.replace(/(\d) (?=\d)/g, "$1")

        // Step 3: Add marker before what looks like decimal prices/totals
        // Pattern: 2+ digits followed by comma and 2 digits
        // This ensures separation between values like "5 121,81 609,05"
        // We need to add space BEFORE decimal patterns that follow a digit with space

        // Step 4: Join letters with numbers only for tickers (4 uppercase + digits)
        // "KDIF 1 1" -> "KDIF11"
        cleaned = cleaned.replace(/([A-Z]{4,6}) (\d)/g, "$1$2")
        cleaned = cleaned.replace(/([A-Z]{4,6}\d) (\d)/g, "$1$2")

        // Step 5: Normalize spaces
        cleaned = cleaned.replace(/\s+/g, " ")

        // Step 6: Fix cases where quantity ran into price
        // "5121,81" should be "5 121,81" if 121,81 looks like a price (3 digits + comma + 2 digits)
        cleaned = cleaned.replace(/(\d)(\d{2,3},\d{2})/g, "$1 $2")

        console.log("[BrokerageParser] After cleaning sample:", cleaned.substring(0, 400))
        return cleaned
    }

    return text.replace(/\s+/g, " ")
}


function extractOperations(text: string): BrokerageOperation[] {
    const operations: BrokerageOperation[] = []

    // Clean the text first
    let cleanedText = cleanText(text)

    // IMPORTANT: Add space before ticker patterns to fix "VISTAKDIF11" -> "VISTA KDIF11"
    // Match any letter followed by what looks like a ticker (4-6 uppercase + 2 digits ending in 11 or single digit)
    // This is needed because VISTA + KDIF11 gets merged without space
    cleanedText = cleanedText.replace(/([A-Za-z])([A-Z]{4}(?:11|[1-9]))(?=\s|$|[^A-Z0-9])/g, "$1 $2")

    console.log("[BrokerageParser] Cleaned text sample:", cleanedText.substring(0, 300))

    // Split by lines or by BOVESPA pattern for better parsing
    const lines = cleanedText.split(/\n|(?=BOVESPA)|(?=FRACIONARIO)/)

    for (const line of lines) {
        // Look for FII/stock ticker patterns: 4-6 uppercase + 1-2 digits
        // Examples: KDIF11, JURO11, PETR4, VALE3
        const tickerMatch = line.match(/\b([A-Z]{4,6}\d{1,2})\b/g)
        if (!tickerMatch) continue

        // Check for buy/sell indicators at end of line
        // In SINACOR: "D" = Débito (buy), "C" = Crédito (sell) at the END
        const endsWithD = /D\s*$/.test(line)
        const endsWithC = /C\s*$/.test(line) && !/BOVESPA\s+C/.test(line)

        // Also check for C VISTA (buy indicator in middle)
        const hasCVista = /\bC\s+VISTA/i.test(line)
        const hasVVista = /\bV\s+VISTA/i.test(line)

        const isBuy = endsWithD || hasCVista
        const isSell = endsWithC || hasVVista

        if (!isBuy && !isSell) continue

        // SINACOR format: TICKER @ QTY PRICE,XX TOTAL,XX D
        // We need to extract 3 values: quantity, price (with 2 decimals), total (with 2 decimals)

        // Find the @ symbol - numbers after it are what we need
        const atIndex = line.indexOf("@")
        const afterAt = atIndex > 0 ? line.substring(atIndex + 1) : line

        // Look for the pattern: [numbers] [numbers],[2digits] [numbers],[2digits] D
        // Example: "5121 ,81609 ,05 D" should become qty=5, price=121.81, total=609.05

        // Find all comma positions - each comma indicates a decimal
        const commaMatches = [...afterAt.matchAll(/(\d+)\s*,\s*(\d{2})/g)]

        console.log("[BrokerageParser] Line:", line.substring(0, 100))
        console.log("[BrokerageParser] After @:", afterAt.substring(0, 60))
        console.log("[BrokerageParser] Comma matches:", commaMatches.map(m => m[0]))

        let qty: number, price: number, total: number

        if (commaMatches.length >= 2) {
            // We have at least 2 decimal numbers (price and total)
            // The last one is total, second to last is price
            const totalMatch = commaMatches[commaMatches.length - 1]
            const priceMatch = commaMatches[commaMatches.length - 2]

            // Parse price and total
            price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`)
            total = parseFloat(`${totalMatch[1]}.${totalMatch[2]}`)

            // Quantity is whatever comes before the price
            // Find position of price in the string
            const pricePos = afterAt.indexOf(priceMatch[0])
            const beforePrice = afterAt.substring(0, pricePos).trim()

            // Extract all digits before the price as quantity
            const qtyDigits = beforePrice.replace(/\D/g, "")

            // The issue: "5121" where only "5" is qty and "121" is part of price
            // We need to split: if price starts with the remaining digits
            const priceIntPart = priceMatch[1]
            if (qtyDigits.endsWith(priceIntPart)) {
                // "5121" ends with "121" (price integer part)
                // So qty = "5"
                qty = parseInt(qtyDigits.slice(0, -priceIntPart.length)) || 0
            } else {
                qty = parseInt(qtyDigits) || 0
            }

            console.log("[BrokerageParser] Parsed: qty=", qty, "price=", price, "total=", total)
        } else {
            // Fallback: try old method
            const numbers: number[] = []
            const numMatches = line.matchAll(/(\d+(?:,\d+)?)/g)
            for (const m of numMatches) {
                const numStr = m[1]
                const pos = m.index!
                const beforeChar = line[pos - 1]
                if (beforeChar && /[A-Z]/.test(beforeChar)) continue
                const num = parseNumber(numStr)
                if (num > 0) numbers.push(num)
            }
            if (numbers.length < 3) continue
            [qty, price, total] = numbers.slice(-3)
        }

        console.log("[BrokerageParser] Tickers:", tickerMatch)
        console.log("[BrokerageParser] IsBuy:", isBuy, "IsSell:", isSell)

        if (qty > 0 && price > 0 && total > 0) {
            operations.push({
                type: isBuy ? "buy" : "sell",
                ticker: tickerMatch[0],
                tickerName: "",
                quantity: Math.round(qty),
                unitPrice: price,
                totalValue: total,
                market: line.includes("FRACIONARIO") ? "FRACIONARIO" : "BOVESPA"
            })
        }
    }

    return operations
}


function extractFees(text: string): BrokerageFees {
    return {
        liquidacao: extractNumber(text, PATTERNS.taxaLiquidacao),
        registro: extractNumber(text, PATTERNS.taxaRegistro),
        emolumentos: extractNumber(text, PATTERNS.emolumentos),
        corretagem: extractNumber(text, PATTERNS.corretagem),
        iss: extractNumber(text, PATTERNS.iss),
        irrf: extractNumber(text, PATTERNS.irrf),
        outras: 0
    }
}

// ============================================
// PDF Text Extraction using pdf2json
// ============================================

async function extractTextFromPdf(buffer: Buffer, password?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // @ts-expect-error - pdf2json types are incomplete
        const pdfParser = new PDFParser()

        // Set password if provided (for protected PDFs)
        if (password) {
            // @ts-expect-error - password setter exists but types missing
            pdfParser.password = password
        }

        pdfParser.on("pdfParser_dataError", (errData: any) => {
            const errorMessage = errData.parserError?.message || errData.parserError || String(errData)

            // Check if it's a password error
            if (errorMessage.toLowerCase().includes("password")) {
                reject(new Error("PDF protegido por senha. Use seu CPF (apenas números) como senha."))
            } else {
                reject(new Error(errorMessage))
            }
        })

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
            try {
                // Extract text from all pages
                let fullText = ""

                if (pdfData.Pages) {
                    for (const page of pdfData.Pages) {
                        if (page.Texts) {
                            for (const textItem of page.Texts) {
                                if (textItem.R) {
                                    for (const run of textItem.R) {
                                        if (run.T) {
                                            // Decode URI encoded text
                                            fullText += decodeURIComponent(run.T) + " "
                                        }
                                    }
                                }
                            }
                        }
                        fullText += "\n"
                    }
                }

                resolve(fullText)
            } catch (error) {
                reject(error)
            }
        })

        // Parse the PDF buffer
        pdfParser.parseBuffer(buffer)
    })
}

// ============================================
// Main Parser
// ============================================

export async function parseBrokerageNote(pdfBuffer: Buffer, password?: string): Promise<BrokerageNote> {
    const text = await extractTextFromPdf(pdfBuffer, password)

    console.log("[BrokerageParser] Extracted text length:", text.length)
    console.log("[BrokerageParser] First 500 chars:", text.substring(0, 500))

    const noteNumber = extractString(text, PATTERNS.noteNumber)
    const tradeDateStr = extractString(text, PATTERNS.tradeDate)
    const settlementDateStr = extractString(text, PATTERNS.settlementDate)
    const clientName = extractString(text, PATTERNS.clientName)
    const clientCpf = extractString(text, PATTERNS.clientCpf)
    const broker = extractString(text, PATTERNS.brokerName)
    const brokerCnpj = extractString(text, PATTERNS.brokerCnpj)

    const operations = extractOperations(text)

    console.log("[BrokerageParser] Found operations:", operations.length)

    const buyTotal = operations
        .filter(op => op.type === "buy")
        .reduce((sum, op) => sum + op.totalValue, 0)
    const sellTotal = operations
        .filter(op => op.type === "sell")
        .reduce((sum, op) => sum + op.totalValue, 0)

    const grossTotal = sellTotal - buyTotal
    const fees = extractFees(text)
    const totalFees = Object.values(fees).reduce((sum, fee) => sum + fee, 0)
    const netTotal = grossTotal - totalFees

    const buyTickers = operations.filter(op => op.type === "buy").map(op => op.ticker)
    const sellTickers = operations.filter(op => op.type === "sell").map(op => op.ticker)
    const isDayTrade = buyTickers.some(t => sellTickers.includes(t))

    return {
        noteNumber,
        tradeDate: tradeDateStr ? parseDate(tradeDateStr) : new Date(),
        settlementDate: settlementDateStr ? parseDate(settlementDateStr) : new Date(),
        broker,
        brokerCnpj,
        clientName,
        clientCpf,
        operations,
        fees,
        grossTotal,
        netTotal,
        isDayTrade
    }
}

// ============================================
// Utility: Convert to Investment Transactions
// ============================================

export interface InvestmentTransaction {
    ticker: string
    type: "buy" | "sell"
    quantity: number
    price: number
    totalValue: number
    fees: number
    date: Date
    notes: string
}

export function toInvestmentTransactions(note: BrokerageNote): InvestmentTransaction[] {
    const totalOperationsValue = note.operations.reduce((sum, op) => sum + op.totalValue, 0)
    const totalFees = Object.values(note.fees).reduce((sum, fee) => sum + fee, 0)

    return note.operations.map(op => {
        const feeShare = totalOperationsValue > 0
            ? (op.totalValue / totalOperationsValue) * totalFees
            : 0

        return {
            ticker: op.ticker,
            type: op.type,
            quantity: op.quantity,
            price: op.unitPrice,
            totalValue: op.totalValue + (op.type === "buy" ? feeShare : -feeShare),
            fees: feeShare,
            date: note.tradeDate,
            notes: `Nota ${note.noteNumber} - ${note.broker}`
        }
    })
}
