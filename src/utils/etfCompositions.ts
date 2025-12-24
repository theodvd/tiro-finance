/**
 * ETF Compositions Database
 * Contains geographic and sectoral breakdowns for major ETFs
 * Used for look-through analysis to show true underlying exposure
 */

export interface ETFComposition {
  symbol: string;
  name: string;
  /** Geographic breakdown in percentages (should sum to ~100) */
  geographic: Record<string, number>;
  /** Sectoral breakdown in percentages (should sum to ~100) */
  sectoral: Record<string, number>;
  /** Last known update date */
  lastUpdated: string;
}

// Standard region names for consistency
export const REGIONS = {
  USA: 'USA',
  EUROPE: 'Europe',
  JAPAN: 'Japon',
  UK: 'Royaume-Uni',
  CANADA: 'Canada',
  AUSTRALIA: 'Australie',
  EMERGING: 'Émergents',
  ASIA_PACIFIC: 'Asie-Pacifique',
  CHINA: 'Chine',
  FRANCE: 'France',
  GERMANY: 'Allemagne',
  SWITZERLAND: 'Suisse',
  OTHER: 'Autres',
} as const;

// Standard sector names for consistency
export const SECTORS = {
  TECH: 'Technologie',
  FINANCE: 'Finance',
  HEALTHCARE: 'Santé',
  CONSUMER_DISC: 'Consommation discrétionnaire',
  CONSUMER_STAPLES: 'Consommation courante',
  INDUSTRIALS: 'Industrie',
  ENERGY: 'Énergie',
  MATERIALS: 'Matériaux',
  UTILITIES: 'Services publics',
  REAL_ESTATE: 'Immobilier',
  COMMUNICATION: 'Communication',
  OTHER: 'Autres',
} as const;

/**
 * Database of ETF compositions
 * Data sourced from fund factsheets (approximate values)
 */
