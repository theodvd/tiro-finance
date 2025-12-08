// Asset enrichment utility for diversification analysis
// Provides local classification for popular ETFs and intelligent keyword-based detection

export interface AssetMetadata {
  region: string;
  sector: string;
  assetClass: string;
}

// Categories
export const REGIONS = ['Monde', 'USA', 'Europe', 'Asie', 'Émergents', 'Non classifié'] as const;
export const SECTORS = ['Diversifié', 'Technologie', 'Santé', 'Énergie', 'Finance', 'Immobilier', 'Consommation', 'Industrie', 'Matériaux', 'Télécommunications', 'Services publics', 'Non classifié'] as const;
export const ASSET_CLASSES = ['Actions', 'Obligations', 'Matières premières', 'Immobilier', 'Cryptomonnaies', 'Liquidités', 'Non classifié'] as const;

// Database of popular ETFs with their metadata
const ETF_DATABASE: Record<string, AssetMetadata> = {
  // World ETFs
  'VWCE': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'VWCE.PA': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'VWCE.AS': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'VWCE.DE': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'IWDA': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'IWDA.AS': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'IWDA.L': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'SWDA': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'SWDA.L': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'URTH': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'VT': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'ACWI': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'CW8': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'CW8.PA': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'MWRD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  'MWRD.PA': { region: 'Monde', sector: 'Diversifié', assetClass: 'Actions' },
  
  // USA ETFs
  'SPY': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'VOO': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'VTI': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'IVV': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'SPLG': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'ITOT': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'SCHB': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'SP500': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'ESE': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'ESE.PA': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'PE500': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'PE500.PA': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  
  // USA Tech ETFs
  'QQQ': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'QQQM': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'VGT': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'XLK': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'PANX': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'PANX.PA': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'UST': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'UST.PA': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  
  // Europe ETFs
  'EZU': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'VGK': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'IEUR': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'FEZ': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'VEUR': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'VEUR.AS': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'MEUD': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'MEUD.PA': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'SMEA': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'SMEA.PA': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'CAC': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'CAC.PA': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  
  // Emerging Markets ETFs
  'VWO': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'IEMG': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'EEM': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'VFEM': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'VFEM.AS': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'AEEM': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'AEEM.PA': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'PAEEM': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'PAEEM.PA': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  
  // Asia ETFs
  'VPL': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  'AAXJ': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  'EWJ': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  'FXI': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  'MCHI': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  'PASI': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  'PASI.PA': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  
  // Sector ETFs - Technology
  'ARKK': { region: 'Monde', sector: 'Technologie', assetClass: 'Actions' },
  'WCLD': { region: 'Monde', sector: 'Technologie', assetClass: 'Actions' },
  'SKYY': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'BOTZ': { region: 'Monde', sector: 'Technologie', assetClass: 'Actions' },
  'SMH': { region: 'Monde', sector: 'Technologie', assetClass: 'Actions' },
  
  // Sector ETFs - Healthcare
  'XLV': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'VHT': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'IBB': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'XBI': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  
  // Sector ETFs - Energy
  'XLE': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  'VDE': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  'OIH': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  'ICLN': { region: 'Monde', sector: 'Énergie', assetClass: 'Actions' },
  'TAN': { region: 'Monde', sector: 'Énergie', assetClass: 'Actions' },
  
  // Sector ETFs - Finance
  'XLF': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'VFH': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'KBE': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'KRE': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  
  // Sector ETFs - Real Estate
  'VNQ': { region: 'USA', sector: 'Immobilier', assetClass: 'Immobilier' },
  'XLRE': { region: 'USA', sector: 'Immobilier', assetClass: 'Immobilier' },
  'IYR': { region: 'USA', sector: 'Immobilier', assetClass: 'Immobilier' },
  'VNQI': { region: 'Monde', sector: 'Immobilier', assetClass: 'Immobilier' },
  
  // Sector ETFs - Consumer
  'XLY': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'XLP': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'VCR': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  
  // Sector ETFs - Industrial
  'XLI': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  'VIS': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  
  // Bond ETFs
  'AGG': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'BND': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'TLT': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'IEF': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'SHY': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'LQD': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'HYG': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'JNK': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'BNDX': { region: 'Monde', sector: 'Diversifié', assetClass: 'Obligations' },
  'IBTA': { region: 'Europe', sector: 'Diversifié', assetClass: 'Obligations' },
  'IBTA.AS': { region: 'Europe', sector: 'Diversifié', assetClass: 'Obligations' },
  'AGGH': { region: 'Monde', sector: 'Diversifié', assetClass: 'Obligations' },
  'AGGH.AS': { region: 'Monde', sector: 'Diversifié', assetClass: 'Obligations' },
  
  // Commodity ETFs
  'GLD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'IAU': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'SLV': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'USO': { region: 'Monde', sector: 'Énergie', assetClass: 'Matières premières' },
  'DBC': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'SGLD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'SGLD.L': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'PHAU': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'PHAU.PA': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  
  // Crypto
  'BTC': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'ETH': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'GBTC': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'ETHE': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'IBIT': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'FBTC': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
};

