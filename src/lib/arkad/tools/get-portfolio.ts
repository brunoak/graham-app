/**
 * NOTA: Este arquivo é apenas documentação/referência.
 * A implementação real está inline em /api/chat/route.ts
 * 
 * Tool para buscar carteira de investimentos do usuário.
 */

import { z } from 'zod';

// Schema de parâmetros para referência
export const portfolioParams = z.object({
    assetType: z.enum(['stock', 'fii', 'etf', 'bdr', 'crypto', 'fixed_income'])
        .optional()
        .describe('Filtrar por tipo de ativo'),
});

// Tipo de retorno esperado
export interface PortfolioResult {
    assets: Array<{
        ticker: string;
        type: string;
        qty: number;
        pm: number;
        invested: number;
    }>;
    summary: {
        total_assets: number;
        total_invested: number;
        allocation: Array<{
            type: string;
            count: number;
            invested: number;
            pct: string;
        }>;
    };
}

// A implementação real está em /api/chat/route.ts > createArkadTools()
