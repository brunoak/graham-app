/**
 * NOTA: Este arquivo é apenas documentação/referência.
 * A implementação real está inline em /api/chat/route.ts
 * 
 * Tool para obter resumo financeiro do período.
 * Fornece visão geral de receitas, despesas e balanço.
 */

import { z } from 'zod';

// Schema de parâmetros para referência
export const financialSummaryParams = z.object({
    period: z.enum(['month', 'quarter', 'year'])
        .default('month')
        .describe('Período: month (mês atual), quarter (trimestre), year (ano)'),
});

// Tipo de retorno esperado
export interface FinancialSummaryResult {
    period: string;
    income: number;
    expenses: number;
    balance: number;
    savings_rate: string;
    top_categories: Array<{
        name: string;
        total: number;
        pct: string;
    }>;
}

// A implementação real está em /api/chat/route.ts > createArkadTools()
