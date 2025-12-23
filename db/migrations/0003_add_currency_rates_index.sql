-- Create unique index for currency rates to ensure no duplicates
CREATE UNIQUE INDEX IF NOT EXISTS currency_rates_pair_idx 
ON currency_rates(from_currency, to_currency);

