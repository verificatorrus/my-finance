-- Clean up old redundant currency rate data
-- We only need to keep rates to/from USD now
DELETE FROM currency_rates 
WHERE (from_currency != 'USD' AND to_currency != 'USD');

-- Log the cleanup
SELECT 'Cleaned up redundant currency rates. Only USD base pairs remain.' as message;

