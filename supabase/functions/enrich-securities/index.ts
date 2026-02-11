import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityMetadata {
  symbol: string;
  region: string;
  sector: string;
  assetClass: string;
  source: 'local' | 'yahoo' | 'openfigi' | 'keyword' | 'default';
}

// ========== FETCH WITH RETRY ==========
async function fetchWithRetry(url: string, maxRetries = 3, options?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          ...(options?.headers || {}),
        },
      });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        console.warn(`[Enrich] Attempt ${attempt + 1} failed for ${url}: ${res.status}`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return res; // 4xx other than 429 = don't retry
    } catch (err) {
      console.warn(`[Enrich] Attempt ${attempt + 1} network error for ${url}:`, err);
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} retries: ${url}`);
}

// ========== LOCAL DATABASE (Embedded copy from assetEnrichment.ts) ==========
const ETF_DATABASE: Record<string, { region: string; sector: string; assetClass: string }> = {
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
  'ESE': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'ESE.PA': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'PE500': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  'PE500.PA': { region: 'USA', sector: 'Diversifié', assetClass: 'Actions' },
  
  // USA Tech ETFs
  'QQQ': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'PANX': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'PANX.PA': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'UST': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'UST.PA': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  
  // Europe ETFs
  'VEUR': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'VEUR.AS': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'MEUD': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'MEUD.PA': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'CAC': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  'CAC.PA': { region: 'Europe', sector: 'Diversifié', assetClass: 'Actions' },
  
  // Emerging Markets
  'VFEM': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'VFEM.AS': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'AEEM': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'AEEM.PA': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'PAEEM': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  'PAEEM.PA': { region: 'Émergents', sector: 'Diversifié', assetClass: 'Actions' },
  
  // Asia ETFs
  'PASI': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  'PASI.PA': { region: 'Asie', sector: 'Diversifié', assetClass: 'Actions' },
  
  // Bond ETFs
  'AGG': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'BND': { region: 'USA', sector: 'Diversifié', assetClass: 'Obligations' },
  'AGGH': { region: 'Monde', sector: 'Diversifié', assetClass: 'Obligations' },
  'AGGH.AS': { region: 'Monde', sector: 'Diversifié', assetClass: 'Obligations' },
  
  // Commodity ETFs
  'GLD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'SGLD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'SGLD.L': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'PHAU': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
  'PHAU.PA': { region: 'Monde', sector: 'Diversifié', assetClass: 'Matières premières' },
};

const STOCK_DATABASE: Record<string, { region: string; sector: string; assetClass: string }> = {
  // US Tech
  'AAPL': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'MSFT': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'GOOGL': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'GOOG': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'AMZN': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'META': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'NVDA': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  'TSLA': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'AMD': { region: 'USA', sector: 'Technologie', assetClass: 'Actions' },
  
  // US Finance
  'JPM': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'V': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  'MA': { region: 'USA', sector: 'Finance', assetClass: 'Actions' },
  
  // US Healthcare
  'JNJ': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'UNH': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'PFE': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  'LLY': { region: 'USA', sector: 'Santé', assetClass: 'Actions' },
  
  // US Consumer
  'WMT': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'KO': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'PG': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  'DIS': { region: 'USA', sector: 'Consommation', assetClass: 'Actions' },
  
  // US Energy
  'XOM': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  'CVX': { region: 'USA', sector: 'Énergie', assetClass: 'Actions' },
  
  // European stocks
  'ASML': { region: 'Europe', sector: 'Technologie', assetClass: 'Actions' },
  'ASML.AS': { region: 'Europe', sector: 'Technologie', assetClass: 'Actions' },
  'MC.PA': { region: 'Europe', sector: 'Consommation', assetClass: 'Actions' },
  'OR.PA': { region: 'Europe', sector: 'Consommation', assetClass: 'Actions' },
  'AIR.PA': { region: 'Europe', sector: 'Industrie', assetClass: 'Actions' },
  'SAN.PA': { region: 'Europe', sector: 'Santé', assetClass: 'Actions' },
  'BNP.PA': { region: 'Europe', sector: 'Finance', assetClass: 'Actions' },
  'TTE.PA': { region: 'Europe', sector: 'Énergie', assetClass: 'Actions' },
  
  // Asian stocks
  'TSM': { region: 'Asie', sector: 'Technologie', assetClass: 'Actions' },
  'BABA': { region: 'Asie', sector: 'Technologie', assetClass: 'Actions' },
  
  // Crypto
  'BTC-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'ETH-USD': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'BTC': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
  'ETH': { region: 'Monde', sector: 'Diversifié', assetClass: 'Cryptomonnaies' },
};

// ========== KEYWORD PATTERNS ==========
const REGION_PATTERNS = [
  { keywords: ['world', 'monde', 'global', 'all-world', 'acwi', 'msci world', 'ftse all'], region: 'Monde' },
  { keywords: ['s&p 500', 'sp500', 's&p500', 'us ', 'usa', 'united states', 'america', 'nasdaq', 'dow jones', 'russell'], region: 'USA' },
  { keywords: ['europe', 'euro', 'stoxx', 'eurostoxx', 'cac', 'dax', 'ftse 100', 'uk ', 'eurozone'], region: 'Europe' },
  { keywords: ['asia', 'pacific', 'japan', 'china', 'hong kong', 'korea', 'taiwan', 'nikkei', 'hang seng', 'topix'], region: 'Asie' },
  { keywords: ['emerging', 'émergent', 'em ', 'bric', 'brazil', 'india', 'south africa', 'mexico', 'developing'], region: 'Émergents' },
];

const SECTOR_PATTERNS = [
  { keywords: ['tech', 'technology', 'software', 'cloud', 'ai ', 'artificial', 'cyber', 'digital', 'semiconductor', 'chip'], sector: 'Technologie' },
  { keywords: ['health', 'santé', 'pharma', 'biotech', 'medical', 'healthcare', 'drug', 'therapeut'], sector: 'Santé' },
  { keywords: ['energy', 'énergie', 'oil', 'gas', 'petrol', 'solar', 'wind', 'clean energy', 'renewable'], sector: 'Énergie' },
  { keywords: ['financ', 'bank', 'insurance', 'asset', 'credit', 'capital'], sector: 'Finance' },
  { keywords: ['real estate', 'immobilier', 'reit', 'property', 'housing'], sector: 'Immobilier' },
  { keywords: ['consumer', 'consomm', 'retail', 'luxury', 'food', 'beverage', 'restaurant', 'hotel', 'travel'], sector: 'Consommation' },
  { keywords: ['industr', 'manufactur', 'aerospace', 'defense', 'transport', 'logistics', 'machinery'], sector: 'Industrie' },
];

// ========== YAHOO FINANCE MAPPINGS ==========
const YAHOO_TYPE_MAPPING: Record<string, string> = {
  'ETF': 'ETF',
  'EQUITY': 'Actions',
  'CRYPTOCURRENCY': 'Cryptomonnaies',
  'MUTUALFUND': 'Fonds',
  'INDEX': 'Indice',
};

const YAHOO_REGION_MAPPING: Record<string, string> = {
  'United States': 'Amérique du Nord',
  'Canada': 'Amérique du Nord',
  'France': 'Europe',
  'Germany': 'Europe',
  'United Kingdom': 'Europe',
  'Netherlands': 'Europe',
  'Switzerland': 'Europe',
  'Ireland': 'Europe',
  'Luxembourg': 'Europe',
  'Japan': 'Asie-Pacifique',
  'China': 'Asie-Pacifique',
  'South Korea': 'Asie-Pacifique',
  'Australia': 'Asie-Pacifique',
  'Taiwan': 'Asie-Pacifique',
  'India': 'Asie-Pacifique',
  'Brazil': 'Amérique Latine',
};

// ========== HELPER FUNCTIONS ==========
function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().trim();
}

function findInLocalDatabase(symbol: string): { region: string; sector: string; assetClass: string } | null {
  const normalized = normalizeSymbol(symbol);
  
  if (ETF_DATABASE[normalized]) return ETF_DATABASE[normalized];
  if (STOCK_DATABASE[normalized]) return STOCK_DATABASE[normalized];
  
  const baseSymbol = normalized.split('.')[0];
  if (ETF_DATABASE[baseSymbol]) return ETF_DATABASE[baseSymbol];
  if (STOCK_DATABASE[baseSymbol]) return STOCK_DATABASE[baseSymbol];
  
  const suffixes = ['.PA', '.AS', '.DE', '.L', '.SW'];
  for (const suffix of suffixes) {
    if (ETF_DATABASE[baseSymbol + suffix]) return ETF_DATABASE[baseSymbol + suffix];
    if (STOCK_DATABASE[baseSymbol + suffix]) return STOCK_DATABASE[baseSymbol + suffix];
  }
  
  return null;
}

function analyzeByKeywords(symbol: string, name: string): { region: string; sector: string; assetClass: string } {
  const searchText = `${symbol} ${name}`.toLowerCase();
  
  let region = 'Non classifié';
  let sector = 'Non classifié';
  let assetClass = 'Actions';
  
  for (const pattern of REGION_PATTERNS) {
    if (pattern.keywords.some(kw => searchText.includes(kw))) {
      region = pattern.region;
      break;
    }
  }
  
  for (const pattern of SECTOR_PATTERNS) {
    if (pattern.keywords.some(kw => searchText.includes(kw))) {
      sector = pattern.sector;
      break;
    }
  }
  
  if (sector === 'Non classifié' && region !== 'Non classifié') {
    sector = 'Diversifié';
  }
  
  if (searchText.includes('crypto') || searchText.includes('bitcoin') || searchText.includes('btc') || searchText.includes('eth')) {
    assetClass = 'Cryptomonnaies';
    region = 'Monde';
    sector = 'Diversifié';
  }
  
  return { region, sector, assetClass };
}

// ========== LEVEL 2: YAHOO FINANCE ENRICHMENT ==========
async function enrichFromYahoo(symbol: string): Promise<{ region: string; sector: string | null; assetClass: string } | null> {
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=assetProfile,quoteType`;
    const res = await fetchWithRetry(yahooUrl, 2);
    
    if (!res.ok) {
      console.warn(`[Enrich] Yahoo returned ${res.status} for ${symbol}`);
      return null;
    }
    
    const data = await res.json();
    const profile = data?.quoteSummary?.result?.[0]?.assetProfile;
    const quoteType = data?.quoteSummary?.result?.[0]?.quoteType;
    
    if (!profile && !quoteType) {
      console.warn(`[Enrich] Yahoo returned no data for ${symbol}`);
      return null;
    }
    
    const assetClass = YAHOO_TYPE_MAPPING[quoteType?.quoteType] || 'Autre';
    const sector = profile?.sector || null;
    const country = profile?.country;
    const region = YAHOO_REGION_MAPPING[country] || country || null;
    
    // Consider it sufficient if we got at least an asset_class
    if (assetClass !== 'Autre' || sector) {
      return { region: region || 'Non classifié', sector, assetClass };
    }
    
    return null;
  } catch (err) {
    console.warn(`[Enrich] Yahoo error for ${symbol}:`, err);
    return null;
  }
}

