-- FIX: Ensure RLS is enabled and policies exist for Investment tables.
-- This handles the case where migration 04 ran before 05.

-- 1. ASSETS
ALTER TABLE IF EXISTS assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Assets" ON assets;
CREATE POLICY "Tenant Isolation for Assets" ON assets
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- 2. QUOTES
ALTER TABLE IF EXISTS quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view quotes" ON quotes;
CREATE POLICY "Authenticated users can view quotes" ON quotes
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. INVESTMENT TRANSACTIONS
ALTER TABLE IF EXISTS investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Investment Transactions" ON investment_transactions;
CREATE POLICY "Tenant Isolation for Investment Transactions" ON investment_transactions
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );
