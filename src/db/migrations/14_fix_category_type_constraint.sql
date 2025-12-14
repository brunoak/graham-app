-- Remove restrictive CHECK constraint on categories type
-- The UI allows types like 'Investimentos', 'Lazer', etc. which violate the 'income'/'expense' check.

DO $$
BEGIN
    -- Drop the check constraint if it exists. 
    -- We need to find the name of the constraint first, usually 'categories_type_check'.
    -- But it might be auto-generated. We can try to drop it by name if known, OR allow all text.
    
    -- Attempt to specific constraint drop if standard naming
    BEGIN
        ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_type_check;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- If constraint has a diverse name, we can modify the column to remove checks?
    -- No, ALTER COLUMN SET DATA TYPE doesn't remove constraints automatically unless distinct.
    
    -- Let's try to add the new values to the check if we want to keep it?
    -- No, better to remove the restriction to support custom types.
    -- Re-adding the column is drastic.
    
    -- Correct approach: Find and drop constraint dynamically
    DECLARE r RECORD;
    BEGIN
        FOR r IN (
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'categories'::regclass 
            AND contype = 'c' 
            AND pg_get_constraintdef(oid) LIKE '%type%'
        ) LOOP
            EXECUTE 'ALTER TABLE categories DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
    END;
    
END $$;
