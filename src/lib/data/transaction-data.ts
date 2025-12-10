"use server"

import { createClient } from "@/lib/supabase/server"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { ptBR } from "date-fns/locale"




export type TransactionDTO = {
    id: number
    category: string // joined name
    name: string
    description: string
    date: string // Formatted
    value: number // signed amount
    amount: number // signed amount alias
    via: string
    currency?: string
    status: string
    // Visuals
    categoryIcon?: string
    categoryColor?: string
    // Raw fields for Editing
    raw_date?: string
    raw_amount?: number
    raw_category_id?: string
    type?: "income" | "expense"
}

/**
 * Fetches latest transactions with joined relations.
 */
export async function getTransactions(page = 1, limit = 10, month?: number, year?: number): Promise<{ data: TransactionDTO[], total: number }> {
    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
        .from("transactions")
        .select(`
            id,
            amount,
            type,
            date,
            currency,
            name,
            description,
            category_id,
            category:categories(name, icon, color),
            account:accounts(name),
            is_recurring
        `, { count: "exact" })

    if (month !== undefined && year !== undefined) {
        const startDate = new Date(year, month, 1)
        const endDate = endOfMonth(startDate)
        query = query
            .gte("date", format(startDate, 'yyyy-MM-dd'))
            .lte("date", format(endDate, 'yyyy-MM-dd'))
    }

    const { data, count, error } = await query
        .order("date", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)

    if (error) {
        console.error("Error fetching transactions", error)
        return { data: [], total: 0 }
    }
    const mappedData = (data as any[]).map(t => ({
        id: t.id,
        category: t.category?.name || "Sem categoria",
        name: t.name || t.description || "Transação",
        description: t.description || "",
        date: format(new Date(new Date(t.date).getUTCFullYear(), new Date(t.date).getUTCMonth(), new Date(t.date).getUTCDate()), "d 'de' MMM", { locale: ptBR }),
        value: Number(t.amount),
        amount: Number(t.amount),
        via: t.account?.name || "Desconhecido",
        currency: t.currency || "BRL",
        status: "completed",
        categoryIcon: t.category?.icon,
        categoryColor: t.category?.color,
        // Raw fields for Editing
        raw_date: t.date,
        raw_amount: Number(t.amount),
        raw_category_id: t.category_id,
        type: t.type
    }))

    return { data: mappedData, total: count || 0 }
}
