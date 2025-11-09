export const ACCOUNT_TYPES = ['CTO', 'PEA', 'AV', 'CRYPTO', 'LIVRETS', 'OTHER'] as const;
export type AccountType = typeof ACCOUNT_TYPES[number];

// ----- Asset classes -----
export const ASSET_CLASSES = ['STOCK', 'ETF', 'CRYPTO', 'BOND', 'REIT', 'CASH'] as const;
export type AssetClass = typeof ASSET_CLASSES[number];

// Human labels (and legacy alias)
export const ASSET_CLASS_LABEL: Record<AssetClass | 'EQUITY', string> = {
  STOCK: 'Stock',
  ETF: 'ETF',
  CRYPTO: 'Crypto',
  BOND: 'Bond',
  REIT: 'REIT',
  CASH: 'Cash',
  // legacy alias so old rows render correctly
  EQUITY: 'Stock',
};

export const PRICING_SOURCES = ['YFINANCE', 'COINGECKO', 'MANUAL'] as const;
export type PricingSource = typeof PRICING_SOURCES[number];
