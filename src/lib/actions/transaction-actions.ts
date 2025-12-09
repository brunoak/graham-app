"use server"

import { createClient } from "@/lib/supabase/server"
import { transactionSchema, TransactionInput } from "@/lib/schemas/transaction-schema"
import { revalidatePath } from "next/cache"

/**
 * Creates a new transaction in the database.
 * Handles Authentication, Input Validation, and automatic resolution of Categories/Accounts.
 * 
 * @param input - The raw input data from the form
 * @returns The created transaction object or throws an error
 */
export async function createTransaction(input: TransactionInput) {
    // 1. Authentication Check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        throw new Error("Unauthorized: Você precisa estar logado para criar transações.")
    }

    // 2. Input Validation (Zod)
    const result = transactionSchema.safeParse(input)

    if (!result.success) {
        // ZodError 'issues' provides the details
        const issues = result.error.issues || []
        const errorMessage = issues.map(e => e.message).join(", ") || "Validation failed"
        throw new Error(`Dados inválidos: ${errorMessage}`)
    }

    const data = result.data

    // 3. Get User's Tenant
    // We fetch the public user profile to get the tenant_id
    const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single()

    if (profileError || !userProfile) {
        // Fallback: If for some reason public.users is missing (shouldn't happen due to triggers), fail.
        console.error("User profile not found", profileError)
        throw new Error("Erro de integridade: Perfil de usuário não encontrado.")
    }

    const tenantId = userProfile.tenant_id

    // 4. Resolve Category (Find or Create)
    let categoryId: number | null = null

    // First, try to find existing category by name
    const { data: existingCategory } = await supabase
        .from("categories")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("name", data.category) // Case insensitive match
        .single()

    if (existingCategory) {
        categoryId = existingCategory.id
    } else {
        // Create new category if not exists
        // Defaulting type/classification based on transaction type if possible, or generic
        // If transaction is expense, category likely expense.
        const { data: newCategory, error: createCatError } = await supabase
            .from("categories")
            .insert({
                tenant_id: tenantId,
                name: data.category,
                type: data.type // 'income' or 'expense'
            })
            .select("id")
            .single()

        if (createCatError) {
            console.error("Error creating category", createCatError)
            throw new Error(`Erro ao criar categoria: ${createCatError.message}`)
        }
        categoryId = newCategory.id
    }

    // 5. Resolve Account (Find or Create)
    let accountId: number | null = null

    const { data: existingAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("tenant_id", tenantId)
        .ilike("name", data.via)
        .single()

    if (existingAccount) {
        accountId = existingAccount.id
    } else {
        // Determine type based on name heuristics
        let accountType = "checking"
        const nameLower = data.via.toLowerCase()
        if (nameLower.includes("carteira") || nameLower.includes("dinheiro")) accountType = "cash"
        else if (nameLower.includes("cartão") || nameLower.includes("card")) accountType = "credit_card"
        else if (nameLower.includes("invest")) accountType = "investment"

        const { data: newAccount, error: createAccError } = await supabase
            .from("accounts")
            .insert({
                tenant_id: tenantId,
                name: data.via,
                type: accountType,
                initial_balance: 0,
                current_balance: 0
            })
            .select("id")
            .single()

        if (createAccError) {
            console.error("Error creating account", createAccError)
            throw new Error(`Erro ao criar conta: ${createAccError.message}`)
        }
        accountId = newAccount.id
    }

    // 6. Create Transaction
    const { data: transaction, error: txError } = await supabase
        .from("transactions")
        .insert({
            tenant_id: tenantId,
            user_id: user.id,
            account_id: accountId,
            category_id: categoryId,
            name: data.name,
            description: data.description,
            amount: data.type === "expense" ? -Math.abs(data.amount) : Math.abs(data.amount),
            type: data.type,
            date: data.date.toISOString(),
            is_recurring: data.isRecurring || false,
        })
        .select()
        .single()

    if (txError) {
        console.error("Error creating transaction", txError)
        throw new Error(`Erro ao salvar transação: ${txError.message}`)
    }

    // 7. Revalidate Cache
    revalidatePath("/dashboard")
    revalidatePath("/dashboard/transactions")

    return transaction
}
