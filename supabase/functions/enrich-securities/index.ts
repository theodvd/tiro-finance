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
    // États-Unis
    'US': 'États-Unis',
    'USA': 'États-Unis',
    'United States': 'États-Unis',
    'NASDAQ': 'États-Unis',
    'NYSE': 'États-Unis',
    
    // Europe
    'FR': 'Europe',
    'France': 'Europe',
    'FRA': 'Europe',
    'DE': 'Europe',
    'Germany': 'Europe',
    'GER': 'Europe',
    'GB': 'Europe',
    'United Kingdom': 'Europe',
    'LON': 'Europe',
    'IT': 'Europe',
    'Italy': 'Europe',
    'ITA': 'Europe',
    'ES': 'Europe',
    'Spain': 'Europe',
    'SPA': 'Europe',
    'NL': 'Europe',
    'Netherlands': 'Europe',
    'AMS': 'Europe',
    'CH': 'Europe',
    'Switzerland': 'Europe',
    'SWX': 'Europe',
    
    // Asie
    'JP': 'Asie',
    'Japan': 'Asie',
    'JPN': 'Asie',
    'CN': 'Asie',
    'China': 'Asie',
    'SHA': 'Asie',
    'HK': 'Asie',
    'Hong Kong': 'Asie',
    'HKG': 'Asie',
    'SG': 'Asie',
    'Singapore': 'Asie',
    'SGP': 'Asie',
    'KR': 'Asie',
    'South Korea': 'Asie',
    'KOR': 'Asie',
    
    // Émergents
    'IN': 'Émergents',
    'India': 'Émergents',
    'IND': 'Émergents',
    'BR': 'Émergents',
    'Brazil': 'Émergents',
    'BRA': 'Émergents',
    'MX': 'Émergents',
    'Mexico': 'Émergents',
    'MEX': 'Émergents',
    'ZA': 'Émergents',
    'South Africa': 'Émergents',
    'ZAF': 'Émergents',
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
  console.log(`[ENRICH] Fetching metadata for ${symbol}`);
  
  try {
    // Use Yahoo Finance API v8 (unofficial but public)
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}`;
    console.log(`[ENRICH] Calling ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    console.log(`[ENRICH] Chart API response status: ${response.status}`);

    if (!response.ok) {
      console.warn(`[ENRICH] Yahoo Finance API returned ${response.status} for ${symbol}`);
      return { symbol, region: 'Monde', sector: 'Diversifié', currency: 'EUR' };
    }

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;

    if (!meta) {
      console.warn(`[ENRICH] No metadata found for ${symbol}`);
      return { symbol, region: 'Monde', sector: 'Diversifié', currency: 'EUR' };
    }

    console.log(`[ENRICH] Meta currency: ${meta.currency}`);

    // Fetch additional quote data for sector information
    const quoteUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    console.log(`[ENRICH] Calling ${quoteUrl}`);
    
    const quoteResponse = await fetch(quoteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    console.log(`[ENRICH] Quote API response status: ${quoteResponse.status}`);

    let sector = 'Diversifié';
    let region = 'Monde';
    
    if (quoteResponse.ok) {
      const quoteData = await quoteResponse.json();
      const quote = quoteData?.quoteResponse?.result?.[0];
      
      // Log détaillé des données Yahoo Finance
      console.log(`[${symbol}] Country: ${quote?.country}, Exchange: ${quote?.exchange}, Sector: ${quote?.sector}`);
      
      console.log(`[ENRICH] Quote data:`, JSON.stringify({
        quoteType: quote?.quoteType,
        country: quote?.country,
        exchange: quote?.exchange,
        sector: quote?.sector,
        industry: quote?.industry
      }));
      
      if (quote) {
        // Detect world ETFs (VWCE, IWDA, etc.)
        const isWorldETF = ['VWCE', 'IWDA', 'SWRD', 'ACWI', 'VT', 'MSCI'].some(ticker => 
          symbol.toUpperCase().includes(ticker)
        );
        
        if (isWorldETF) {
          region = 'Monde';
          sector = 'Diversifié';
          console.log(`[ENRICH] Detected world ETF: ${symbol}`);
        } else {
          region = mapRegion(quote.country, quote.exchange);
          
          // For ETFs, check if it's in the name
          if (quote.quoteType === 'ETF' || symbol.includes('ETF')) {
            sector = 'Diversifié';
          } else {
            sector = mapSector(quote.sector, quote.industry);
          }
        }
        
        console.log(`[ENRICH] Mapped region: ${region}, sector: ${sector}`);
      }
    }

    const currency = meta.currency || 'EUR';

    const result = {
      symbol,
      region,
      sector,
      currency,
    };
    
    console.log(`[ENRICH] Final result for ${symbol}:`, JSON.stringify(result));

    return result;
  } catch (error) {
    console.error(`[ENRICH] Error fetching metadata for ${symbol}:`, error);
    return { symbol, region: 'Monde', sector: 'Diversifié', currency: 'EUR' };
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

    // Fetch all securities for this user
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

    // Enrich securities
    const results: Array<{ symbol: string; success: boolean; error?: string }> = [];
    let updated = 0;

    for (const security of securities) {
      console.log(`Processing ${security.symbol}...`);
      
      const metadata = await fetchYahooFinanceMetadata(security.symbol);

      // Update the security with enriched metadata
      console.log(`[ENRICH] Updating ${security.symbol} with:`, {
        region: metadata.region,
        sector: metadata.sector,
        currency: metadata.currency
      });
      
      const { error: updateError } = await supabase
        .from('securities')
        .update({
          region: metadata.region || 'Monde',
          sector: metadata.sector || 'Diversifié',
          currency_quote: metadata.currency || 'EUR',
          updated_at: new Date().toISOString(),
        })
        .eq('id', security.id);

      if (updateError) {
        console.error(`[ENRICH] Error updating ${security.symbol}:`, updateError);
        results.push({
          symbol: security.symbol,
          success: false,
          error: updateError.message,
        });
      } else {
        console.log(`[ENRICH] Successfully updated ${security.symbol}`);
        results.push({
          symbol: security.symbol,
          success: true,
        });
        updated++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`[ENRICH] Enrichment complete: ${updated}/${securities.length} securities updated`);

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
    console.error('[ENRICH] Error in enrich-securities function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
