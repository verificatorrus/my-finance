-- Final optimization: remove reverse rates and USD-to-USD
-- We only need to store: BTC->USD, EUR->USD, KZT->USD (3 records)
-- All other rates are calculated on the fly

DELETE FROM currency_rates 
WHERE from_currency = 'USD' OR to_currency != 'USD';

-- Log the optimization
SELECT 'Optimized currency rates. Only 3 base rates remain (BTC->USD, EUR->USD, KZT->USD).' as message;