// Popular individual stocks with their metadata
const STOCK_DATABASE: Record<string, AssetMetadata> = {
  // US Tech Giants
  'AAPL': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'MSFT': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'GOOGL': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'GOOG': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'AMZN': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'META': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'NVDA': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'TSLA': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'AMD': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'INTC': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'CRM': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'ORCL': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'ADBE': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'NFLX': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'PYPL': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'SQ': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'SHOP': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'UBER': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'ABNB': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'SNAP': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'PLTR': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'COIN': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  
  // US Healthcare
  'JNJ': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'UNH': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'PFE': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'MRK': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'ABBV': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'LLY': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'TMO': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  
  // US Finance
  'JPM': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'BAC': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'WFC': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'GS': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'MS': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'V': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'MA': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'AXP': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'BRK.A': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'BRK.B': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  
  // US Consumer
  'WMT': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'HD': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'KO': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'PEP': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'PG': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'MCD': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'NKE': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'SBUX': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'DIS': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'COST': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  
  // US Energy
  'XOM': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  'CVX': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  'COP': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  'SLB': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  
  // US Industrial
  'BA': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  'CAT': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  'GE': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  'MMM': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  'HON': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  'UPS': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  'FDX': { region: 'USA', sector: 'Industrie', assetClass: 'Actions' },
  
  // European stocks
  'ASML': { region: 'Europe', sector: 'Technologie', assetClass: 'Actions' },
  'ASML.AS': { region: 'Europe', sector: 'Technologie', assetClass: 'Actions' },
  'SAP': { region: 'Europe', sector: 'Technologie', assetClass: 'Actions' },
  'SAP.DE': { region: 'Europe', sector: 'Technologie', assetClass: 'Actions' },
  'LVMH': { region: 'Europe', sector: 'Consommation', assetClass: 'Actions' },
  'MC.PA': { region: 'Europe', sector: 'Consommation', assetClass: 'Actions' },
  'OR.PA': { region: 'Europe', sector: 'Consommation', assetClass: 'Actions' },
  'AIR.PA': { region: 'Europe', sector: 'Industrie', assetClass: 'Actions' },
  'SAN.PA': { region: 'Europe', sector: 'Santé', assetClass: 'Actions' },
  'BNP.PA': { region: 'Europe', sector: 'Finance', assetClass: 'Actions' },
  'SIE.DE': { region: 'Europe', sector: 'Industrie', assetClass: 'Actions' },
  'ALV.DE': { region: 'Europe', sector: 'Finance', assetClass: 'Actions' },
  'NESN.SW': { region: 'Europe', sector: 'Consommation', assetClass: 'Actions' },
  'NOVN.SW': { region: 'Europe', sector: 'Santé', assetClass: 'Actions' },
  'ROG.SW': { region: 'Europe', sector: 'Santé', assetClass: 'Actions' },
  'SHELL': { region: 'Europe', sector: 'Énergie', assetClass: 'Actions' },
  'SHEL.L': { region: 'Europe', sector: 'Énergie', assetClass: 'Actions' },
  'BP': { region: 'Europe', sector: 'Énergie', assetClass: 'Actions' },
  'BP.L': { region: 'Europe', sector: 'Énergie', assetClass: 'Actions' },
  'TTE.PA': { region: 'Europe', sector: 'Énergie', assetClass: 'Actions' },
  
  // Asian stocks
  'TSM': { region: 'Asie', sector: 'Technologie', assetClass: 'Actions' },
  'BABA': { region: 'Asie', sector: 'Technologie', assetClass: 'Actions' },
  'TCEHY': { region: 'Asie', sector: 'Technologie', assetClass: 'Actions' },
  'JD': { region: 'Asie', sector: 'Consommation', assetClass: 'Actions' },
  'BIDU': { region: 'Asie', sector: 'Technologie', assetClass: 'Actions' },
  'NIO': { region: 'Asie', sector: 'Consommation', assetClass: 'Actions' },
  'PDD': { region: 'Asie', sector: 'Consommation', assetClass: 'Actions' },
  'SONY': { region: 'Asie', sector: 'Technologie', assetClass: 'Actions' },
  'TM': { region: 'Asie', sector: 'Consommation', assetClass: 'Actions' },
  
  // Crypto tokens
  'BTC-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'ETH-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'SOL-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'BNB-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'ADA-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'XRP-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'DOT-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'DOGE-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'AVAX-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'MATIC-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'LINK-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'ATOM-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'UNI-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'BITCOIN': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'ETHEREUM': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'SOLANA': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
};

