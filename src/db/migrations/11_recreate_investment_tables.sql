-- FIX: RE-CREATE INVESTMENT TABLES
-- Due to persistent schema drift and type mismatches (BigInt vs UUID), 
-- we are resetting the investments tables to a clean, correct state.
-- All columns (total, fees, ticker) and policies are defined correctly from the start.

-- 1. Drop existing tables (and their dependent policies/indexes)
DROP TABLE IF EXISTS "investment_transactions" CASCADE;
DROP TABLE IF EXISTS "assets" CASCADE;

-- 2. Create Assets Table (Corrected with TEXT tenant_id for compatibility)
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL, -- Changed to TEXT to accept both UUID and BigInt (Legacy support)
    ticker TEXT NOT NULL,
    name TEXT,
    type TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    average_price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    last_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Investment Transactions Table (Corrected with TEXT tenant_id)
CREATE TABLE investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL, -- Changed to TEXT
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    ticker TEXT NOT NULL,
    type TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    fees NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Re-Apply Indexes
CREATE INDEX idx_assets_tenant ON assets(tenant_id);
CREATE INDEX idx_inv_tx_tenant ON investment_transactions(tenant_id);
CREATE INDEX idx_inv_tx_asset ON investment_transactions(asset_id);

-- 5. Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

-- 6. Re-Apply Policies (Using Casting for Safety)
CREATE POLICY "Tenant Isolation for Assets" ON assets
    FOR ALL
    USING (
        -- Robust comparison: Cast both sides to text
        tenant_id = (SELECT tenant_id::text FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Tenant Isolation for Investment Transactions" ON investment_transactions
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id::text FROM users WHERE id = auth.uid())
    );

-- Reload Schema
NOTIFY pgrst, 'reload schema';
