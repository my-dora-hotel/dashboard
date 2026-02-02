-- Add entry_type to categories: 'debt' (Borç only), 'receivable' (Alacak only), 'both' (Borç & Alacak)
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) NOT NULL DEFAULT 'both'
CHECK (entry_type IN ('debt', 'receivable', 'both'));

COMMENT ON COLUMN categories.entry_type IS 'Ledger entry type allowed: debt (Borç only), receivable (Alacak only), both (Borç & Alacak)';
