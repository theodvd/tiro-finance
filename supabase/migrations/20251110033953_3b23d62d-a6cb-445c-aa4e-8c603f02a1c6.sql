-- Switch BTC/ETH/SOL to CoinGecko, price in EUR
UPDATE securities
SET pricing_source = 'COINGECKO',
    asset_class    = 'CRYPTO',
    currency_quote = 'EUR'
WHERE symbol IN ('BTC','ETH','SOL');

-- Clear stale market_data so the next refresh re-writes cleanly
DELETE FROM market_data
WHERE security_id IN (
  SELECT id FROM securities WHERE symbol IN ('BTC','ETH','SOL')
);