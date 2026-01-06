/**
 * NOTA: Este arquivo é apenas documentação/referência.
 * A implementação real está inline em /api/chat/route.ts
 * 
 * Tool para buscar transações do usuário com filtros.
 */

import { z } from 'zod';

// Schema de parâmetros para referência
export const transactionsParams = z.object({
    startDate: z.string().optional().describe('Data inicial (YYYY-MM-DD)'),
    endDate: z.string().optional().describe('Data final (YYYY-MM-DD)'),
    category: z.string().optional().describe('Categoria para filtrar'),
    type: z.enum(['income', 'expense']).optional().describe('Tipo de transação'),
    limit: z.number().default(20).describe('Limite de resultados'),
});

// Tipo de retorno esperado
export interface TransactionsResult {
    transactions: Array<{
        date: string;
        name: string;
        amount: number;
        type: string;
        category: string;
    }>;
    summary: {
        count: number;
        income: number;
        expenses: number;
        balance: number;
    };
}

// A implementação real está em /api/chat/route.ts > createArkadTools()
