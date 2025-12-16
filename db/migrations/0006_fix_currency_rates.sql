-- Fix incorrect currency rates data
-- Delete all existing rates and let the cron job repopulate with correct values
DELETE FROM currency_rates;

-- Log the fix
SELECT 'Cleared all currency rates. Cron job will repopulate with correct values.' as message;

