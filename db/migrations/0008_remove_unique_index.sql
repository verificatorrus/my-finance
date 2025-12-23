-- Remove unique index to allow storing historical currency rates
-- We now want to keep all rate changes over time
DROP INDEX IF EXISTS currency_rates_pair_idx;

-- Create a regular index on updated_at for faster historical queries
CREATE INDEX IF NOT EXISTS currency_rates_updated_at_idx ON currency_rates(updated_at DESC);

-- Create composite index for efficient latest rate queries
CREATE INDEX IF NOT EXISTS currency_rates_pair_time_idx ON currency_rates(from_currency, to_currency, updated_at DESC);

SELECT 'Removed unique constraint and added indexes for historical tracking' as message;

