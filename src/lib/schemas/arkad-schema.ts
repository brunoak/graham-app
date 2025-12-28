
import { z } from 'zod';

// --- Input Schemas ---

export const FinancialSummaryInputSchema = z.object({});

export const InvestmentPortfolioInputSchema = z.object({});

export const RecentTransactionsInputSchema = z.object({
    limit: z.number().optional().describe('Number of transactions to return (default 10)'),
    month: z.number().optional().describe('Filter by month (0-11)'),
    year: z.number().optional().describe('Filter by year (e.g. 2025)'),
});

// --- Output Schemas (for Validation/Type Sharing) ---

export const FinancialSummaryOutputSchema = z.object({
    recent_income: z.number(),
    recent_expense: z.number(),
    balance_snapshot: z.number(),
    last_transactions_count: z.number(),
});

export const InvestmentAssetSchema = z.object({
    ticker: z.string(),
    qty: z.number(),
    avg_price: z.number(),
    currency: z.string(),
    type: z.string(),
});

export const InvestmentPortfolioOutputSchema = z.array(InvestmentAssetSchema);

export const TransactionItemSchema = z.object({
    date: z.string(), // ISO date string usually
    name: z.string(),
    amount: z.number(),
    type: z.string().optional(), // 'income' | 'expense' typically
    category: z.string(),
});

export const RecentTransactionsOutputSchema = z.array(TransactionItemSchema);

// Types inferred from Schemas
export type FinancialSummaryInput = z.infer<typeof FinancialSummaryInputSchema>;
export type InvestmentPortfolioInput = z.infer<typeof InvestmentPortfolioInputSchema>;
export type RecentTransactionsInput = z.infer<typeof RecentTransactionsInputSchema>;

export type FinancialSummaryOutput = z.infer<typeof FinancialSummaryOutputSchema>;
export type InvestmentPortfolioOutput = z.infer<typeof InvestmentPortfolioOutputSchema>;
export type RecentTransactionsOutput = z.infer<typeof RecentTransactionsOutputSchema>;
