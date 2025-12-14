-- FIX: Comprehensive Schema Repair for investment_transactions
-- Ensures ALL required columns exist, handling any previous partial migrations.

DO $$
BEGIN
    -- 1. Check for 'total' (The current error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investment_transactions' AND column_name = 'total') THEN
        ALTER TABLE investment_transactions ADD COLUMN total NUMERIC NOT NULL DEFAULT 0;
    END IF;

    -- 2. Check for 'fees' (Just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investment_transactions' AND column_name = 'fees') THEN
        ALTER TABLE investment_transactions ADD COLUMN fees NUMERIC DEFAULT 0;
    END IF;

    -- 3. Check for 'ticker'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investment_transactions' AND column_name = 'ticker') THEN
        ALTER TABLE investment_transactions ADD COLUMN ticker TEXT NOT NULL DEFAULT 'UNKNOWN';
    END IF;

    -- 4. Check for 'type'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investment_transactions' AND column_name = 'type') THEN
        ALTER TABLE investment_transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'buy';
    END IF;
    
    -- 5. Check for 'asset_id' foreign key column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investment_transactions' AND column_name = 'asset_id') THEN
         ALTER TABLE investment_transactions ADD COLUMN asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
    END IF;

END $$;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
