-- Advance period for categories: how far in advance (in days) this category applies.
-- Stored as integer days for flexibility (UI can show weeks/months; 1 week = 7 days).
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS advance_period_days INTEGER NULL
CHECK (advance_period_days IS NULL OR advance_period_days >= 0);

COMMENT ON COLUMN categories.advance_period_days IS 'Advance period in days (e.g. 14 for 2 weeks). NULL means not set. Used for scheduling/planning.';
