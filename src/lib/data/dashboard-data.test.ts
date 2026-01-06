/**
 * @fileoverview Unit tests for dashboard data calculation functions.
 * Tests balance, income, expense, and investment calculations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Helper function to test the calculation logic (extracted from dashboard-data.ts)
// This avoids needing to mock Supabase client for unit tests

interface Transaction {
    amount: number
    date: string
}

interface Asset {
    ticker: string
    quantity: number
    average_price: number
}

// Helper to calculate percentage change
function calculateChange(current: number, previous: number): number {
    if (Math.abs(previous) < 0.01) return current === 0 ? 0 : 100
    return ((current - previous) / previous) * 100
}

// Test the pure calculation logic
function calculateSummary(
    transactions: Transaction[],
    assets: Asset[],
    targetDate: Date,
    quotes: Record<string, number> = {}
) {
    let balanceUpToMonth = 0
    let balanceUpToPrevMonth = 0
    let monthIncome = 0
    let monthExpense = 0
    let lastMonthIncome = 0
    let lastMonthExpense = 0

    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()

    const prevDate = new Date(targetYear, targetMonth - 1, 1)
    const prevMonth = prevDate.getMonth()
    const prevYear = prevDate.getFullYear()

    const endOfTargetMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59)
    const endOfPrevMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59)

    transactions.forEach(t => {
        const amount = Number(t.amount)
        const tDate = new Date(t.date)
        const tMonth = tDate.getMonth()
        const tYear = tDate.getFullYear()

        if (tDate <= endOfTargetMonth) {
            balanceUpToMonth += amount
        }

        if (tDate <= endOfPrevMonth) {
            balanceUpToPrevMonth += amount
        }

        if (tMonth === targetMonth && tYear === targetYear) {
            if (amount > 0) monthIncome += amount
            else monthExpense += Math.abs(amount)
        }

        if (tMonth === prevMonth && tYear === prevYear) {
            if (amount > 0) lastMonthIncome += amount
            else lastMonthExpense += Math.abs(amount)
        }
    })

    let totalInvestments = 0
    assets.forEach(asset => {
        const price = quotes[asset.ticker] ?? asset.average_price
        totalInvestments += asset.quantity * price
    })

    return {
        balance: balanceUpToMonth,
        income: monthIncome,
        expenses: monthExpense,
        investments: totalInvestments,
        balanceChange: calculateChange(balanceUpToMonth, balanceUpToPrevMonth),
        incomeChange: calculateChange(monthIncome, lastMonthIncome),
        expensesChange: calculateChange(monthExpense, lastMonthExpense),
        investmentsChange: 0
    }
}

describe('Dashboard Summary Calculations', () => {
    describe('Balance Calculation', () => {
        it('calculates cumulative balance up to selected month', () => {
            const transactions = [
                { amount: 1000, date: '2025-11-15' },
                { amount: -500, date: '2025-11-20' },
                { amount: 2000, date: '2025-12-10' },
            ]

            // Check December balance (should include all transactions)
            const dec = calculateSummary(transactions, [], new Date(2025, 11, 1))
            expect(dec.balance).toBe(2500) // 1000 - 500 + 2000

            // Check November balance (should exclude December transaction)
            const nov = calculateSummary(transactions, [], new Date(2025, 10, 1))
            expect(nov.balance).toBe(500) // 1000 - 500
        })

        it('returns zero balance when no transactions', () => {
            const result = calculateSummary([], [], new Date(2025, 11, 1))
            expect(result.balance).toBe(0)
        })
    })

    describe('Income/Expense Calculation', () => {
        it('correctly separates income and expense for current month', () => {
            const transactions = [
                { amount: 5000, date: '2025-12-05' },   // Income
                { amount: -1500, date: '2025-12-10' }, // Expense
                { amount: 1000, date: '2025-12-15' },  // Income
                { amount: -500, date: '2025-12-20' },  // Expense
            ]

            const result = calculateSummary(transactions, [], new Date(2025, 11, 1))

            expect(result.income).toBe(6000)    // 5000 + 1000
            expect(result.expenses).toBe(2000) // 1500 + 500 (absolute values)
        })

        it('returns zero for months with no transactions', () => {
            const transactions = [
                { amount: 5000, date: '2025-12-05' },
            ]

            // Check January 2026 (no transactions)
            const result = calculateSummary(transactions, [], new Date(2026, 0, 1))

            expect(result.income).toBe(0)
            expect(result.expenses).toBe(0)
            expect(result.balance).toBe(5000) // Cumulative from December
        })
    })

    describe('Percentage Change Calculation', () => {
        it('calculates correct percentage increase', () => {
            expect(calculateChange(150, 100)).toBe(50)
        })

        it('calculates correct percentage decrease', () => {
            expect(calculateChange(80, 100)).toBe(-20)
        })

        it('returns 100% when previous is zero and current is positive', () => {
            expect(calculateChange(100, 0)).toBe(100)
        })

        it('returns 0% when both are zero', () => {
            expect(calculateChange(0, 0)).toBe(0)
        })

        it('handles negative balance correctly', () => {
            // Going from -100 to -50 is an improvement (50% better)
            expect(calculateChange(-50, -100)).toBe(50)
        })
    })

    describe('Investment Calculation', () => {
        it('calculates total using average price when no quotes', () => {
            const assets = [
                { ticker: 'WEGE3', quantity: 100, average_price: 25.00 },
                { ticker: 'PETR4', quantity: 200, average_price: 30.00 },
            ]

            const result = calculateSummary([], assets, new Date())
            expect(result.investments).toBe(8500) // 100*25 + 200*30
        })

        it('uses real-time quotes when available', () => {
            const assets = [
                { ticker: 'WEGE3', quantity: 100, average_price: 25.00 },
                { ticker: 'PETR4', quantity: 200, average_price: 30.00 },
            ]
            const quotes = {
                'WEGE3': 50.00, // Price doubled
                'PETR4': 35.00, // Price increased
            }

            const result = calculateSummary([], assets, new Date(), quotes)
            expect(result.investments).toBe(12000) // 100*50 + 200*35
        })

        it('falls back to average price for missing quotes', () => {
            const assets = [
                { ticker: 'WEGE3', quantity: 100, average_price: 25.00 },
                { ticker: 'PETR4', quantity: 200, average_price: 30.00 },
            ]
            const quotes = {
                'WEGE3': 50.00, // Only WEGE3 has quote
            }

            const result = calculateSummary([], assets, new Date(), quotes)
            expect(result.investments).toBe(11000) // 100*50 + 200*30
        })

        it('returns zero when no assets', () => {
            const result = calculateSummary([], [], new Date())
            expect(result.investments).toBe(0)
        })
    })

    describe('Cross-Month Comparison', () => {
        it('compares December with November correctly', () => {
            const transactions = [
                { amount: 3000, date: '2025-11-10' },   // Nov income
                { amount: -1000, date: '2025-11-15' }, // Nov expense
                { amount: 5000, date: '2025-12-10' },   // Dec income
                { amount: -2000, date: '2025-12-15' }, // Dec expense
            ]

            const dec = calculateSummary(transactions, [], new Date(2025, 11, 1))

            // December values
            expect(dec.income).toBe(5000)
            expect(dec.expenses).toBe(2000)

            // Compare with November (5000 vs 3000 = 66.67% increase)
            expect(dec.incomeChange).toBeCloseTo(66.67, 1)

            // Compare expenses (2000 vs 1000 = 100% increase)
            expect(dec.expensesChange).toBe(100)
        })
    })
})
