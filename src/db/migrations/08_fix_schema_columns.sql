-- FIX: Ensure 'ticker' and 'type' columns exist in investment_transactions
-- This handles the case where the table was created with a minimal structure.

DO $$
BEGIN
    -- Check for 'ticker'
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investment_transactions'
        AND column_name = 'ticker'
    ) THEN
        ALTER TABLE investment_transactions ADD COLUMN ticker TEXT NOT NULL DEFAULT 'UNKNOWN';
    END IF;

    -- Check for 'type' (Safe measure)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investment_transactions'
        AND column_name = 'type'
    ) THEN
        ALTER TABLE investment_transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'buy';
    END IF;
END $$;

-- Force Schema Cache Reload for Supabase
NOTIFY pgrst, 'reload schema';
