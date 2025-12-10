-- FIX & MIGRATE transactions.category_id
-- The goal is to make it TEXT (to match categories.id) and link it.

-- 1. Remove any potential old constraints (safekeeping)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;

-- 2. Convert category_id to TEXT
-- We use USING to cast existing numbers to strings.
ALTER TABLE transactions 
ALTER COLUMN category_id TYPE TEXT 
USING category_id::text;

-- 3. Data Cleanup / Integrity
-- We must ensure all category_ids in transactions actually exist in the 'categories' table.
-- Since the old IDs were numbers (e.g. '1', '2') and our new IDs are 'agua', 'aluguel'...
-- ...the old IDs likely don't match anything.
-- We will update them to 'default' (which we seeded in migration 01) to prevent the FK and UI from breaking.
UPDATE transactions 
SET category_id = 'default' 
WHERE category_id NOT IN (SELECT id FROM categories);

-- Optional: If 'default' doesn't exist for some reason (users skipped mig 01), 
-- you might want to insert it first or set to NULL. 
-- Assuming Migration 01 ran successfully.

-- 4. Add Constraints
ALTER TABLE transactions 
ADD CONSTRAINT transactions_category_id_fkey 
FOREIGN KEY (category_id) 
REFERENCES categories(id)
ON DELETE SET NULL;