// ========== LEVEL 3: OPENFIGI ENRICHMENT ==========
const FIGI_SECTOR_MAPPING: Record<string, string> = {
  'Equity': 'Actions',
  'Govt': 'Obligations',
  'Corp': 'Obligations',
  'Mtge': 'Obligations',
  'Curncy': 'Devises',
  'Comdty': 'Matières premières',
  'Index': 'Indice',
  'Pfd': 'Actions',
};

async function enrichFromOpenFIGI(symbol: string): Promise<{ region: string | null; sector: string | null; assetClass: string } | null> {
  try {
    const figiRes = await fetchWithRetry('https://api.openfigi.com/v3/mapping', 2, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ idType: 'TICKER', idValue: symbol }]),
    });
    
    if (!figiRes.ok) {
      console.warn(`[Enrich] OpenFIGI returned ${figiRes.status} for ${symbol}`);
      return null;
    }
    
    const figiData = await figiRes.json();
    const results = figiData?.[0]?.data;
    
    if (!results || results.length === 0) {
      console.warn(`[Enrich] OpenFIGI returned no data for ${symbol}`);
      return null;
    }
    
    const first = results[0];
    const marketSector = first.marketSector;
    const securityType = first.securityType;
    
    const assetClass = FIGI_SECTOR_MAPPING[marketSector] || 'Autre';
    
    // Try to infer region from exchange
    let region: string | null = null;
    const exchCode = first.exchCode;
    if (exchCode) {
      const usExchanges = ['US', 'UN', 'UW', 'UA', 'UQ', 'UR'];
      const euExchanges = ['FP', 'GY', 'LN', 'NA', 'SW', 'ID', 'IM', 'SM', 'BB'];
      const asiaExchanges = ['JT', 'HK', 'KS', 'TT', 'AU', 'SP'];
      
      if (usExchanges.includes(exchCode)) region = 'Amérique du Nord';
      else if (euExchanges.includes(exchCode)) region = 'Europe';
      else if (asiaExchanges.includes(exchCode)) region = 'Asie-Pacifique';
    }
    
    if (assetClass !== 'Autre' || region) {
      return { region, sector: securityType || null, assetClass };
    }
    
    return null;
  } catch (err) {
    console.warn(`[Enrich] OpenFIGI error for ${symbol}:`, err);
    return null;
  }
}