// Keyword patterns for intelligent detection
const REGION_PATTERNS: { keywords: string[]; region: string }[] = [
  { keywords: ['world', 'monde', 'global', 'all-world', 'acwi', 'msci world', 'ftse all'], region: 'Monde' },
  { keywords: ['s&p 500', 'sp500', 's&p500', 'us ', 'usa', 'united states', 'america', 'nasdaq', 'dow jones', 'russell'], region: 'USA' },
  { keywords: ['europe', 'euro', 'stoxx', 'eurostoxx', 'cac', 'dax', 'ftse 100', 'uk ', 'eurozone'], region: 'Europe' },
  { keywords: ['asia', 'pacific', 'japan', 'china', 'hong kong', 'korea', 'taiwan', 'nikkei', 'hang seng', 'topix'], region: 'Asie' },
  { keywords: ['emerging', 'émergent', 'em ', 'bric', 'brazil', 'india', 'south africa', 'mexico', 'developing'], region: 'Émergents' },
];

const SECTOR_PATTERNS: { keywords: string[]; sector: string }[] = [
  { keywords: ['tech', 'technology', 'software', 'cloud', 'ai ', 'artificial', 'cyber', 'digital', 'semiconductor', 'chip'], sector: 'Technologie' },
  { keywords: ['health', 'santé', 'pharma', 'biotech', 'medical', 'healthcare', 'drug', 'therapeut'], sector: 'Santé' },
  { keywords: ['energy', 'énergie', 'oil', 'gas', 'petrol', 'solar', 'wind', 'clean energy', 'renewable'], sector: 'Énergie' },
  { keywords: ['financ', 'bank', 'insurance', 'asset', 'credit', 'capital'], sector: 'Finance' },
  { keywords: ['real estate', 'immobilier', 'reit', 'property', 'housing'], sector: 'Immobilier' },
  { keywords: ['consumer', 'consomm', 'retail', 'luxury', 'food', 'beverage', 'restaurant', 'hotel', 'travel'], sector: 'Consommation' },
  { keywords: ['industr', 'manufactur', 'aerospace', 'defense', 'transport', 'logistics', 'machinery'], sector: 'Industrie' },
  { keywords: ['material', 'mining', 'steel', 'chemical', 'metal'], sector: 'Matériaux' },
  { keywords: ['telecom', 'communication', 'media', '5g'], sector: 'Télécommunications' },
  { keywords: ['utility', 'utilities', 'electric', 'water', 'infrastructure'], sector: 'Services publics' },
];

