/**
 * @fileoverview Type definitions for the import parsers.
 * 
 * This module defines the common interfaces used across all parsers
 * (OFX, CSV, PDF, XLSX) to ensure consistent output format.
 * 
 * @module parsers/types
 */

/**
 * Represents a single parsed transaction from any file format.
 * This is the normalized structure that all parsers output.
 */
export interface ParsedTransaction {
    /** Transaction date */
    date: Date
    /** Transaction amount (positive for income, negative for expense) */
    amount: number
    /** Full transaction description/memo from the bank */
    description: string
    /** Extracted merchant/beneficiary name (e.g., "ELETROPAULO", "Mizael Moura") */
    name: string
    /** Payment method extracted (e.g., "Pix enviado", "Boleto", "Cartão de crédito") */
    paymentMethod?: string
    /** Transaction type: income or expense */
    type: 'income' | 'expense'
    /** Original raw line/data for debugging */
    raw: string
    /** Confidence level of parsing (0-1) */
    confidence: number
    /** Suggested category ID based on description matching */
    suggestedCategoryId?: string
    /** Suggested category name for display */
    suggestedCategoryName?: string
    /** Whether this might be a duplicate */
    isPossibleDuplicate?: boolean
    /** ID of existing transaction if duplicate found */
    duplicateOfId?: number
}

/**
 * Result of parsing a file.
 */
export interface ParseResult {
    /** Successfully parsed transactions */
    transactions: ParsedTransaction[]
    /** Number of transactions successfully parsed */
    successCount: number
    /** Number of transactions that failed to parse */
    errorCount: number
    /** Error messages for failed transactions */
    errors: string[]
    /** Detected bank (if auto-detected) */
    detectedBank?: BankType
    /** Detected file type */
    detectedType?: FileSourceType
}

/**
 * Supported file formats.
 */
export type FileFormat = 'ofx' | 'csv' | 'pdf' | 'xlsx'

/**
 * Type of source file.
 */
export type FileSourceType = 'extrato' | 'fatura'

/**
 * Supported banks.
 */
export type BankType =
    // Traditional
    | 'itau'
    | 'bb'
    | 'bradesco'
    | 'santander'
    | 'caixa'
    // Fintechs
    | 'nubank'
    | 'inter'
    | 'c6'
    | 'btg'
    | 'picpay'
    | 'rico'
    // Unknown/generic
    | 'unknown'

/**
 * Bank display information.
 */
export interface BankInfo {
    id: BankType
    name: string
    supportsExtrato: FileFormat[]
    supportsFatura: FileFormat[]
}

/**
 * Configuration for all supported banks.
 */
export const SUPPORTED_BANKS: BankInfo[] = [
    // Traditional Banks
    { id: 'itau', name: 'Itaú', supportsExtrato: ['ofx'], supportsFatura: ['pdf'] },
    { id: 'bb', name: 'Banco do Brasil', supportsExtrato: ['ofx', 'pdf'], supportsFatura: ['pdf'] },
    { id: 'bradesco', name: 'Bradesco', supportsExtrato: ['ofx', 'pdf'], supportsFatura: ['pdf'] },
    { id: 'santander', name: 'Santander', supportsExtrato: ['ofx', 'pdf'], supportsFatura: ['pdf'] },
    { id: 'caixa', name: 'Caixa', supportsExtrato: ['ofx', 'pdf'], supportsFatura: ['pdf'] },
    // Fintechs
    { id: 'nubank', name: 'Nubank', supportsExtrato: ['csv'], supportsFatura: ['csv'] },
    { id: 'inter', name: 'Inter', supportsExtrato: ['ofx', 'csv'], supportsFatura: ['csv', 'pdf'] },
    { id: 'c6', name: 'C6 Bank', supportsExtrato: ['ofx'], supportsFatura: ['pdf'] },
    { id: 'btg', name: 'BTG Digital', supportsExtrato: ['ofx', 'xlsx'], supportsFatura: ['pdf'] },
    { id: 'picpay', name: 'PicPay', supportsExtrato: ['csv'], supportsFatura: ['csv'] },
    { id: 'rico', name: 'Rico Conta Digital', supportsExtrato: ['csv'], supportsFatura: ['csv'] },
]

/**
 * Gets bank info by ID.
 */
export function getBankById(id: BankType): BankInfo | undefined {
    return SUPPORTED_BANKS.find(b => b.id === id)
}

/**
 * Input for batch transaction creation.
 */
export interface BatchTransactionInput {
    type: 'income' | 'expense'
    amount: number
    name: string
    description?: string
    date: Date
    category_id?: string
    via: string
    currency?: 'BRL' | 'USD'
}
