-- Ledger drafts table
-- Stores draft (unsaved) ledger entry groups for auto-save functionality
CREATE TABLE IF NOT EXISTS ledger_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE,
    entries JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE ledger_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users full access to ledger_drafts"
ON ledger_drafts FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Auto-update updated_at
CREATE TRIGGER update_ledger_drafts_updated_at
    BEFORE UPDATE ON ledger_drafts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
