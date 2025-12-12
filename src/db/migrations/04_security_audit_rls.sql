-- SECURITY AUDIT & HARDENING: ROW LEVEL SECURITY (RLS)
-- This script ensures RLS is ENABLED on all critical tables and applies tenant/user isolation policies.

-- 1. USERS (Public Profile)
-- Users can read their own profile.
-- System can read all (handled by service_role, but for client usage restricted to self).
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- 2. ACCOUNTS
ALTER TABLE IF EXISTS accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Accounts" ON accounts;
CREATE POLICY "Tenant Isolation for Accounts" ON accounts
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- 3. TRANSACTIONS
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Transactions" ON transactions;
CREATE POLICY "Tenant Isolation for Transactions" ON transactions
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- 4. INVESTMENTS: ASSETS
ALTER TABLE IF EXISTS assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Assets" ON assets;
CREATE POLICY "Tenant Isolation for Assets" ON assets
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- 5. INVESTMENTS: QUOTES (Shared Data vs Private?)
-- If quotes are global (e.g. PETR4 price), they should be public readable but system writable.
-- If quotes are per-user (manual entry), they need isolation.
-- Assuming GLOBAL quotes for now (managed by system/job).
ALTER TABLE IF EXISTS quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view quotes" ON quotes;
CREATE POLICY "Authenticated users can view quotes" ON quotes
    FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can insert/update quotes (Implicit by lack of policy, but explicit is good)
-- No INSERT/UPDATE policy for authenticated users.

-- 6. INVESTMENT TRANSACTIONS
ALTER TABLE IF EXISTS investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation for Investment Transactions" ON investment_transactions;
CREATE POLICY "Tenant Isolation for Investment Transactions" ON investment_transactions
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );
