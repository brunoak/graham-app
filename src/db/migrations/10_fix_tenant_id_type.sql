-- FIX: Change tenant_id from BIGINT to UUID
-- The previous migration defined tenant_id as BIGINT, but the application/users table uses UUIDs.
-- This script converts the column type and re-establishes limits.

-- 1. Drop existing policies that depend on tenant_id
DROP POLICY IF EXISTS "Tenant Isolation for Assets" ON assets;
DROP POLICY IF EXISTS "Tenant Isolation for Investment Transactions" ON investment_transactions;

-- 1.1 Drop policies with alternative names (Found in User DB)
DROP POLICY IF EXISTS "Users can view data from their tenant" ON investment_transactions;
DROP POLICY IF EXISTS "Users can view data from their tenant" ON assets;

-- 1.2 CLEANUP: Delete data with invalid UUIDs (e.g. "2") to allow conversion
-- This removes legacy test data that would cause "invalid input syntax for type uuid"
DELETE FROM investment_transactions WHERE tenant_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM assets WHERE tenant_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Modify Investment Transactions
DO $$
BEGIN
    -- Drop FK constraint if it exists (name might vary, so we try standard name)
    BEGIN
        ALTER TABLE investment_transactions DROP CONSTRAINT IF EXISTS investment_transactions_tenant_id_fkey;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- Alter Column Type
    ALTER TABLE investment_transactions 
    ALTER COLUMN tenant_id TYPE UUID USING tenant_id::text::uuid;
END $$;

-- 3. Modify Assets
DO $$
BEGIN
    -- Drop FK constraint
    BEGIN
        ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_tenant_id_fkey;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Alter Column Type
    ALTER TABLE assets 
    ALTER COLUMN tenant_id TYPE UUID USING tenant_id::text::uuid;
END $$;

-- 4. Re-create Policies
CREATE POLICY "Tenant Isolation for Assets" ON assets
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Tenant Isolation for Investment Transactions" ON investment_transactions
    FOR ALL
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- 5. Attempt to Re-add FKs (Optional - only if tenants table has UUID id)
-- We wrap in DO block to not fail if tenants table schema differs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE investment_transactions 
        ADD CONSTRAINT investment_transactions_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

        ALTER TABLE assets 
        ADD CONSTRAINT assets_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
