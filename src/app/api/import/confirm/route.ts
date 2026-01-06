/**
 * @fileoverview API Route for confirming and saving imported transactions.
 * 
 * POST /api/import/confirm
 * - Receives an array of transactions to import
 * - Creates them in the database using existing transaction logic
 * - Handles category and account resolution
 * 
 * @module api/import/confirm
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

/**
 * Schema for a single transaction to import.
 */
const ImportTransactionSchema = z.object({
    /** Transaction type */
    type: z.enum(['income', 'expense']),
    /** Transaction amount (positive) */
    amount: z.number().positive(),
    /** Transaction name/title */
    name: z.string().min(1),
    /** Optional description */
    description: z.string().optional(),
    /** Transaction date */
    date: z.string().or(z.date()),
    /** Category ID (optional) */
    categoryId: z.string().optional(),
    /** Account name (via) */
    via: z.string().min(1),
    /** Currency */
    currency: z.enum(['BRL', 'USD']).default('BRL'),
})

/**
 * Request body schema.
 */
const ConfirmRequestSchema = z.object({
    transactions: z.array(ImportTransactionSchema).min(1),
})

type ImportTransaction = z.infer<typeof ImportTransactionSchema>

/**
 * POST handler for confirming and saving imported transactions.
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

        // 3. Parse and validate request body
        const body = await req.json()
        const validation = ConfirmRequestSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Invalid request',
                    details: validation.error.issues,
                },
                { status: 400 }
            )
        }

        const { transactions } = validation.data

        console.log(`[Import] Confirming ${transactions.length} transactions`)

        // 4. Pre-fetch/create accounts
        const accountNames = [...new Set(transactions.map(t => t.via))]
        const accountMap = new Map<string, number>()

        for (const name of accountNames) {
            // Check if account exists
            const { data: existingAccount } = await supabase
                .from('accounts')
                .select('id')
                .eq('tenant_id', tenantId)
                .ilike('name', name)
                .single()

            if (existingAccount) {
                accountMap.set(name.toLowerCase(), existingAccount.id)
            } else {
                // Create account
                let accountType = 'checking'
                const nameLower = name.toLowerCase()
                if (nameLower.includes('carteira') || nameLower.includes('dinheiro')) accountType = 'cash'
                else if (nameLower.includes('cartão') || nameLower.includes('card')) accountType = 'credit_card'

                const { data: newAccount, error: createError } = await supabase
                    .from('accounts')
                    .insert({
                        tenant_id: tenantId,
                        name,
                        type: accountType,
                        initial_balance: 0,
                        current_balance: 0,
                    })
                    .select('id')
                    .single()

                if (createError) {
                    console.error(`[Import] Error creating account ${name}:`, createError)
                    continue
                }

                if (newAccount) {
                    accountMap.set(name.toLowerCase(), newAccount.id)
                }
            }
        }

        // 5. Prepare transactions for bulk insert
        const transactionsToInsert = transactions.map((tx: ImportTransaction) => {
            const accountId = accountMap.get(tx.via.toLowerCase())
            const date = typeof tx.date === 'string' ? new Date(tx.date) : tx.date

            // Validate category_id - accept valid IDs (not 'default' or empty)
            // Category IDs in DB can be either UUIDs or simple strings like 'supermercado'
            let categoryId: string | null = null
            if (tx.categoryId && tx.categoryId !== 'default' && tx.categoryId.trim().length > 0) {
                categoryId = tx.categoryId
            }

            return {
                tenant_id: tenantId,
                user_id: user.id,
                account_id: accountId,
                category_id: categoryId,
                name: tx.name,
                description: tx.description || tx.name,  // Use name as fallback
                amount: tx.type === 'expense' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
                type: tx.type,
                currency: tx.currency,
                date: date.toISOString(),
                is_recurring: false,
            }
        })

        // 6. Bulk insert transactions
        const { data: createdTransactions, error: insertError } = await supabase
            .from('transactions')
            .insert(transactionsToInsert)
            .select('id')

        if (insertError) {
            console.error('[Import] Bulk insert error:', insertError)
            return NextResponse.json(
                {
                    error: 'Failed to create transactions',
                    details: insertError.message,
                },
                { status: 500 }
            )
        }

        // 7. Revalidate cache
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/transactions')

        // 8. Return success
        return NextResponse.json({
            success: true,
            created: createdTransactions?.length || 0,
            message: `${createdTransactions?.length || 0} transações importadas com sucesso.`,
        })

    } catch (error: any) {
        console.error('[Import] Confirm error:', error)
        return NextResponse.json(
            { error: `Internal error: ${error.message}` },
            { status: 500 }
        )
    }
}
