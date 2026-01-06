-- ================================================
-- Índices de Performance para Transactions
-- ================================================
-- Execute este script no Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste > Run

-- 1. Índice composto para a query principal de transações
-- Usado em: getTransactions() - filtro por tenant + data + ordenação
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_date 
ON transactions(tenant_id, date DESC, id DESC);

-- 2. Índice para filtros de data (range queries)
CREATE INDEX IF NOT EXISTS idx_transactions_date 
ON transactions(date DESC);

-- 3. Índice para joins com categories
CREATE INDEX IF NOT EXISTS idx_transactions_category 
ON transactions(category_id);

-- 4. Índice para joins com accounts
CREATE INDEX IF NOT EXISTS idx_transactions_account 
ON transactions(account_id);

-- ================================================
-- Verificar índices existentes
-- ================================================
-- Execute separadamente para ver quais já existem:

-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'transactions';

-- ================================================
-- Estatísticas de performance (opcional)
-- ================================================
-- Após criar os índices, rode ANALYZE para atualizar as estatísticas:

ANALYZE transactions;

-- ================================================
-- Medir performance da query (opcional)
-- ================================================
-- Use EXPLAIN ANALYZE para ver o plano de execução:

-- EXPLAIN ANALYZE 
-- SELECT * FROM transactions 
-- WHERE tenant_id = 'your-tenant-id' 
--   AND date >= '2025-12-01' 
--   AND date <= '2025-12-31' 
-- ORDER BY date DESC, id DESC 
-- LIMIT 20;
