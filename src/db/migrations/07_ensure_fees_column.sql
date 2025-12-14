-- FIX: Ensure 'fees' column exists in investment_transactions
-- This handles the case where the table was created before the 'fees' column was added to the CREATE script.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'investment_transactions'
        AND column_name = 'fees'
    ) THEN
        ALTER TABLE investment_transactions ADD COLUMN fees NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Force Schema Cache Reload for Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';
