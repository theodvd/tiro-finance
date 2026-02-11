import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { isin } = await req.json();
    if (!isin || isin.length < 10) {
      return new Response(JSON.stringify({ error: 'Invalid ISIN' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[resolve-isin] Resolving ${isin}`);

    // Try OpenFIGI (free, no API key needed)
    try {
      const figiRes = await fetch('https://api.openfigi.com/v3/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ idType: 'ID_ISIN', idValue: isin }]),
      });

      if (figiRes.ok) {
        const figiData = await figiRes.json();
        const results = figiData?.[0]?.data;
        if (results && results.length > 0) {
          const best = results.find((r: any) => r.securityType2 === 'Common Stock')
            || results.find((r: any) => r.securityType2 === 'ETP')
            || results[0];

          const ticker = best.ticker;
          const exchCode = best.exchCode;
          const name = best.name;
          const marketSector = best.marketSector;

          let yahooSymbol = ticker;

          const exchangeSuffixes: Record<string, string> = {
            'FP': '.PA',
            'NA': '.AS',
            'GY': '.DE',
            'LN': '.L',
            'SW': '.SW',
            'IM': '.MI',
            'SM': '.MC',
            'BB': '.BR',
            'ID': '.IR',
            'JT': '.T',
            'HK': '.HK',
          };

          const usExchanges = ['US', 'UN', 'UW', 'UA', 'UQ', 'UR', 'UP'];
          if (!usExchanges.includes(exchCode) && exchangeSuffixes[exchCode]) {
            yahooSymbol = ticker + exchangeSuffixes[exchCode];
          }

          console.log(`[resolve-isin] ${isin} → ${yahooSymbol} (${name}, ${exchCode})`);

          return new Response(JSON.stringify({
            symbol: yahooSymbol,
            name: name || null,
            exchange: exchCode || null,
            marketSector: marketSector || null,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    } catch (figiErr) {
      console.warn(`[resolve-isin] OpenFIGI error:`, figiErr);
    }

    console.log(`[resolve-isin] ${isin} → not resolved`);
    return new Response(JSON.stringify({
      symbol: null,
      name: null,
      exchange: null,
      marketSector: null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[resolve-isin] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
