/**
 * @fileoverview API Route for Brokerage Note Import
 * 
 * This endpoint receives a PDF file containing a brokerage note (nota de corretagem)
 * from Brazilian brokers in the SINACOR format and extracts the trading operations.
 * 
 * @module api/import/brokerage
 * 
 * @example
 * // Client-side usage
 * const formData = new FormData()
 * formData.append('file', pdfFile)
 * 
 * const response = await fetch('/api/import/brokerage', {
 *   method: 'POST',
 *   body: formData
 * })
 * 
 * const { note, transactions } = await response.json()
 */

import { NextRequest, NextResponse } from "next/server"
import { parseBrokerageNote, toInvestmentTransactions } from "@/lib/parsers/brokerage-note-parser"

/**
 * Maximum file size allowed for upload (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Allowed MIME types for brokerage note files
 */
const ALLOWED_TYPES = ["application/pdf"]

/**
 * POST /api/import/brokerage
 * 
 * Parses a brokerage note PDF and returns the extracted operations.
 * 
 * @param request - The incoming request with FormData containing the PDF file
 * @returns JSON response with:
 *   - note: The parsed brokerage note metadata
 *   - transactions: Array of investment transactions ready for import
 *   - rawOperations: The raw operations extracted from the PDF
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Parse the FormData
        const formData = await request.formData()
        const file = formData.get("file") as File | null

        // 2. Validate file presence
        if (!file) {
            return NextResponse.json(
                { error: "Nenhum arquivo enviado" },
                { status: 400 }
            )
        }

        // 3. Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Tipo de arquivo inválido. Envie um PDF." },
                { status: 400 }
            )
        }

        // 4. Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "Arquivo muito grande. Máximo 5MB." },
                { status: 400 }
            )
        }

        // 5. Convert File to Buffer for parsing
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 5.1 Get optional password
        const password = formData.get("password") as string | null

        // 6. Parse the brokerage note
        const note = await parseBrokerageNote(buffer, password || undefined)

        // 7. Validate that operations were found
        if (!note.operations || note.operations.length === 0) {
            return NextResponse.json(
                {
                    error: "Nenhuma operação encontrada no arquivo",
                    note: {
                        noteNumber: note.noteNumber,
                        tradeDate: note.tradeDate,
                        broker: note.broker
                    }
                },
                { status: 400 }
            )
        }

        // 8. Convert to investment transaction format
        const transactions = toInvestmentTransactions(note)

        // 9. Add asset type detection (stock_br, reit_br, etc)
        const enrichedTransactions = transactions.map(tx => ({
            ...tx,
            assetType: detectAssetType(tx.ticker),
            assetName: tx.ticker // Will be enriched later with market data
        }))

        // 10. Return success response
        return NextResponse.json({
            success: true,
            note: {
                noteNumber: note.noteNumber,
                tradeDate: note.tradeDate,
                settlementDate: note.settlementDate,
                broker: note.broker,
                isDayTrade: note.isDayTrade,
                fees: note.fees,
                grossTotal: note.grossTotal,
                netTotal: note.netTotal
            },
            transactions: enrichedTransactions,
            rawOperations: note.operations,
            summary: {
                totalOperations: note.operations.length,
                buyCount: note.operations.filter(op => op.type === "buy").length,
                sellCount: note.operations.filter(op => op.type === "sell").length,
                totalFees: Object.values(note.fees).reduce((sum, fee) => sum + fee, 0)
            }
        })

    } catch (error) {
        console.error("[API] Error parsing brokerage note:", error)

        return NextResponse.json(
            {
                error: "Erro ao processar nota de corretagem",
                details: error instanceof Error ? error.message : "Erro desconhecido"
            },
            { status: 500 }
        )
    }
}

/**
 * Detects the asset type based on the ticker format.
 * 
 * Brazilian market conventions:
 * - 4 letters + number (e.g., PETR4, VALE3): Regular stocks
 * - Ending with 11 (e.g., MXRF11): FIIs (REITs)
 * - Ending with 34 (e.g., AAPL34): BDRs
 * - 4 letters + F (e.g., PETR4F): Fractional market
 * 
 * @param ticker - The stock ticker symbol
 * @returns The detected asset type
 */
function detectAssetType(ticker: string): string {
    const upperTicker = ticker.toUpperCase()

    // FIIs end with 11
    if (upperTicker.match(/11$/)) {
        return "reit_br"
    }

    // BDRs end with 34
    if (upperTicker.match(/34$/)) {
        return "stock_us"
    }

    // ETFs typically start with specific prefixes
    const etfPrefixes = ["BOVA", "SMAL", "IVVB", "DIVO", "HASH", "GOLD"]
    if (etfPrefixes.some(prefix => upperTicker.startsWith(prefix))) {
        return "etf_br"
    }

    // Default to Brazilian stock
    return "stock_br"
}
