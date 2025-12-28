/**
 * @fileoverview Arkad Data Service - Core data fetching for AI context.
 * 
 * This module is responsible for:
 * 1. Fetching all user financial data from Supabase (assets, transactions, goals, accounts)
 * 2. Aggregating and processing data (category breakdown, totals, progress)
 * 3. Formatting data as a RAG (Retrieval-Augmented Generation) context string
 * 
 * The formatted context is injected directly into the AI system prompt,
 * ensuring Arkad has access to all relevant user data without hallucination.
 * 
 * @module arkad-data-service
 * @see {@link file:///src/app/api/chat/route.ts} - Consumer of this service
 */

import { createClient } from "@/lib/supabase/server"
import { z } from 'zod'

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Zod schema for validating the complete Arkad context object.
 * This schema ensures type safety and data integrity for all financial data.
 * 
 * @example
 * const context = await getArkadContext(tenantId);
 * const validated = ArkadContextSchema.parse(context); // Throws if invalid
 */
export const ArkadContextSchema = z.object({
    tenantId: z.number(),
    assets: z.array(z.object({
        ticker: z.string(),
        name: z.string().nullable(),
        type: z.string(),
        quantity: z.number(),
        averagePrice: z.number(),
        currency: z.string(),
        totalCost: z.number(),
    })),
    transactions: z.object({
        total: z.number(),
        income: z.number(),
        expense: z.number(),
        balance: z.number(),
        byCategory: z.array(z.object({
            category: z.string(),
            total: z.number(),
            type: z.string(),
        })),
        recent: z.array(z.object({
            date: z.string(),
            name: z.string().nullable(),
            amount: z.number(),
            type: z.string(),
            category: z.string().nullable(),
        })),
    }),
    goals: z.array(z.object({
        name: z.string(),
        targetValue: z.number(),
        currentValue: z.number(),
        progress: z.number(),
        status: z.string(),
    })),
    accounts: z.array(z.object({
        name: z.string(),
        type: z.string(),
        balance: z.number(),
    })),
})

/** TypeScript type inferred from the Zod schema */
export type ArkadContext = z.infer<typeof ArkadContextSchema>

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetches all financial data for a user and formats it for Arkad AI context.
 * This is the **single source of truth** for what Arkad knows about the user.
 * 
 * Data sources:
 * - `assets` table: Investment portfolio (stocks, FIIs, ETFs, etc.)
 * - `transactions` table: Income/expense records from last 90 days
 * - `goals` table: Financial goals with progress tracking
 * - `accounts` table: Bank accounts with current balances
 * 
 * @param tenantId - The tenant ID for multi-tenancy isolation
 * @returns Promise<ArkadContext> - Structured financial data
 * 
 * @example
 * const context = await getArkadContext(123);
 * console.log(context.assets.length); // Number of assets
 * console.log(context.transactions.income); // Total income (90 days)
 */
export async function getArkadContext(tenantId: number): Promise<ArkadContext> {
    const supabase = await createClient()

    // Parallel fetch for performance
    const [assetsResult, transactionsResult, goalsResult, accountsResult] = await Promise.all([
        // Assets with quantity > 0
        supabase
            .from('assets')
            .select('ticker, name, type, quantity, average_price, currency')
            .eq('tenant_id', String(tenantId))
            .gt('quantity', 0),

        // Transactions from last 90 days
        supabase
            .from('transactions')
            .select(`
        id, type, amount, date, name, description,
        categories:category_id (name)
      `)
            .eq('tenant_id', tenantId)
            .gte('date', getDateNDaysAgo(90))
            .order('date', { ascending: false })
            .limit(100),

        // Goals
        supabase
            .from('goals')
            .select('name, target_value, current_value, status')
            .eq('tenant_id', tenantId),

        // Accounts
        supabase
            .from('accounts')
            .select('name, type, current_balance')
            .eq('tenant_id', tenantId),
    ])

    // Process Assets
    const assets = (assetsResult.data || []).map(a => ({
        ticker: a.ticker,
        name: a.name,
        type: a.type,
        quantity: Number(a.quantity),
        averagePrice: Number(a.average_price),
        currency: a.currency || 'BRL',
        totalCost: Number(a.quantity) * Number(a.average_price),
    }))

    // Process Transactions
    const transactions = transactionsResult.data || []
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0)
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0)

    // Aggregate by category
    const categoryMap = new Map<string, { total: number; type: string }>()
    transactions.forEach(t => {
        const catName = (t.categories as any)?.name || 'Sem categoria'
        const existing = categoryMap.get(catName) || { total: 0, type: t.type }
        existing.total += Number(t.amount)
        categoryMap.set(catName, existing)
    })
    const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        total: data.total,
        type: data.type,
    }))

    // Recent transactions (top 20 for display)
    const recent = transactions.slice(0, 20).map(t => ({
        date: t.date,
        name: t.name || t.description,
        amount: Number(t.amount),
        type: t.type,
        category: (t.categories as any)?.name || null,
    }))

    // Process Goals
    const goals = (goalsResult.data || []).map(g => ({
        name: g.name,
        targetValue: Number(g.target_value),
        currentValue: Number(g.current_value || 0),
        progress: g.target_value > 0
            ? Math.round((Number(g.current_value || 0) / Number(g.target_value)) * 100)
            : 0,
        status: g.status || 'active',
    }))

    // Process Accounts
    const accounts = (accountsResult.data || []).map(a => ({
        name: a.name,
        type: a.type,
        balance: Number(a.current_balance || 0),
    }))

    return {
        tenantId,
        assets,
        transactions: {
            total: transactions.length,
            income,
            expense,
            balance: income - expense,
            byCategory,
            recent,
        },
        goals,
        accounts,
    }
}