const ASSET_CLASS_PATTERNS: { keywords: string[]; assetClass: string }[] = [
  { keywords: ['bond', 'obligation', 'treasury', 'fixed income', 'debt', 'sovereign', 'corporate bond', 'aggregate', 'high yield'], assetClass: 'Obligations' },
  { keywords: ['gold', 'or ', 'silver', 'argent', 'platinum', 'commodity', 'commodit', 'oil ', 'metal', 'agriculture'], assetClass: 'Matières premières' },
  { keywords: ['reit', 'real estate', 'immobilier', 'property'], assetClass: 'Immobilier' },
  { keywords: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'blockchain', 'defi'], assetClass: 'Cryptomonnaies' },
  { keywords: ['cash', 'money market', 'liquidity', 'deposit', 'savings', 'livret'], assetClass: 'Liquidités' },
];

/**
 * Normalizes a symbol by removing exchange suffixes and standardizing format
 */
function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().trim();
}

/**
 * Tries to find a match in the database with various symbol formats
 */
function findInDatabase(symbol: string): AssetMetadata | null {
  const normalized = normalizeSymbol(symbol);
  
  // Direct match
  if (ETF_DATABASE[normalized]) return ETF_DATABASE[normalized];
  if (STOCK_DATABASE[normalized]) return STOCK_DATABASE[normalized];
  
  // Try without exchange suffix (e.g., VWCE.PA -> VWCE)
  const baseSymbol = normalized.split('.')[0];
  if (ETF_DATABASE[baseSymbol]) return ETF_DATABASE[baseSymbol];
  if (STOCK_DATABASE[baseSymbol]) return STOCK_DATABASE[baseSymbol];
  
  // Try with common suffixes
  const suffixes = ['.PA', '.AS', '.DE', '.L', '.SW'];
  for (const suffix of suffixes) {
    if (ETF_DATABASE[baseSymbol + suffix]) return ETF_DATABASE[baseSymbol + suffix];
    if (STOCK_DATABASE[baseSymbol + suffix]) return STOCK_DATABASE[baseSymbol + suffix];
  }
  
  return null;
}

/**
 * Analyzes the name/symbol to detect metadata using keyword patterns
 */
function analyzeByKeywords(symbol: string, name: string): AssetMetadata {
  const searchText = `${symbol} ${name}`.toLowerCase();
  
  let region = 'Non classifié';
  let sector = 'Non classifié';
  let assetClass = 'Actions'; // Default to stocks
  
  // Detect region
  for (const pattern of REGION_PATTERNS) {
    if (pattern.keywords.some(kw => searchText.includes(kw))) {
      region = pattern.region;
      break;
    }
  }
  
  // Detect asset class first (affects sector detection)
  for (const pattern of ASSET_CLASS_PATTERNS) {
    if (pattern.keywords.some(kw => searchText.includes(kw))) {
      assetClass = pattern.assetClass;
      break;
    }
  }
  
  // Detect sector
  for (const pattern of SECTOR_PATTERNS) {
    if (pattern.keywords.some(kw => searchText.includes(kw))) {
      sector = pattern.sector;
      break;
    }
  }
  
  // If it's a broad market ETF, set sector to Diversifié
  if (sector === 'Non classifié' && region !== 'Non classifié') {
    sector = 'Diversifié';
  }
  
  return { region, sector, assetClass };
}

/**
 * Main enrichment function - enriches asset metadata
 * Priority: 1. Local database lookup, 2. Keyword analysis, 3. Default values
 */
export function enrichAssetMetadata(symbol: string, name: string): AssetMetadata {
  // 1. Try database lookup first
  const dbMatch = findInDatabase(symbol);
  if (dbMatch) {
    return dbMatch;
  }
  
  // 2. Try keyword-based analysis
  const keywordResult = analyzeByKeywords(symbol, name);
  
  // 3. Return result (may contain "Non classifié" for unknown assets)
  return keywordResult;
}

/**
 * Batch enrichment for multiple assets
 */
export function enrichAssets(assets: Array<{ symbol: string; name: string }>): Map<string, AssetMetadata> {
  const results = new Map<string, AssetMetadata>();
  
  for (const asset of assets) {
    results.set(asset.symbol, enrichAssetMetadata(asset.symbol, asset.name));
  }
  
  return results;
}

/**
 * Check if an asset is properly classified (not "Non classifié")
 */
export function isClassified(metadata: AssetMetadata): boolean {
  return metadata.region !== 'Non classifié' && 
         metadata.sector !== 'Non classifié' && 
         metadata.assetClass !== 'Non classifié';
}
