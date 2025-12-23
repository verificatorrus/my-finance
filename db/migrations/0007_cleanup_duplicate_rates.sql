-- Clean up duplicate currency rate records
-- Keep only the latest record for each currency pair

-- Delete all but the most recent record for each pair
DELETE FROM currency_rates
WHERE id NOT IN (
  SELECT MAX(id)
  FROM currency_rates
  GROUP BY from_currency, to_currency
);

-- Verify we have only 3 records
SELECT COUNT(*) as record_count FROM currency_rates;

