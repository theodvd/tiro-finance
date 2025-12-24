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
  source: 'local' | 'api' | 'fallback';
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

// Keyword patterns for intelligent detection
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
  
  // For broad market ETF, set sector to Diversifié
  if (sector === 'Non classifié' && region !== 'Non classifié') {
    sector = 'Diversifié';
  }
  
  // Crypto detection
  if (searchText.includes('crypto') || searchText.includes('bitcoin') || searchText.includes('btc') || searchText.includes('eth')) {
    assetClass = 'Cryptomonnaies';
    region = 'Monde';
    sector = 'Diversifié';
  }
  
  return { region, sector, assetClass };
}

function enrichFromLocal(symbol: string, name: string): SecurityMetadata {
  // 1. Try database lookup
  const dbMatch = findInLocalDatabase(symbol);
  if (dbMatch) {
    return {
      symbol,
      region: dbMatch.region,
      sector: dbMatch.sector,
      assetClass: dbMatch.assetClass,
      source: 'local',
    };
  }
  
  // 2. Try keyword analysis
  const keywordResult = analyzeByKeywords(symbol, name);
  
  return {
    symbol,
    region: keywordResult.region,
    sector: keywordResult.sector,
    assetClass: keywordResult.assetClass,
    source: keywordResult.region !== 'Non classifié' ? 'local' : 'fallback',
  };
}

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

    console.log(`[ENRICH] Starting enrichment for user ${user.id}`);

    // Fetch all securities with their names
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

    console.log(`[ENRICH] Found ${securities.length} securities to process`);

    const results: Array<{ symbol: string; success: boolean; source: string; region?: string; sector?: string }> = [];
    let updated = 0;
    let skipped = 0;

    for (const security of securities) {
      console.log(`[ENRICH] Processing ${security.symbol}...`);
      
      // PRIORITY 1: Use local database/keywords enrichment
      const metadata = enrichFromLocal(security.symbol, security.name || '');
      
      console.log(`[ENRICH] ${security.symbol} -> region: ${metadata.region}, sector: ${metadata.sector}, source: ${metadata.source}`);
      
      // Only update if we got good data (not "Non classifié" placeholders from fallback)
      if (metadata.source === 'local' || 
          (metadata.region !== 'Non classifié' && metadata.sector !== 'Non classifié')) {
        
        const { error: updateError } = await supabase
          .from('securities')
          .update({
            region: metadata.region,
            sector: metadata.sector,
            updated_at: new Date().toISOString(),
          })
          .eq('id', security.id);

        if (updateError) {
          console.error(`[ENRICH] Error updating ${security.symbol}:`, updateError);
          results.push({
            symbol: security.symbol,
            success: false,
            source: metadata.source,
          });
        } else {
          console.log(`[ENRICH] Successfully updated ${security.symbol}`);
          results.push({
            symbol: security.symbol,
            success: true,
            source: metadata.source,
            region: metadata.region,
            sector: metadata.sector,
          });
          updated++;
        }
      } else {
        // Don't write placeholder values - leave as-is or set to "Non classifié"
        console.log(`[ENRICH] ${security.symbol}: no good classification found, marking as unclassified`);
        
        const { error: updateError } = await supabase
          .from('securities')
          .update({
            region: 'Non classifié',
            sector: 'Non classifié',
            updated_at: new Date().toISOString(),
          })
          .eq('id', security.id);

        if (!updateError) {
          results.push({
            symbol: security.symbol,
            success: true,
            source: 'unclassified',
            region: 'Non classifié',
            sector: 'Non classifié',
          });
        }
        skipped++;
      }
    }

    console.log(`[ENRICH] Complete: ${updated} enriched, ${skipped} unclassified`);

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
    console.error('[ENRICH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
