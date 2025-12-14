-- Add missing columns to categories table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'description') THEN
        ALTER TABLE categories ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'classification') THEN
        ALTER TABLE categories ADD COLUMN classification TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'icon') THEN
        ALTER TABLE categories ADD COLUMN icon TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'color') THEN
        ALTER TABLE categories ADD COLUMN color TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_default') THEN
        ALTER TABLE categories ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
END $$;
