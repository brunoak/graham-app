-- Create Assets Table (Portfolio Positions)
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    name TEXT,
    type TEXT NOT NULL, -- 'stock_br', 'reit_br', etc.
    quantity NUMERIC NOT NULL DEFAULT 0,
    average_price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    last_update TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Quotes Table (Market Prices)
CREATE TABLE IF NOT EXISTS quotes (
    ticker TEXT PRIMARY KEY,
    price NUMERIC NOT NULL,
    change_percent NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Investment Transactions Table (History)
CREATE TABLE IF NOT EXISTS investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    ticker TEXT NOT NULL,
    type TEXT NOT NULL, -- 'buy', 'sell'
    date TIMESTAMPTZ NOT NULL,
    quantity NUMERIC NOT NULL,
    price NUMERIC NOT NULL,
    fees NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_tenant ON investment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_asset ON investment_transactions(asset_id);
