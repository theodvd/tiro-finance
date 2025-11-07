export const ACCOUNT_TYPES = ['CTO', 'PEA', 'AV', 'CRYPTO', 'LIVRETS', 'OTHER'] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];

export const ASSET_CLASSES = ['EQUITY', 'ETF', 'CRYPTO', 'BOND', 'REIT', 'CASH'] as const;
export type AssetClass = typeof ASSET_CLASSES[number];

export const PRICING_SOURCES = ['YFINANCE', 'COINGECKO', 'MANUAL'] as const;
export type PricingSource = typeof PRICING_SOURCES[number];
