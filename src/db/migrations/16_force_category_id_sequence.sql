-- Force Categories ID to use a Sequence (Brute Force Fix)
-- Since the Identity migration failed, we will manually attach a sequence to the ID column.

DO $$
BEGIN
    -- 1. Remove any broken Identity property if it exists
    BEGIN
        ALTER TABLE categories ALTER COLUMN id DROP IDENTITY IF EXISTS;
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore if feature not supported or other minor issue
    END;

    -- 2. Create a specific sequence for categories if it doesn't exist
    CREATE SEQUENCE IF NOT EXISTS categories_id_seq_manual;

    -- 3. Force the ID column to use this sequence by default
    -- This ensures that when we insert without an ID, Postgres picks the next number.
    ALTER TABLE categories ALTER COLUMN id SET DEFAULT nextval('categories_id_seq_manual');

    -- 4. Sync the sequence to the current highest ID (plus 1)
    -- This prevents "duplicate key" errors on the first insert.
    PERFORM setval('categories_id_seq_manual', (SELECT COALESCE(MAX(id), 0) + 1 FROM categories));

END $$;
