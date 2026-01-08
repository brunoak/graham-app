/**
 * @fileoverview Server Actions for Brokerage Note Import
 * 
 * This module provides server-side functions to import brokerage note
 * operations into the investment portfolio. It handles batch creation
 * of investment transactions with proper asset management.
 * 
 * @module actions/brokerage-import-actions
 * 
 * @example
 * // Import operations from a parsed brokerage note
 * const result = await importBrokerageOperations({
 *   noteNumber: "12345",
 *   tradeDate: new Date("2026-01-06"),
 *   operations: [
 *     { ticker: "PETR4", type: "buy", quantity: 100, price: 35.50, fees: 5.00 }
 *   ]
 * })
 */

"use server"

import { createInvestmentTransaction } from "./investment-actions"
import { revalidatePath } from "next/cache"

// ============================================
// Types
// ============================================

/**
 * Input for a single brokerage operation to import.
 */
export interface BrokerageOperationInput {
    /** Stock ticker (e.g., PETR4, VALE3) */
    ticker: string
    /** Operation type: buy or sell */
    type: "buy" | "sell"
    /** Number of shares */
    quantity: number
    /** Price per share */
    price: number
    /** Total value of the operation */
    totalValue: number
    /** Fees allocated to this operation */
    fees: number
    /** Detected asset type (stock_br, reit_br, etc) */
    assetType?: string
    /** Asset name (company name) */
    assetName?: string
}

/**
 * Input for the batch import function.
 */
export interface ImportBrokerageInput {
    /** Brokerage note number for reference */
    noteNumber: string
    /** Date when trades were executed */
    tradeDate: Date
    /** Settlement date (D+2 in Brazil) */
    settlementDate?: Date
    /** Broker name */
    broker?: string
    /** List of operations to import */
    operations: BrokerageOperationInput[]
}

/**
 * Result of a single operation import.
 */
export interface OperationImportResult {
    /** Stock ticker */
    ticker: string
    /** Whether the import was successful */
    success: boolean
    /** Error message if failed */
    error?: string
}

/**
 * Result of the batch import.
 */
export interface ImportBrokerageResult {
    /** Overall success status */
    success: boolean
    /** Total operations attempted */
    totalOperations: number
    /** Number of successful imports */
    successCount: number
    /** Number of failed imports */
    errorCount: number
    /** Individual results for each operation */
    results: OperationImportResult[]
    /** Summary message */
    message: string
}

// ============================================
// Main Import Function
// ============================================

/**
 * Imports brokerage note operations into the investment portfolio.
 * 
 * This function iterates through each operation in the brokerage note
 * and creates investment transactions using the existing infrastructure.
 * 
 * **Process:**
 * 1. Validates input operations
 * 2. For each operation:
 *    - Calls `createInvestmentTransaction` which handles:
 *      - Asset creation (if new ticker)
 *      - Asset update (quantity, average price)
 *      - Transaction record creation
 * 3. Aggregates results
 * 4. Revalidates the investments page cache
 * 
 * **Error Handling:**
 * - Individual operation failures don't stop the batch
 * - All errors are collected and returned
 * - Partial success is possible
 * 
 * @param input - The brokerage note data with operations to import
 * @returns Promise with import results summary
 * 
 * @example
 * ```typescript
 * const result = await importBrokerageOperations({
 *   noteNumber: "NC-20260106-001",
 *   tradeDate: new Date("2026-01-06"),
 *   operations: [
 *     { ticker: "PETR4", type: "buy", quantity: 100, price: 35.50, totalValue: 3550, fees: 2.50, assetType: "stock_br" },
 *     { ticker: "VALE3", type: "buy", quantity: 50, price: 65.00, totalValue: 3250, fees: 2.30, assetType: "stock_br" }
 *   ]
 * })
 * 
 * console.log(result.message) // "Importadas 2 de 2 operações com sucesso"
 * ```
 */
export async function importBrokerageOperations(
    input: ImportBrokerageInput
): Promise<ImportBrokerageResult> {
    const results: OperationImportResult[] = []
    let successCount = 0
    let errorCount = 0

    console.log(`[BrokerageImport] Starting import of ${input.operations.length} operations from note ${input.noteNumber}`)

    // Process each operation
    for (const operation of input.operations) {
        try {
            // Build the transaction input for createInvestmentTransaction
            const transactionInput = {
                ticker: operation.ticker.toUpperCase(),
                type: operation.type as "buy" | "sell",
                date: input.tradeDate,
                quantity: operation.quantity,
                price: operation.price,
                fees: operation.fees || 0,
                total: operation.totalValue + (operation.fees || 0),
                // Extra fields for asset creation/update
                assetType: operation.assetType || "stock_br",
                assetName: operation.assetName || operation.ticker,
                currency: "BRL" as const
            }

            // Create the investment transaction
            // This function handles:
            // - Asset creation if ticker doesn't exist
            // - Asset update (quantity, average price calculation)
            // - Transaction record creation
            await createInvestmentTransaction(transactionInput)

            results.push({
                ticker: operation.ticker,
                success: true
            })
            successCount++

            console.log(`[BrokerageImport] ✅ ${operation.type.toUpperCase()} ${operation.quantity}x ${operation.ticker} @ R$ ${operation.price.toFixed(2)}`)

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"

            results.push({
                ticker: operation.ticker,
                success: false,
                error: errorMessage
            })
            errorCount++

            console.error(`[BrokerageImport] ❌ Failed to import ${operation.ticker}:`, errorMessage)
        }
    }

    // Revalidate the investments page to show updated data
    revalidatePath("/dashboard/investments")

    // Build summary message
    const totalOperations = input.operations.length
    let message: string

    if (errorCount === 0) {
        message = `Importadas ${successCount} operações com sucesso da nota ${input.noteNumber}`
    } else if (successCount === 0) {
        message = `Falha ao importar todas as ${totalOperations} operações`
    } else {
        message = `Importadas ${successCount} de ${totalOperations} operações (${errorCount} falhas)`
    }

    console.log(`[BrokerageImport] ${message}`)

    return {
        success: errorCount === 0,
        totalOperations,
        successCount,
        errorCount,
        results,
        message
    }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Validates a brokerage operation before import.
 * 
 * @param operation - The operation to validate
 * @returns True if valid, throws error if invalid
 */
export async function validateOperation(operation: BrokerageOperationInput): Promise<boolean> {
    if (!operation.ticker || operation.ticker.length < 4) {
        throw new Error(`Ticker inválido: ${operation.ticker}`)
    }

    if (operation.quantity <= 0) {
        throw new Error(`Quantidade deve ser positiva: ${operation.quantity}`)
    }

    if (operation.price <= 0) {
        throw new Error(`Preço deve ser positivo: ${operation.price}`)
    }

    if (!["buy", "sell"].includes(operation.type)) {
        throw new Error(`Tipo de operação inválido: ${operation.type}`)
    }

    return true
}

/**
 * Calculates the total fees from a brokerage note to distribute across operations.
 * 
 * @param operations - Array of operations
 * @param totalFees - Total fees from the note
 * @returns Operations with fees distributed proportionally
 */
export async function distributeFees(
    operations: BrokerageOperationInput[],
    totalFees: number
): Promise<BrokerageOperationInput[]> {
    const totalValue = operations.reduce((sum, op) => sum + op.totalValue, 0)

    return operations.map(op => ({
        ...op,
        fees: totalValue > 0 ? (op.totalValue / totalValue) * totalFees : 0
    }))
}
