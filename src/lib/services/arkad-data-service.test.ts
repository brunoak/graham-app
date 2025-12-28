import { describe, it, expect, vi } from 'vitest'
import { formatArkadContextAsRAG, ArkadContext } from './arkad-data-service'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(() => Promise.resolve({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    gt: vi.fn(() => Promise.resolve({ data: [], error: null })),
                    gte: vi.fn(() => ({
                        order: vi.fn(() => ({
                            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
                        })),
                    })),
                    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
            })),
        })),
    })),
}))

describe('arkad-data-service', () => {
    describe('formatArkadContextAsRAG', () => {
        it('should format empty context correctly', () => {
            const emptyContext: ArkadContext = {
                tenantId: 1,
                assets: [],
                transactions: {
                    total: 0,
                    income: 0,
                    expense: 0,
                    balance: 0,
                    byCategory: [],
                    recent: [],
                },
                goals: [],
                accounts: [],
            }

            const result = formatArkadContextAsRAG(emptyContext)

            expect(result).toContain('DADOS FINANCEIROS DO USUÁRIO')
            expect(result).toContain('Nenhum ativo cadastrado')
            expect(result).toContain('Receitas: R$ 0,00')
            expect(result).toContain('Despesas: R$ 0,00')
        })

        it('should format assets correctly', () => {
            const contextWithAssets: ArkadContext = {
                tenantId: 1,
                assets: [
                    {
                        ticker: 'PETR4',
                        name: 'Petrobras',
                        type: 'stock',
                        quantity: 100,
                        averagePrice: 35.50,
                        currency: 'BRL',
                        totalCost: 3550,
                    },
                    {
                        ticker: 'XPML11',
                        name: 'XP Malls',
                        type: 'fii',
                        quantity: 50,
                        averagePrice: 100,
                        currency: 'BRL',
                        totalCost: 5000,
                    },
                ],
                transactions: {
                    total: 0,
                    income: 0,
                    expense: 0,
                    balance: 0,
                    byCategory: [],
                    recent: [],
                },
                goals: [],
                accounts: [],
            }

            const result = formatArkadContextAsRAG(contextWithAssets)

            expect(result).toContain('PETR4')
            expect(result).toContain('XPML11')
            expect(result).toContain('100 cotas')
            expect(result).toContain('50 cotas')
            expect(result).toContain('Quantidade de Ativos: 2')
            expect(result).toContain('R$ 8.550,00') // Total invested
        })

        it('should format transactions correctly', () => {
            const contextWithTransactions: ArkadContext = {
                tenantId: 1,
                assets: [],
                transactions: {
                    total: 5,
                    income: 5000,
                    expense: 3000,
                    balance: 2000,
                    byCategory: [
                        { category: 'Alimentação', total: 1500, type: 'expense' },
                        { category: 'Transporte', total: 800, type: 'expense' },
                    ],
                    recent: [
                        {
                            date: '2024-12-25',
                            name: 'Salário',
                            amount: 5000,
                            type: 'income',
                            category: 'Salário',
                        },
                        {
                            date: '2024-12-24',
                            name: 'Supermercado',
                            amount: 500,
                            type: 'expense',
                            category: 'Alimentação',
                        },
                    ],
                },
                goals: [],
                accounts: [],
            }

            const result = formatArkadContextAsRAG(contextWithTransactions)

            expect(result).toContain('Receitas: R$ 5.000,00')
            expect(result).toContain('Despesas: R$ 3.000,00')
            expect(result).toContain('Saldo do Período: R$ 2.000,00')
            expect(result).toContain('Alimentação')
            expect(result).toContain('Transporte')
            expect(result).toContain('Salário')
        })

        it('should format goals with progress bar', () => {
            const contextWithGoals: ArkadContext = {
                tenantId: 1,
                assets: [],
                transactions: {
                    total: 0,
                    income: 0,
                    expense: 0,
                    balance: 0,
                    byCategory: [],
                    recent: [],
                },
                goals: [
                    {
                        name: 'Reserva de Emergência',
                        targetValue: 10000,
                        currentValue: 5000,
                        progress: 50,
                        status: 'active',
                    },
                ],
                accounts: [],
            }

            const result = formatArkadContextAsRAG(contextWithGoals)

            expect(result).toContain('METAS FINANCEIRAS')
            expect(result).toContain('Reserva de Emergência')
            expect(result).toContain('50%')
            expect(result).toContain('█████░░░░░') // 50% progress bar
        })

        it('should format accounts correctly', () => {
            const contextWithAccounts: ArkadContext = {
                tenantId: 1,
                assets: [],
                transactions: {
                    total: 0,
                    income: 0,
                    expense: 0,
                    balance: 0,
                    byCategory: [],
                    recent: [],
                },
                goals: [],
                accounts: [
                    { name: 'Nubank', type: 'checking', balance: 1500 },
                    { name: 'XP', type: 'investment', balance: 10000 },
                ],
            }

            const result = formatArkadContextAsRAG(contextWithAccounts)

            expect(result).toContain('CONTAS BANCÁRIAS')
            expect(result).toContain('Nubank')
            expect(result).toContain('XP')
            expect(result).toContain('Saldo Total: R$ 11.500,00')
        })

        it('should not expose sensitive data', () => {
            const context: ArkadContext = {
                tenantId: 1,
                assets: [],
                transactions: {
                    total: 0,
                    income: 0,
                    expense: 0,
                    balance: 0,
                    byCategory: [],
                    recent: [],
                },
                goals: [],
                accounts: [],
            }

            const result = formatArkadContextAsRAG(context)

            // Should not contain tenant ID or IDs
            expect(result).not.toContain('tenantId')
            expect(result).not.toContain('tenant_id')
            expect(result).not.toContain('user_id')
        })
    })
})