// ========== MAIN ENRICHMENT PIPELINE ==========
async function enrichSecurity(symbol: string, name: string): Promise<SecurityMetadata> {
  // Level 1: Local database
  const localMatch = findInLocalDatabase(symbol);
  if (localMatch) {
    console.log(`[Enrich] ${symbol}: enriched via local`);
    return { symbol, ...localMatch, source: 'local' };
  }

  // Level 2: Yahoo Finance quoteSummary
  const yahooResult = await enrichFromYahoo(symbol);
  if (yahooResult) {
    console.log(`[Enrich] ${symbol}: enriched via yahoo`);
    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
    return {
      symbol,
      region: yahooResult.region,
      sector: yahooResult.sector || 'Non classifié',
      assetClass: yahooResult.assetClass,
      source: 'yahoo',
    };
  }
  // Rate limiting after Yahoo attempt even if failed
  await new Promise(r => setTimeout(r, 500));

  // Level 3: OpenFIGI
  const figiResult = await enrichFromOpenFIGI(symbol);
  if (figiResult) {
    console.log(`[Enrich] ${symbol}: enriched via openfigi`);
    await new Promise(r => setTimeout(r, 500));
    return {
      symbol,
      region: figiResult.region || 'Non classifié',
      sector: figiResult.sector || 'Non classifié',
      assetClass: figiResult.assetClass,
      source: 'openfigi',
    };
  }
  await new Promise(r => setTimeout(r, 500));

  // Level 4: Keyword matching
  const keywordResult = analyzeByKeywords(symbol, name);
  if (keywordResult.region !== 'Non classifié' || keywordResult.sector !== 'Non classifié') {
    console.log(`[Enrich] ${symbol}: enriched via keyword`);
    return { symbol, ...keywordResult, source: 'keyword' };
  }

  // Level 5: Default
  console.log(`[Enrich] ${symbol}: enriched via default`);
  return {
    symbol,
    region: 'Non classifié',
    sector: 'Non classifié',
    assetClass: 'Actions',
    source: 'default',
  };
}

