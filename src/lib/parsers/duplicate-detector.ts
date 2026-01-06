/**
 * @fileoverview Duplicate Detector - Detects duplicate transactions.
 * 
 * Uses multiple heuristics to identify potential duplicates:
 * 1. Same amount + same date = HIGH confidence
 * 2. Same amount + date within 1 day = MEDIUM confidence
 * 3. Same amount + date within 3 days + similar description = LOW confidence
 * 
 * IMPORTANT: This is intentionally aggressive to avoid importing duplicates.
 * Users can always manually select transactions to import.
 * 
 * @module parsers/duplicate-detector
 */

import { ParsedTransaction } from './types'

/**
 * Existing transaction from database for comparison.
 */
export interface ExistingTransaction {
    id: number
    date: Date | string
    amount: number
    name: string
    description?: string
    type: 'income' | 'expense'
}

/**
 * Result of duplicate detection.
 */
export interface DuplicateCheckResult {
    /** Whether this is likely a duplicate */
    isDuplicate: boolean
    /** Confidence level (0-1) */
    confidence: number
    /** ID of the potentially matching transaction */
    matchingTransactionId?: number
    /** Reason for the match */
    reason?: string
}

/**
 * Normalizes text for comparison.
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[*\-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Calculates string similarity using word overlap and substring matching.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function stringSimilarity(str1: string, str2: string): number {
    const s1 = normalizeText(str1)
    const s2 = normalizeText(str2)

    if (s1 === s2) return 1
    if (s1.length === 0 || s2.length === 0) return 0

    // Check if one contains the other (common for PIX descriptions)
    if (s1.includes(s2) || s2.includes(s1)) {
        return 0.9
    }

    // Word overlap
    const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2))
    const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2))

    if (words1.size === 0 || words2.size === 0) return 0

    let commonWords = 0
    for (const word of words1) {
        if (words2.has(word)) commonWords++
        // Also check if word is substring of any word in words2
        for (const word2 of words2) {
            if (word2.includes(word) || word.includes(word2)) {
                commonWords += 0.5
                break
            }
        }
    }

    const totalWords = Math.max(words1.size, words2.size)
    return Math.min(1, commonWords / totalWords)
}

/**
 * Calculates the difference in days between two dates.
 */
function daysDifference(date1: Date, date2: Date): number {
    const d1 = new Date(date1).setHours(0, 0, 0, 0)
    const d2 = new Date(date2).setHours(0, 0, 0, 0)
    return Math.abs((d1 - d2) / (1000 * 60 * 60 * 24))
}

/**
 * Checks if a parsed transaction might be a duplicate of existing transactions.
 * 
 * AGGRESSIVE MATCHING:
 * - Same amount + same date = duplicate (regardless of description)
 * - Same amount + date ±1 day = duplicate
 * - Same amount + date ±3 days + similar description = duplicate
 */
export function checkDuplicate(
    transaction: ParsedTransaction,
    existingTransactions: ExistingTransaction[]
): DuplicateCheckResult {
    const txAmount = Math.abs(transaction.amount)

    for (const existing of existingTransactions) {
        const existingDate = new Date(existing.date)
        const daysDiff = daysDifference(transaction.date, existingDate)
        const existingAmount = Math.abs(existing.amount)

        // Amount match (allow 1 cent variance for rounding)
        const amountDiff = Math.abs(txAmount - existingAmount)
        const amountMatch = amountDiff < 0.02

        if (!amountMatch) continue

        // Check 1: Same amount + same date = HIGH confidence duplicate
        if (daysDiff === 0) {
            return {
                isDuplicate: true,
                confidence: 0.98,
                matchingTransactionId: existing.id,
                reason: `Mesmo valor (R$ ${txAmount.toFixed(2)}) e mesma data`,
            }
        }

        // Check 2: Same amount + date within 1 day = MEDIUM-HIGH confidence
        if (daysDiff <= 1) {
            return {
                isDuplicate: true,
                confidence: 0.90,
                matchingTransactionId: existing.id,
                reason: `Mesmo valor (R$ ${txAmount.toFixed(2)}) e data próxima (${daysDiff} dia)`,
            }
        }

        // Check 3: Same amount + date within 3 days + any description similarity
        if (daysDiff <= 3) {
            const descSimilarity = stringSimilarity(
                transaction.description,
                existing.name || existing.description || ''
            )

            if (descSimilarity > 0.3) {
                return {
                    isDuplicate: true,
                    confidence: 0.75,
                    matchingTransactionId: existing.id,
                    reason: `Mesmo valor e descrição similar (${Math.round(descSimilarity * 100)}%)`,
                }
            }
        }

        // Check 4: Same amount + date within 7 days + high description similarity
        if (daysDiff <= 7) {
            const descSimilarity = stringSimilarity(
                transaction.description,
                existing.name || existing.description || ''
            )

            if (descSimilarity > 0.7) {
                return {
                    isDuplicate: true,
                    confidence: 0.60,
                    matchingTransactionId: existing.id,
                    reason: `Valor igual, descrição muito similar, ${daysDiff} dias de diferença`,
                }
            }
        }
    }

    // No duplicate found
    return {
        isDuplicate: false,
        confidence: 0,
    }
}

/**
 * Batch duplicate check for multiple transactions.
 */
export function checkDuplicates(
    transactions: ParsedTransaction[],
    existingTransactions: ExistingTransaction[]
): Map<number, DuplicateCheckResult> {
    const results = new Map<number, DuplicateCheckResult>()

    console.log(`[Duplicate] Checking ${transactions.length} transactions against ${existingTransactions.length} existing`)

    for (let i = 0; i < transactions.length; i++) {
        const result = checkDuplicate(transactions[i], existingTransactions)
        results.set(i, result)

        if (result.isDuplicate) {
            console.log(`[Duplicate] ⚠️ #${i}: "${transactions[i].description}" matched existing #${result.matchingTransactionId} - ${result.reason}`)
        }
    }

    const duplicateCount = Array.from(results.values()).filter(r => r.isDuplicate).length
    console.log(`[Duplicate] Found ${duplicateCount} potential duplicates`)

    return results
}

/**
 * Also check for duplicates within the same import batch.
 */
export function checkInternalDuplicates(
    transactions: ParsedTransaction[]
): number[][] {
    const duplicateGroups: number[][] = []
    const processed = new Set<number>()

    for (let i = 0; i < transactions.length; i++) {
        if (processed.has(i)) continue

        const group: number[] = [i]
        const tx1 = transactions[i]

        for (let j = i + 1; j < transactions.length; j++) {
            if (processed.has(j)) continue

            const tx2 = transactions[j]

            // Same amount, same date
            const amountMatch = Math.abs(tx1.amount - tx2.amount) < 0.02
            const dateMatch = daysDifference(tx1.date, tx2.date) === 0

            if (amountMatch && dateMatch) {
                group.push(j)
                processed.add(j)
            }
        }

        if (group.length > 1) {
            duplicateGroups.push(group)
        }
        processed.add(i)
    }

    return duplicateGroups
}
