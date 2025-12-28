
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFinancialSummaryTool, getInvestmentPortfolioTool, getRecentTransactionsTool } from './arkad-actions';

// Mock dependencies
// We use vi.mock to intercept the dynamic imports used in arkad-actions.ts
// Note: The paths must match exactly what is used in the source file
vi.mock('@/lib/data/transaction-data', () => ({
    getTransactions: vi.fn(),
}));

vi.mock('./investment-actions', () => ({
    getAssets: vi.fn(),
}));

describe('Arkad Actions Tools', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getFinancialSummaryTool', () => {
        it('should calculate income, expense, and balance correctly', async () => {
            // Import the mock to defined its behavior
            const transactionData = await import('@/lib/data/transaction-data');

            const mockTransactions = [
                { type: 'income', value: 1000 },
                { type: 'income', value: 500 },
                { type: 'expense', value: 200 },
                { type: 'expense', value: 300 }, // Total Expense: 500, Total Income: 1500
            ];

            // @ts-ignore
            transactionData.getTransactions.mockResolvedValue({ data: mockTransactions });

            const result = await getFinancialSummaryTool();

            expect(result).toEqual({
                recent_income: 1500,
                recent_expense: 500,
                balance_snapshot: 1000, // 1500 - 500
                last_transactions_count: 4,
            });
        });

        it('should handle empty transactions', async () => {
            const transactionData = await import('@/lib/data/transaction-data');
            // @ts-ignore
            transactionData.getTransactions.mockResolvedValue({ data: [] });

            const result = await getFinancialSummaryTool();

            expect(result).toEqual({
                recent_income: 0,
                recent_expense: 0,
                balance_snapshot: 0,
                last_transactions_count: 0,
            });
        });
    });

    describe('getInvestmentPortfolioTool', () => {
        it('should map assets correctly', async () => {
            const investmentActions = await import('./investment-actions');
            const mockAssets = [
                { ticker: 'AAPL', quantity: 10, average_price: 150, currency: 'USD', type: 'stock_us', extra_field: 'ignore' },
                { ticker: 'PETR4', quantity: 100, average_price: 30, currency: 'BRL', type: 'stock_br', extra_field: 'ignore' }
            ];

            // @ts-ignore
            investmentActions.getAssets.mockResolvedValue(mockAssets);

            const result = await getInvestmentPortfolioTool();

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                ticker: 'AAPL',
                qty: 10,
                avg_price: 150,
                currency: 'USD',
                type: 'stock_us'
            });
            // Ensure extra fields are stripped if the implementation does so (based on known code it maps specific fields)
            expect(result[0]).not.toHaveProperty('extra_field');
        });
    });

    describe('getRecentTransactionsTool', () => {
        it('should fetch transactions with default limit', async () => {
            const transactionData = await import('@/lib/data/transaction-data');
            // @ts-ignore
            transactionData.getTransactions.mockResolvedValue({ data: [] });

            await getRecentTransactionsTool();

            // @ts-ignore
            expect(transactionData.getTransactions).toHaveBeenCalledWith(1, 10);
        });

        it('should fetch transactions with custom limit', async () => {
            const transactionData = await import('@/lib/data/transaction-data');
            // @ts-ignore
            transactionData.getTransactions.mockResolvedValue({ data: [] });

            await getRecentTransactionsTool(5);

            // @ts-ignore
            expect(transactionData.getTransactions).toHaveBeenCalledWith(1, 5);
        });

        it('should map transaction fields correctly', async () => {
            const transactionData = await import('@/lib/data/transaction-data');
            const mockTransactions = [
                {
                    date: '2023-01-01',
                    name: 'Amazon',
                    value: 50,
                    type: 'expense',
                    category: 'Shopping',
                    id: 123
                }
            ];

            // @ts-ignore
            transactionData.getTransactions.mockResolvedValue({ data: mockTransactions });

            const result = await getRecentTransactionsTool();

            expect(result[0]).toEqual({
                date: '2023-01-01',
                name: 'Amazon',
                amount: 50,
                type: 'expense',
                category: 'Shopping'
            });
            expect(result[0]).not.toHaveProperty('id');
        });
    });

});