// ============================================================================
// CONTEXT FORMATTING
// ============================================================================

/**
 * Formats the ArkadContext into a human-readable string for RAG injection.
 * This is the exact text that goes into the AI system prompt.
 * 
 * The output includes:
 * - 💳 Bank accounts with balances
 * - 📊 Investment portfolio with positions
 * - 💰 Cash flow summary (90 days)
 * - 📂 Expenses by category (top 10)
 * - 🎯 Financial goals with progress bars
 * - 📜 Recent transactions
 * 
 * @param context - The structured financial data from getArkadContext()
 * @returns Formatted string ready for AI system prompt injection
 * 
 * @example
 * const context = await getArkadContext(tenantId);
 * const ragText = formatArkadContextAsRAG(context);
 * // Output:
 * // ════════════════════════════════════════════════════
 * //             DADOS FINANCEIROS DO USUÁRIO
 * // ════════════════════════════════════════════════════
 * // 💳 CONTAS BANCÁRIAS:
 * //    • Nubank (checking): R$ 1.500,00
 * // ...
 */
export function formatArkadContextAsRAG(context: ArkadContext): string {
    let rag = "═══════════════════════════════════════════════════════════════\n"
    rag += "                DADOS FINANCEIROS DO USUÁRIO\n"
    rag += "═══════════════════════════════════════════════════════════════\n\n"

    // 1. Accounts Summary
    if (context.accounts.length > 0) {
        const totalBalance = context.accounts.reduce((sum, a) => sum + a.balance, 0)
        rag += "💳 CONTAS BANCÁRIAS:\n"
        context.accounts.forEach(a => {
            rag += `   • ${a.name} (${a.type}): R$ ${a.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
        })
        rag += `   → Saldo Total: R$ ${totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`
    }

    // 2. Investments
    if (context.assets.length > 0) {
        const totalInvested = context.assets.reduce((sum, a) => sum + a.totalCost, 0)
        rag += "📊 CARTEIRA DE INVESTIMENTOS:\n"
        rag += `   • Total Investido (Custo): R$ ${totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
        rag += `   • Quantidade de Ativos: ${context.assets.length}\n`
        rag += "   • Posições:\n"
        context.assets.forEach(a => {
            rag += `      - ${a.ticker} (${a.type}): ${a.quantity} cotas @ R$ ${a.averagePrice.toFixed(2)} = R$ ${a.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
        })
        rag += "\n"
    } else {
        rag += "📊 CARTEIRA DE INVESTIMENTOS: Nenhum ativo cadastrado.\n\n"
    }

    // 3. Cash Flow (90 days)
    rag += "💰 FLUXO DE CAIXA (Últimos 90 dias):\n"
    rag += `   • Receitas: R$ ${context.transactions.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
    rag += `   • Despesas: R$ ${context.transactions.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
    rag += `   • Saldo do Período: R$ ${context.transactions.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`

    // 4. Spending by Category
    if (context.transactions.byCategory.length > 0) {
        const expenses = context.transactions.byCategory.filter(c => c.type === 'expense')
        if (expenses.length > 0) {
            rag += "📂 GASTOS POR CATEGORIA:\n"
            expenses
                .sort((a, b) => b.total - a.total)
                .slice(0, 10) // Top 10 categories
                .forEach(c => {
                    rag += `   • ${c.category}: R$ ${c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`
                })
            rag += "\n"
        }
    }

    // 5. Goals
    if (context.goals.length > 0) {
        rag += "🎯 METAS FINANCEIRAS:\n"
        context.goals.forEach(g => {
            const bar = "█".repeat(Math.floor(g.progress / 10)) + "░".repeat(10 - Math.floor(g.progress / 10))
            rag += `   • ${g.name}: R$ ${g.currentValue.toLocaleString('pt-BR')} / R$ ${g.targetValue.toLocaleString('pt-BR')} [${bar}] ${g.progress}%\n`
        })
        rag += "\n"
    }

    // 6. Recent Transactions
    if (context.transactions.recent.length > 0) {
        rag += "📜 ÚLTIMAS MOVIMENTAÇÕES:\n"
        context.transactions.recent.slice(0, 10).forEach(t => {
            const sign = t.type === 'income' ? '+' : '-'
            rag += `   ${t.date} | ${sign}R$ ${Math.abs(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | ${t.name || 'Sem descrição'} ${t.category ? `(${t.category})` : ''}\n`
        })
        rag += "\n"
    }

    rag += "═══════════════════════════════════════════════════════════════\n"

    return rag
}

// ============================================================================
// HELPERS
// ============================================================================

function getDateNDaysAgo(n: number): string {
    const date = new Date()
    date.setDate(date.getDate() - n)
    return date.toISOString().split('T')[0]
}
