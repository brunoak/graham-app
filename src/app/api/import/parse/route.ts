/**
 * @fileoverview API Route for parsing import files.
 * 
 * POST /api/import/parse
 * - Receives a file and parses it into transactions
 * - Returns parsed transactions with suggested categories
 * - Checks for duplicates against existing transactions
 * 
 * @module api/import/parse
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFile, detectFileFormat, detectBank, parsePDF, parseXLSX } from '@/lib/parsers/parser-factory'
import { matchCategory, DBCategory } from '@/lib/parsers/category-matcher'
import { checkDuplicates, ExistingTransaction } from '@/lib/parsers/duplicate-detector'
import { BankType, FileSourceType, ParseResult } from '@/lib/parsers/types'

/**
 * Request body schema.
 */
interface ParseRequest {
    /** Base64 encoded file content */
    fileContent: string
    /** Original file name */
    fileName: string
    /** Bank (optional, will auto-detect) */
    bank?: BankType
    /** Source type: extrato or fatura */
    sourceType?: FileSourceType
}

/**
 * POST handler for parsing import files.
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Authentication
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // 2. Get tenant
        const { data: userProfile } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (!userProfile) {
            return NextResponse.json(
                { error: 'User profile not found' },
                { status: 404 }
            )
        }

        const tenantId = userProfile.tenant_id

        // 3. Parse request body
        const body: ParseRequest = await req.json()

        if (!body.fileContent || !body.fileName) {
            return NextResponse.json(
                { error: 'File content and name are required' },
                { status: 400 }
            )
        }

        // 4. Decode file content to buffer
        const buffer = Buffer.from(body.fileContent, 'base64')

        // 5. Detect format (need string for format detection)
        const contentString = buffer.toString('utf-8')
        const format = detectFileFormat(body.fileName, contentString)
        const bank = body.bank || detectBank(contentString, format)

        console.log(`[Import] Parsing ${body.fileName}: format=${format}, bank=${bank}`)

        // 6. Parse file based on format
        let parseResult: ParseResult

        if (format === 'pdf') {
            // PDF parsing uses buffer directly
            parseResult = await parsePDF(buffer, bank, body.sourceType)
        } else if (format === 'xlsx') {
            // XLSX parsing uses buffer directly
            parseResult = await parseXLSX(buffer, bank, body.sourceType)
        } else {
            // Other formats use string content
            parseResult = await parseFile(body.fileName, contentString, {
                bank,
                sourceType: body.sourceType,
            })
        }

        if (parseResult.errorCount > 0 && parseResult.successCount === 0) {
            return NextResponse.json(
                {
                    error: 'Failed to parse file',
                    details: parseResult.errors,
                },
                { status: 400 }
            )
        }

        // 7. Fetch categories for matching - include both:
        //    - Global default categories (tenant_id IS NULL)
        //    - User's custom categories (tenant_id = user's tenant)
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, type, classification, icon, color')
            .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)

        const dbCategories: DBCategory[] = categories || []

        // Debug: Log categories being used for matching
        console.log(`[Import] Loaded ${dbCategories.length} categories for matching`)
        if (dbCategories.length > 0) {
            console.log(`[Import] Category IDs: ${dbCategories.slice(0, 10).map(c => c.id).join(', ')}...`)
        }

        // 8. Match categories for each transaction
        const transactionsWithCategories = parseResult.transactions.map(tx => {
            const matchedCategory = matchCategory(tx.description, dbCategories)
            if (!matchedCategory) {
                console.log(`[Import] ❌ No match for: "${tx.description?.substring(0, 50)}..."`)
            }
            return {
                ...tx,
                suggestedCategoryId: matchedCategory?.id,
                suggestedCategoryName: matchedCategory?.name,
                suggestedCategoryIcon: matchedCategory?.icon,
                suggestedCategoryColor: matchedCategory?.color,
            }
        })

        // 9. Fetch existing transactions for duplicate check
        // Get transactions from last 90 days
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const { data: existingTxs } = await supabase
            .from('transactions')
            .select('id, date, amount, name, description, type')
            .eq('tenant_id', tenantId)
            .gte('date', ninetyDaysAgo.toISOString())

        const existingTransactions: ExistingTransaction[] = (existingTxs || []).map(tx => ({
            id: tx.id,
            date: new Date(tx.date),
            amount: tx.amount,
            name: tx.name,
            description: tx.description,
            type: tx.type,
        }))

        // 10. Check for duplicates
        const duplicateResults = checkDuplicates(
            parseResult.transactions,
            existingTransactions
        )

        // 11. Enrich transactions with duplicate info
        const enrichedTransactions = transactionsWithCategories.map((tx, index) => {
            const duplicateCheck = duplicateResults.get(index)
            return {
                ...tx,
                isPossibleDuplicate: duplicateCheck?.isDuplicate || false,
                duplicateConfidence: duplicateCheck?.confidence || 0,
                duplicateOfId: duplicateCheck?.matchingTransactionId,
                duplicateReason: duplicateCheck?.reason,
            }
        })

        // 12. Return result
        return NextResponse.json({
            success: true,
            format,
            detectedBank: parseResult.detectedBank || bank,
            sourceType: parseResult.detectedType || body.sourceType,
            transactions: enrichedTransactions,
            stats: {
                total: parseResult.successCount,
                parsed: parseResult.successCount,
                errors: parseResult.errorCount,
                duplicates: enrichedTransactions.filter(t => t.isPossibleDuplicate).length,
            },
            parseErrors: parseResult.errors,
        })

    } catch (error: any) {
        console.error('[Import] Parse error:', error)
        return NextResponse.json(
            { error: `Internal error: ${error.message}` },
            { status: 500 }
        )
    }
}
