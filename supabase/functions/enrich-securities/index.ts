import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SecurityMetadata {
  symbol: string;
  region?: string;
  sector?: string;
  currency?: string;
}

// Map Yahoo Finance regions to our simplified regions
const mapRegion = (country: string | undefined, exchange: string | undefined): string => {
  if (!country && !exchange) return 'Non défini';
  
  const regionMap: Record<string, string> = {
    'US': 'États-Unis',
    'United States': 'États-Unis',
    'FR': 'Europe',
    'France': 'Europe',
    'DE': 'Europe',
    'Germany': 'Europe',
    'GB': 'Europe',
    'United Kingdom': 'Europe',
    'IT': 'Europe',
    'Italy': 'Europe',
    'ES': 'Europe',
    'Spain': 'Europe',
    'NL': 'Europe',
    'Netherlands': 'Europe',
    'CH': 'Europe',
    'Switzerland': 'Europe',
    'JP': 'Asie',
    'Japan': 'Asie',
    'CN': 'Asie',
    'China': 'Asie',
    'HK': 'Asie',
    'Hong Kong': 'Asie',
    'SG': 'Asie',
    'Singapore': 'Asie',
    'KR': 'Asie',
    'South Korea': 'Asie',
    'IN': 'Émergents',
    'India': 'Émergents',
    'BR': 'Émergents',
    'Brazil': 'Émergents',
    'MX': 'Émergents',
    'Mexico': 'Émergents',
  };
  
  const key = country || exchange || '';
  return regionMap[key] || 'Monde';
};

// Map Yahoo Finance sectors to French
const mapSector = (sector: string | undefined, industry: string | undefined): string => {
  if (!sector && !industry) return 'Diversifié';
  
  const sectorMap: Record<string, string> = {
    'Technology': 'Technologie',
    'Healthcare': 'Santé',
    'Financial Services': 'Finance',
    'Consumer Cyclical': 'Consommation',
    'Consumer Defensive': 'Consommation',
    'Industrials': 'Industrie',
    'Energy': 'Énergie',
    'Basic Materials': 'Matières premières',
    'Real Estate': 'Immobilier',
    'Communication Services': 'Télécommunications',
    'Utilities': 'Services publics',
    'ETF': 'Diversifié',
  };
  
  const key = sector || industry || '';
  return sectorMap[key] || sector || industry || 'Autre';
};

// Fetch metadata from Yahoo Finance API
async function fetchYahooFinanceMetadata(symbol: string): Promise<SecurityMetadata> {
  console.log(`Fetching metadata for ${symbol}`);
  
  try {
    // Use Yahoo Finance API v8 (unofficial but public)
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      console.warn(`Yahoo Finance API returned ${response.status} for ${symbol}`);
      return { symbol };
    }

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) {
      console.warn(`No metadata found for ${symbol}`);
      return { symbol };
    }

    // Fetch additional quote data for sector information
    const quoteUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const quoteResponse = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    let sector = 'Diversifié';
    let region = 'Monde';
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      const quote = quoteData?.quoteResponse?.result?.[0];
      
      if (quote) {
        region = mapRegion(quote.country, quote.exchange);
        
        // For ETFs, check if it's in the name
        if (quote.quoteType === 'ETF' || symbol.includes('ETF')) {
          sector = 'Diversifié';
        } else {
          sector = mapSector(quote.sector, quote.industry);
        }
      }
    }

    const currency = meta.currency || 'EUR';

    return {
      symbol,
      region,
      sector,
      currency,
    };
  } catch (error) {
    console.error(`Error fetching metadata for ${symbol}:`, error);
    return { symbol };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the JWT token from the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Enriching securities for user ${user.id}`);

    // Fetch all securities for this user that need enrichment
    const { data: securities, error: fetchError } = await supabase
      .from('securities')
      .select('id, symbol, sector, region, asset_class')
      .eq('user_id', user.id);

    if (fetchError) {
      throw fetchError;
    }

    if (!securities || securities.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No securities to enrich',
          updated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${securities.length} securities to enrich`);

    // Enrich securities (limit to avoid rate limiting)
    const results: Array<{ symbol: string; success: boolean; error?: string }> = [];
    let updated = 0;

    for (const security of securities) {
      // Skip if already has metadata
      if (security.sector && security.sector !== 'Diversifié' && security.region && security.region !== 'Monde') {
        console.log(`Skipping ${security.symbol} - already has metadata`);
        continue;
      }

      const metadata = await fetchYahooFinanceMetadata(security.symbol);

      // Update the security with enriched metadata
      if (metadata.region || metadata.sector) {
        const { error: updateError } = await supabase
          .from('securities')
          .update({
            region: metadata.region || security.region || 'Monde',
            sector: metadata.sector || security.sector || 'Diversifié',
            currency_quote: metadata.currency || security.asset_class,
            updated_at: new Date().toISOString(),
          })
          .eq('id', security.id);

        if (updateError) {
          console.error(`Error updating ${security.symbol}:`, updateError);
          results.push({
            symbol: security.symbol,
            success: false,
            error: updateError.message,
          });
        } else {
          console.log(`Successfully updated ${security.symbol}`);
          results.push({
            symbol: security.symbol,
            success: true,
          });
          updated++;
        }
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Enriched ${updated} out of ${securities.length} securities`,
        updated,
        total: securities.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in enrich-securities function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
