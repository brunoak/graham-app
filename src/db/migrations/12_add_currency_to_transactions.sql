-- Add currency column to investment_transactions
ALTER TABLE investment_transactions 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL';

-- Update existing transactions to inherit currency from their assets (best effort)
UPDATE investment_transactions it
SET currency = a.currency
FROM assets a
WHERE it.asset_id = a.id
AND it.currency = 'BRL' -- assume default needs update
AND a.currency IS NOT NULL;
