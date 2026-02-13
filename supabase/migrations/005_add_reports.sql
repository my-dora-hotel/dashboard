-- Reports table
-- Stores report configurations and parameters
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('account_statement', 'account_summary')),
    title VARCHAR(255) NOT NULL,
    
    -- Report parameters (stored as JSONB)
    parameters JSONB NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all reports
CREATE POLICY "Allow authenticated users to view all reports"
ON reports FOR SELECT
TO authenticated
USING (true);

-- Users can create their own reports
CREATE POLICY "Allow authenticated users to create reports"
ON reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Allow users to update own reports"
ON reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reports
CREATE POLICY "Allow users to delete own reports"
ON reports FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
