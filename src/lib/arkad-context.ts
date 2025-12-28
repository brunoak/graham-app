import { getAssets } from "@/lib/actions/investment-actions"

// Helper to format currency
const toBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export async function getArkadContext(userId: string) {
    // 1. Fetch Assets (Investments)
    // Note: This fetches from Supabase using server actions which handle auth internally or we pass client
    // getAssets uses 'getAuthenticatedUser' internally so it should work if called from a Server Component/Route Handler.
    const assets = await getAssets()

    // 2. Calculate Totals
    // Simple sum of current position value (Qty * AvgPrice or Current if available)
    // For Context, AvgPrice is a safe baseline. Ideally we'd map real-time quotes but let's start simple.
    const totalInvested = assets.reduce((acc, asset) => acc + (asset.quantity * asset.average_price), 0)

    // 3. Top Assets
    const topAssets = assets
        .sort((a, b) => (b.quantity * b.average_price) - (a.quantity * a.average_price))
        .slice(0, 5)
        .map(a => `${a.ticker} (${a.quantity} cotas)`)
        .join(", ")

    // 4. Construct Context String
    // This text is injected into the System Prompt
    return `
    DADOS FINANCEIROS DO USUÁRIO (Contexto RAG):
    - Total Investido (Custo): ${toBRL(totalInvested)}
    - Quantidade de Ativos: ${assets.length}
    - Maiores Posições: ${topAssets || "Nenhuma"}
    
    ESTRATÉGIA DO USUÁRIO:
    - Perfil: Value Investing (Graham)
    - Foco: Longo Prazo, Dividendos e Margem de Segurança.
    `.trim()
}