export const ETF_COMPOSITIONS: Record<string, ETFComposition> = {
  // === World ETFs ===
  'VWCE': {
    symbol: 'VWCE',
    name: 'Vanguard FTSE All-World UCITS ETF',
    geographic: {
      [REGIONS.USA]: 62,
      [REGIONS.JAPAN]: 6,
      [REGIONS.UK]: 4,
      [REGIONS.CHINA]: 3,
      [REGIONS.FRANCE]: 3,
      [REGIONS.CANADA]: 3,
      [REGIONS.SWITZERLAND]: 2,
      [REGIONS.GERMANY]: 2,
      [REGIONS.AUSTRALIA]: 2,
      [REGIONS.OTHER]: 13,
    },
    sectoral: {
      [SECTORS.TECH]: 25,
      [SECTORS.FINANCE]: 15,
      [SECTORS.HEALTHCARE]: 11,
      [SECTORS.CONSUMER_DISC]: 11,
      [SECTORS.INDUSTRIALS]: 10,
      [SECTORS.COMMUNICATION]: 7,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 5,
      [SECTORS.MATERIALS]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  'IWDA': {
    symbol: 'IWDA',
    name: 'iShares Core MSCI World UCITS ETF',
    geographic: {
      [REGIONS.USA]: 70,
      [REGIONS.JAPAN]: 6,
      [REGIONS.UK]: 4,
      [REGIONS.FRANCE]: 3,
      [REGIONS.CANADA]: 3,
      [REGIONS.SWITZERLAND]: 3,
      [REGIONS.GERMANY]: 2,
      [REGIONS.AUSTRALIA]: 2,
      [REGIONS.OTHER]: 7,
    },
    sectoral: {
      [SECTORS.TECH]: 25,
      [SECTORS.FINANCE]: 15,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.CONSUMER_DISC]: 11,
      [SECTORS.INDUSTRIALS]: 11,
      [SECTORS.COMMUNICATION]: 7,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.MATERIALS]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'SWDA': {
    symbol: 'SWDA',
    name: 'iShares Core MSCI World UCITS ETF (Acc)',
    geographic: {
      [REGIONS.USA]: 70,
      [REGIONS.JAPAN]: 6,
      [REGIONS.UK]: 4,
      [REGIONS.FRANCE]: 3,
      [REGIONS.CANADA]: 3,
      [REGIONS.SWITZERLAND]: 3,
      [REGIONS.GERMANY]: 2,
      [REGIONS.AUSTRALIA]: 2,
      [REGIONS.OTHER]: 7,
    },
    sectoral: {
      [SECTORS.TECH]: 25,
      [SECTORS.FINANCE]: 15,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.CONSUMER_DISC]: 11,
      [SECTORS.INDUSTRIALS]: 11,
      [SECTORS.COMMUNICATION]: 7,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.MATERIALS]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'CW8': {
    symbol: 'CW8',
    name: 'Amundi MSCI World UCITS ETF',
    geographic: {
      [REGIONS.USA]: 70,
      [REGIONS.JAPAN]: 6,
      [REGIONS.UK]: 4,
      [REGIONS.FRANCE]: 3,
      [REGIONS.CANADA]: 3,
      [REGIONS.SWITZERLAND]: 3,
      [REGIONS.GERMANY]: 2,
      [REGIONS.AUSTRALIA]: 2,
      [REGIONS.OTHER]: 7,
    },
    sectoral: {
      [SECTORS.TECH]: 25,
      [SECTORS.FINANCE]: 15,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.CONSUMER_DISC]: 11,
      [SECTORS.INDUSTRIALS]: 11,
      [SECTORS.COMMUNICATION]: 7,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.MATERIALS]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'MWRD': {
    symbol: 'MWRD',
    name: 'Amundi MSCI World II UCITS ETF',
    geographic: {
      [REGIONS.USA]: 70,
      [REGIONS.JAPAN]: 6,
      [REGIONS.UK]: 4,
      [REGIONS.FRANCE]: 3,
      [REGIONS.CANADA]: 3,
      [REGIONS.SWITZERLAND]: 3,
      [REGIONS.GERMANY]: 2,
      [REGIONS.AUSTRALIA]: 2,
      [REGIONS.OTHER]: 7,
    },
    sectoral: {
      [SECTORS.TECH]: 25,
      [SECTORS.FINANCE]: 15,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.CONSUMER_DISC]: 11,
      [SECTORS.INDUSTRIALS]: 11,
      [SECTORS.COMMUNICATION]: 7,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.MATERIALS]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'VT': {
    symbol: 'VT',
    name: 'Vanguard Total World Stock ETF',
    geographic: {
      [REGIONS.USA]: 60,
      [REGIONS.JAPAN]: 6,
      [REGIONS.UK]: 4,
      [REGIONS.CHINA]: 3,
      [REGIONS.CANADA]: 3,
      [REGIONS.FRANCE]: 2,
      [REGIONS.SWITZERLAND]: 2,
      [REGIONS.GERMANY]: 2,
      [REGIONS.EMERGING]: 10,
      [REGIONS.OTHER]: 8,
    },
    sectoral: {
      [SECTORS.TECH]: 24,
      [SECTORS.FINANCE]: 15,
      [SECTORS.HEALTHCARE]: 11,
      [SECTORS.CONSUMER_DISC]: 11,
      [SECTORS.INDUSTRIALS]: 10,
      [SECTORS.COMMUNICATION]: 7,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 5,
      [SECTORS.MATERIALS]: 5,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  // === US ETFs ===
  'SPY': {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 32,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.FINANCE]: 12,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  'VOO': {
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 32,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.FINANCE]: 12,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  'IVV': {
    symbol: 'IVV',
    name: 'iShares Core S&P 500 ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 32,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.FINANCE]: 12,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  'VTI': {
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 30,
      [SECTORS.HEALTHCARE]: 13,
      [SECTORS.FINANCE]: 13,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.INDUSTRIALS]: 10,
      [SECTORS.COMMUNICATION]: 8,
      [SECTORS.CONSUMER_STAPLES]: 5,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'QQQ': {
    symbol: 'QQQ',
    name: 'Invesco QQQ Trust (Nasdaq 100)',
    geographic: {
      [REGIONS.USA]: 98,
      [REGIONS.OTHER]: 2,
    },
    sectoral: {
      [SECTORS.TECH]: 58,
      [SECTORS.COMMUNICATION]: 16,
      [SECTORS.CONSUMER_DISC]: 13,
      [SECTORS.HEALTHCARE]: 6,
      [SECTORS.CONSUMER_STAPLES]: 3,
      [SECTORS.INDUSTRIALS]: 3,
      [SECTORS.UTILITIES]: 1,
    },
    lastUpdated: '2024-12',
  },
  
  'CSPX': {
    symbol: 'CSPX',
    name: 'iShares Core S&P 500 UCITS ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 32,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.FINANCE]: 12,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  'VUAA': {
    symbol: 'VUAA',
    name: 'Vanguard S&P 500 UCITS ETF (Acc)',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 32,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.FINANCE]: 12,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  'SP500': {
    symbol: 'SP500',
    name: 'Generic S&P 500 ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 32,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.FINANCE]: 12,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  // === European ETFs ===
  'VEUR': {
    symbol: 'VEUR',
    name: 'Vanguard FTSE Developed Europe UCITS ETF',
    geographic: {
      [REGIONS.UK]: 24,
      [REGIONS.FRANCE]: 17,
      [REGIONS.SWITZERLAND]: 15,
      [REGIONS.GERMANY]: 14,
      [REGIONS.OTHER]: 30,
    },
    sectoral: {
      [SECTORS.FINANCE]: 18,
      [SECTORS.HEALTHCARE]: 16,
      [SECTORS.INDUSTRIALS]: 15,
      [SECTORS.CONSUMER_STAPLES]: 11,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.MATERIALS]: 7,
      [SECTORS.TECH]: 7,
      [SECTORS.ENERGY]: 6,
      [SECTORS.COMMUNICATION]: 4,
      [SECTORS.UTILITIES]: 4,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'MEUD': {
    symbol: 'MEUD',
    name: 'Amundi MSCI Europe UCITS ETF',
    geographic: {
      [REGIONS.UK]: 23,
      [REGIONS.FRANCE]: 17,
      [REGIONS.SWITZERLAND]: 15,
      [REGIONS.GERMANY]: 13,
      [REGIONS.OTHER]: 32,
    },
    sectoral: {
      [SECTORS.FINANCE]: 18,
      [SECTORS.HEALTHCARE]: 15,
      [SECTORS.INDUSTRIALS]: 14,
      [SECTORS.CONSUMER_STAPLES]: 11,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.MATERIALS]: 7,
      [SECTORS.TECH]: 8,
      [SECTORS.ENERGY]: 6,
      [SECTORS.COMMUNICATION]: 4,
      [SECTORS.UTILITIES]: 5,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'IEUR': {
    symbol: 'IEUR',
    name: 'iShares Core MSCI Europe UCITS ETF',
    geographic: {
      [REGIONS.UK]: 23,
      [REGIONS.FRANCE]: 17,
      [REGIONS.SWITZERLAND]: 15,
      [REGIONS.GERMANY]: 13,
      [REGIONS.OTHER]: 32,
    },
    sectoral: {
      [SECTORS.FINANCE]: 18,
      [SECTORS.HEALTHCARE]: 15,
      [SECTORS.INDUSTRIALS]: 14,
      [SECTORS.CONSUMER_STAPLES]: 11,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.MATERIALS]: 7,
      [SECTORS.TECH]: 8,
      [SECTORS.ENERGY]: 6,
      [SECTORS.COMMUNICATION]: 4,
      [SECTORS.UTILITIES]: 5,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'STOXX': {
    symbol: 'STOXX',
    name: 'Euro Stoxx 50 ETF',
    geographic: {
      [REGIONS.FRANCE]: 35,
      [REGIONS.GERMANY]: 28,
      [REGIONS.OTHER]: 37,
    },
    sectoral: {
      [SECTORS.CONSUMER_DISC]: 17,
      [SECTORS.INDUSTRIALS]: 15,
      [SECTORS.FINANCE]: 14,
      [SECTORS.TECH]: 14,
      [SECTORS.HEALTHCARE]: 8,
      [SECTORS.CONSUMER_STAPLES]: 8,
      [SECTORS.ENERGY]: 7,
      [SECTORS.MATERIALS]: 6,
      [SECTORS.UTILITIES]: 6,
      [SECTORS.COMMUNICATION]: 5,
    },
    lastUpdated: '2024-12',
  },
  
  // === Emerging Markets ETFs ===
  'VFEM': {
    symbol: 'VFEM',
    name: 'Vanguard FTSE Emerging Markets UCITS ETF',
    geographic: {
      [REGIONS.CHINA]: 32,
      [REGIONS.EMERGING]: 68,
    },
    sectoral: {
      [SECTORS.TECH]: 23,
      [SECTORS.FINANCE]: 21,
      [SECTORS.CONSUMER_DISC]: 14,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.MATERIALS]: 8,
      [SECTORS.INDUSTRIALS]: 7,
      [SECTORS.ENERGY]: 6,
      [SECTORS.CONSUMER_STAPLES]: 5,
      [SECTORS.HEALTHCARE]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.REAL_ESTATE]: 1,
    },
    lastUpdated: '2024-12',
  },
  
  'IEMG': {
    symbol: 'IEMG',
    name: 'iShares Core MSCI Emerging Markets ETF',
    geographic: {
      [REGIONS.CHINA]: 28,
      [REGIONS.EMERGING]: 72,
    },
    sectoral: {
      [SECTORS.TECH]: 24,
      [SECTORS.FINANCE]: 21,
      [SECTORS.CONSUMER_DISC]: 13,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.MATERIALS]: 8,
      [SECTORS.INDUSTRIALS]: 6,
      [SECTORS.ENERGY]: 6,
      [SECTORS.CONSUMER_STAPLES]: 5,
      [SECTORS.HEALTHCARE]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 1,
    },
    lastUpdated: '2024-12',
  },
  
  'VWO': {
    symbol: 'VWO',
    name: 'Vanguard FTSE Emerging Markets ETF',
    geographic: {
      [REGIONS.CHINA]: 30,
      [REGIONS.EMERGING]: 70,
    },
    sectoral: {
      [SECTORS.TECH]: 22,
      [SECTORS.FINANCE]: 22,
      [SECTORS.CONSUMER_DISC]: 14,
      [SECTORS.COMMUNICATION]: 8,
      [SECTORS.MATERIALS]: 8,
      [SECTORS.ENERGY]: 7,
      [SECTORS.INDUSTRIALS]: 6,
      [SECTORS.CONSUMER_STAPLES]: 5,
      [SECTORS.HEALTHCARE]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 1,
    },
    lastUpdated: '2024-12',
  },
  
  'PAEEM': {
    symbol: 'PAEEM',
    name: 'Amundi MSCI Emerging Markets UCITS ETF',
    geographic: {
      [REGIONS.CHINA]: 28,
      [REGIONS.EMERGING]: 72,
    },
    sectoral: {
      [SECTORS.TECH]: 23,
      [SECTORS.FINANCE]: 21,
      [SECTORS.CONSUMER_DISC]: 14,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.MATERIALS]: 8,
      [SECTORS.INDUSTRIALS]: 6,
      [SECTORS.ENERGY]: 6,
      [SECTORS.CONSUMER_STAPLES]: 5,
      [SECTORS.HEALTHCARE]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 1,
    },
    lastUpdated: '2024-12',
  },
  
  // === Tech ETFs ===
  'VGT': {
    symbol: 'VGT',
    name: 'Vanguard Information Technology ETF',
    geographic: {
      [REGIONS.USA]: 98,
      [REGIONS.OTHER]: 2,
    },
    sectoral: {
      [SECTORS.TECH]: 100,
    },
    lastUpdated: '2024-12',
  },
  
  'XLK': {
    symbol: 'XLK',
    name: 'Technology Select Sector SPDR Fund',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 100,
    },
    lastUpdated: '2024-12',
  },
  
  // === Bond ETFs ===
  'BND': {
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.FINANCE]: 100,
    },
    lastUpdated: '2024-12',
  },
  
  'AGG': {
    symbol: 'AGG',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.FINANCE]: 100,
    },
    lastUpdated: '2024-12',
  },
  
  // === REIT ETFs ===
  'VNQ': {
    symbol: 'VNQ',
    name: 'Vanguard Real Estate ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.REAL_ESTATE]: 100,
    },
    lastUpdated: '2024-12',
  },
  
  // === Small Cap ETFs ===
  'VB': {
    symbol: 'VB',
    name: 'Vanguard Small-Cap ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.FINANCE]: 16,
      [SECTORS.INDUSTRIALS]: 16,
      [SECTORS.HEALTHCARE]: 13,
      [SECTORS.TECH]: 12,
      [SECTORS.CONSUMER_DISC]: 11,
      [SECTORS.REAL_ESTATE]: 8,
      [SECTORS.MATERIALS]: 6,
      [SECTORS.ENERGY]: 5,
      [SECTORS.CONSUMER_STAPLES]: 4,
      [SECTORS.UTILITIES]: 5,
      [SECTORS.COMMUNICATION]: 4,
    },
    lastUpdated: '2024-12',
  },
  
  'IWM': {
    symbol: 'IWM',
    name: 'iShares Russell 2000 ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.FINANCE]: 17,
      [SECTORS.HEALTHCARE]: 16,
      [SECTORS.INDUSTRIALS]: 15,
      [SECTORS.TECH]: 13,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.REAL_ESTATE]: 7,
      [SECTORS.ENERGY]: 6,
      [SECTORS.MATERIALS]: 5,
      [SECTORS.CONSUMER_STAPLES]: 4,
      [SECTORS.UTILITIES]: 4,
      [SECTORS.COMMUNICATION]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  // === Amundi PEA S&P 500 ===
  '500': {
    symbol: '500',
    name: 'Amundi PEA S&P 500 UCITS ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 32,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.FINANCE]: 12,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  'PSP5': {
    symbol: 'PSP5',
    name: 'Amundi PEA S&P 500 ESG UCITS ETF',
    geographic: {
      [REGIONS.USA]: 100,
    },
    sectoral: {
      [SECTORS.TECH]: 32,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.FINANCE]: 12,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.COMMUNICATION]: 9,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.UTILITIES]: 2,
      [SECTORS.MATERIALS]: 2,
      [SECTORS.REAL_ESTATE]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  // === Amundi PEA Nasdaq-100 ===
  'PUST': {
    symbol: 'PUST',
    name: 'Amundi PEA Nasdaq-100 UCITS ETF',
    geographic: {
      [REGIONS.USA]: 98,
      [REGIONS.OTHER]: 2,
    },
    sectoral: {
      [SECTORS.TECH]: 58,
      [SECTORS.COMMUNICATION]: 16,
      [SECTORS.CONSUMER_DISC]: 13,
      [SECTORS.HEALTHCARE]: 6,
      [SECTORS.CONSUMER_STAPLES]: 3,
      [SECTORS.INDUSTRIALS]: 3,
      [SECTORS.UTILITIES]: 1,
    },
    lastUpdated: '2024-12',
  },
  
  // === Amundi PEA MSCI World ===
  'WPEA': {
    symbol: 'WPEA',
    name: 'Amundi PEA MSCI World UCITS ETF',
    geographic: {
      [REGIONS.USA]: 70,
      [REGIONS.JAPAN]: 6,
      [REGIONS.UK]: 4,
      [REGIONS.FRANCE]: 3,
      [REGIONS.CANADA]: 3,
      [REGIONS.SWITZERLAND]: 3,
      [REGIONS.GERMANY]: 2,
      [REGIONS.AUSTRALIA]: 2,
      [REGIONS.OTHER]: 7,
    },
    sectoral: {
      [SECTORS.TECH]: 25,
      [SECTORS.FINANCE]: 15,
      [SECTORS.HEALTHCARE]: 12,
      [SECTORS.CONSUMER_DISC]: 11,
      [SECTORS.INDUSTRIALS]: 11,
      [SECTORS.COMMUNICATION]: 7,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.ENERGY]: 4,
      [SECTORS.MATERIALS]: 4,
      [SECTORS.UTILITIES]: 3,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  // === Amundi MSCI Emerging Markets ===
  'AEEM': {
    symbol: 'AEEM',
    name: 'Amundi MSCI Emerging Markets UCITS ETF',
    geographic: {
      [REGIONS.CHINA]: 28,
      [REGIONS.EMERGING]: 20,
      [REGIONS.OTHER]: 52, // Taiwan, India, Korea, Brazil, etc.
    },
    sectoral: {
      [SECTORS.TECH]: 22,
      [SECTORS.FINANCE]: 21,
      [SECTORS.CONSUMER_DISC]: 13,
      [SECTORS.COMMUNICATION]: 10,
      [SECTORS.MATERIALS]: 8,
      [SECTORS.INDUSTRIALS]: 7,
      [SECTORS.ENERGY]: 6,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.HEALTHCARE]: 4,
      [SECTORS.UTILITIES]: 3,
    },
    lastUpdated: '2024-12',
  },
  
  // === Amundi MSCI EM Asia ===
  'AASI': {
    symbol: 'AASI',
    name: 'Amundi MSCI Emerging Markets Asia UCITS ETF',
    geographic: {
      [REGIONS.CHINA]: 35,
      [REGIONS.ASIA_PACIFIC]: 40, // Taiwan, India, Korea
      [REGIONS.OTHER]: 25,
    },
    sectoral: {
      [SECTORS.TECH]: 28,
      [SECTORS.FINANCE]: 18,
      [SECTORS.CONSUMER_DISC]: 14,
      [SECTORS.COMMUNICATION]: 10,
      [SECTORS.MATERIALS]: 6,
      [SECTORS.INDUSTRIALS]: 8,
      [SECTORS.ENERGY]: 4,
      [SECTORS.CONSUMER_STAPLES]: 5,
      [SECTORS.HEALTHCARE]: 5,
      [SECTORS.UTILITIES]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  // === Stoxx Europe 600 ===
  'C6E': {
    symbol: 'C6E',
    name: 'Amundi Stoxx Europe 600 UCITS ETF',
    geographic: {
      [REGIONS.UK]: 23,
      [REGIONS.FRANCE]: 17,
      [REGIONS.SWITZERLAND]: 15,
      [REGIONS.GERMANY]: 13,
      [REGIONS.OTHER]: 32,
    },
    sectoral: {
      [SECTORS.FINANCE]: 18,
      [SECTORS.HEALTHCARE]: 15,
      [SECTORS.INDUSTRIALS]: 14,
      [SECTORS.CONSUMER_STAPLES]: 11,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.MATERIALS]: 7,
      [SECTORS.TECH]: 8,
      [SECTORS.ENERGY]: 6,
      [SECTORS.COMMUNICATION]: 4,
      [SECTORS.UTILITIES]: 5,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  'ETSZ': {
    symbol: 'ETSZ',
    name: 'Stoxx Europe 600 UCITS ETF',
    geographic: {
      [REGIONS.UK]: 23,
      [REGIONS.FRANCE]: 17,
      [REGIONS.SWITZERLAND]: 15,
      [REGIONS.GERMANY]: 13,
      [REGIONS.OTHER]: 32,
    },
    sectoral: {
      [SECTORS.FINANCE]: 18,
      [SECTORS.HEALTHCARE]: 15,
      [SECTORS.INDUSTRIALS]: 14,
      [SECTORS.CONSUMER_STAPLES]: 11,
      [SECTORS.CONSUMER_DISC]: 10,
      [SECTORS.MATERIALS]: 7,
      [SECTORS.TECH]: 8,
      [SECTORS.ENERGY]: 6,
      [SECTORS.COMMUNICATION]: 4,
      [SECTORS.UTILITIES]: 5,
      [SECTORS.REAL_ESTATE]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  // === Amundi Europe Small Cap ===
  'CEM': {
    symbol: 'CEM',
    name: 'Amundi MSCI Europe Small Cap UCITS ETF',
    geographic: {
      [REGIONS.UK]: 22,
      [REGIONS.GERMANY]: 13,
      [REGIONS.FRANCE]: 10,
      [REGIONS.SWITZERLAND]: 8,
      [REGIONS.OTHER]: 47,
    },
    sectoral: {
      [SECTORS.INDUSTRIALS]: 23,
      [SECTORS.FINANCE]: 14,
      [SECTORS.CONSUMER_DISC]: 12,
      [SECTORS.TECH]: 11,
      [SECTORS.REAL_ESTATE]: 9,
      [SECTORS.MATERIALS]: 8,
      [SECTORS.HEALTHCARE]: 7,
      [SECTORS.CONSUMER_STAPLES]: 6,
      [SECTORS.COMMUNICATION]: 4,
      [SECTORS.UTILITIES]: 4,
      [SECTORS.ENERGY]: 2,
    },
    lastUpdated: '2024-12',
  },
  
  // === Amundi Digital Economy / E-commerce ===
  'EBUY': {
    symbol: 'EBUY',
    name: 'Amundi MSCI Digital Economy ESG Screened UCITS ETF',
    geographic: {
      [REGIONS.USA]: 65,
      [REGIONS.CHINA]: 15,
      [REGIONS.OTHER]: 20,
    },
    sectoral: {
      [SECTORS.TECH]: 45,
      [SECTORS.CONSUMER_DISC]: 35,
      [SECTORS.COMMUNICATION]: 15,
      [SECTORS.OTHER]: 5,
    },
    lastUpdated: '2024-12',
  },
  
  // === MSCI Europe Information Technology ===
  'ESIT': {
    symbol: 'ESIT',
    name: 'iShares MSCI Europe Information Technology Sector UCITS ETF',
    geographic: {
      [REGIONS.GERMANY]: 28,
      [REGIONS.FRANCE]: 22,
      [REGIONS.UK]: 15,
      [REGIONS.SWITZERLAND]: 12,
      [REGIONS.OTHER]: 23,
    },
    sectoral: {
      [SECTORS.TECH]: 100,
    },
    lastUpdated: '2024-12',
  },
  
  // === Amundi Robotics & AI ===
  'GOAI': {
    symbol: 'GOAI',
    name: 'Amundi STOXX Global Artificial Intelligence UCITS ETF',
    geographic: {
      [REGIONS.USA]: 70,
      [REGIONS.JAPAN]: 10,
      [REGIONS.OTHER]: 20,
    },
    sectoral: {
      [SECTORS.TECH]: 65,
      [SECTORS.INDUSTRIALS]: 15,
      [SECTORS.COMMUNICATION]: 10,
      [SECTORS.HEALTHCARE]: 5,
      [SECTORS.OTHER]: 5,
    },
    lastUpdated: '2024-12',
  },
};

/**
 * Alias mappings for equivalent ETFs
 * Maps common ticker variations to their canonical symbol
 */
const ETF_ALIASES: Record<string, string> = {
  // Amundi PEA equivalents
  'PE500': 'SPY',
  'P500': '500',
  'ANX': 'PUST',
  'PANX': 'PUST',
  'PAASI': 'AASI',
  'PAEEM': 'AEEM',
  'CLEM': 'AEEM',
  'PCEU': 'C6E',
  'EUSRI': 'C6E',
  // World ETF equivalents
  'EWLD': 'IWDA',
  'URTH': 'IWDA',
  'ACWI': 'VWCE',
  // S&P 500 equivalents
  'SPX': 'SPY',
  'SXR8': 'CSPX',
};

/**
 * Get ETF composition by symbol
 * Tries multiple symbol variations (with/without exchange suffix)
 */
export function getETFComposition(symbol: string): ETFComposition | null {
  const cleanSymbol = symbol.toUpperCase().split('.')[0]; // Remove exchange suffix
  
  // Direct match
  if (ETF_COMPOSITIONS[cleanSymbol]) {
    return ETF_COMPOSITIONS[cleanSymbol];
  }
  
  // Check aliases
  if (ETF_ALIASES[cleanSymbol] && ETF_COMPOSITIONS[ETF_ALIASES[cleanSymbol]]) {
    return ETF_COMPOSITIONS[ETF_ALIASES[cleanSymbol]];
  }
  
  // Try common variations
  const variations = [
    cleanSymbol,
    cleanSymbol.replace('-', ''),
    cleanSymbol + '.PA', // Paris
    cleanSymbol + '.L',  // London
    cleanSymbol + '.DE', // Germany
  ];
  
  for (const variant of variations) {
    const base = variant.split('.')[0];
    if (ETF_COMPOSITIONS[base]) {
      return ETF_COMPOSITIONS[base];
    }
    // Also check aliases for each variation
    if (ETF_ALIASES[base] && ETF_COMPOSITIONS[ETF_ALIASES[base]]) {
      return ETF_COMPOSITIONS[ETF_ALIASES[base]];
    }
  }
  
  return null;
}

/**
 * Check if a security is an ETF with composition data
 */
export function hasETFComposition(symbol: string): boolean {
  return getETFComposition(symbol) !== null;
}

/**
 * Get all available ETF symbols
 */
export function getAvailableETFSymbols(): string[] {
  return Object.keys(ETF_COMPOSITIONS);
}