// ========== MAIN HANDLER ==========
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[Enrich] Starting enrichment for user ${user.id}`);

    const { data: securities, error: fetchError } = await supabase
      .from('securities')
      .select('id, symbol, name, sector, region, asset_class')
      .eq('user_id', user.id);

    if (fetchError) {
      throw fetchError;
    }

    if (!securities || securities.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucun titre à enrichir',
          updated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Enrich] Found ${securities.length} securities to process`);

    const results: Array<{ symbol: string; success: boolean; source: string; region?: string; sector?: string }> = [];
    let updated = 0;
    let skipped = 0;

    for (const security of securities) {
      console.log(`[Enrich] Processing ${security.symbol}...`);
      
      const metadata = await enrichSecurity(security.symbol, security.name || '');
      
      console.log(`[Enrich] ${security.symbol} -> region: ${metadata.region}, sector: ${metadata.sector}, source: ${metadata.source}`);
      
      if (metadata.source !== 'default') {
        const { error: updateError } = await supabase
          .from('securities')
          .update({
            region: metadata.region,
            sector: metadata.sector,
            updated_at: new Date().toISOString(),
          })
          .eq('id', security.id);

        if (updateError) {
          console.error(`[Enrich] Error updating ${security.symbol}:`, updateError);
          results.push({ symbol: security.symbol, success: false, source: metadata.source });
        } else {
          console.log(`[Enrich] Successfully updated ${security.symbol}`);
          results.push({ symbol: security.symbol, success: true, source: metadata.source, region: metadata.region, sector: metadata.sector });
          updated++;
        }
      } else {
        console.log(`[Enrich] ${security.symbol}: no good classification found, marking as unclassified`);
        
        const { error: updateError } = await supabase
          .from('securities')
          .update({
            region: 'Non classifié',
            sector: 'Non classifié',
            updated_at: new Date().toISOString(),
          })
          .eq('id', security.id);

        if (!updateError) {
          results.push({ symbol: security.symbol, success: true, source: 'default', region: 'Non classifié', sector: 'Non classifié' });
        }
        skipped++;
      }
    }

    console.log(`[Enrich] Complete: ${updated} enriched, ${skipped} unclassified`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${updated} titres enrichis, ${skipped} non classifiés`,
        updated,
        skipped,
        total: securities.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Enrich] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
