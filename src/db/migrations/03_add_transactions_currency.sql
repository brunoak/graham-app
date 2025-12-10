-- Migration: Add currency column to transactions table

ALTER TABLE public.transactions 
ADD COLUMN currency TEXT DEFAULT 'BRL';

-- Optional: Update existing records based on some logic if needed, but default BRL is safe for legacy.
-- If you have specific logic, add it here.
