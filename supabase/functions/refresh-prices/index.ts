import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Fetch user's securities
    const { data: securities, error: secError } = await supabase
      .from('securities')
      .select('id, symbol, asset_class, currency_quote, pricing_source')
      .eq('user_id', user.id);

    if (secError) {
      console.error('Error fetching securities:', secError);
      return new Response(JSON.stringify({ error: secError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch and parse ECB rates once
    let ecbRates: Record<string, number> = {};
    try {
      const ecbRes = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
      const xml = await ecbRes.text();
      const matches = [...xml.matchAll(/currency=["']([A-Z]{3})["']\s+rate=["']([\d.]+)["']/g)];
      for (const m of matches) {
        ecbRates[m[1]] = Number(m[2]);
      }
    } catch (e) {
      console.error('Error fetching ECB rates:', e);
    }

    // Helper function to get FX rate to EUR
    const getFxToEUR = async (quote: string): Promise<number> => {
      const q = quote.toUpperCase();
      if (!q || q === 'EUR') return 1;

      // Check cache first
      const { data: fxData } = await supabase
        .from('fx_rates')
        .select('*')
        .eq('base', 'EUR')
        .eq('quote', q)
        .order('asof', { ascending: false })
        .limit(1);

      if (fxData && fxData.length > 0) {
        return Number(fxData[0].rate);
      }

      // Use ECB rate if available
      const rate = ecbRates[q];
      if (rate) {
        await supabase.from('fx_rates').upsert({
          base: 'EUR',
          quote: q,
          rate,
          asof: new Date().toISOString().slice(0, 10)
        }, { onConflict: 'base,quote,asof' });
        return rate;
      }

      return 1; // Fallback
    };

    const cgMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana'
    };

    const results: any[] = [];

    // Process each security
    for (const sec of securities || []) {
      try {
        let nativeCcy = sec.currency_quote;
        let lastPxNative = 0;
        const lastCloseDt = new Date().toISOString();

        if (sec.pricing_source === 'YFINANCE') {
          // Use Yahoo Finance API with fallbacks
          const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sec.symbol}`);
          const yData = await yRes.json();
          
          if (yData?.chart?.result?.[0]) {
            const result = yData.chart.result[0];
            const meta = result.meta ?? {};
            const quoteCloses = result.indicators?.quote?.[0]?.close ?? [];
            const adjCloses = result.indicators?.adjclose?.[0]?.adjclose ?? [];

            // Try multiple price sources in order
            let px = Number(meta.regularMarketPrice ?? NaN);
            
            // Fallback to last non-null close
            if (!isFinite(px)) {
              const lastClose = [...quoteCloses].filter((x: any) => x != null).at(-1);
              px = Number(lastClose ?? NaN);
            }
            
            // Fallback to last non-null adjusted close
            if (!isFinite(px)) {
              const lastAdj = [...adjCloses].filter((x: any) => x != null).at(-1);
              px = Number(lastAdj ?? NaN);
            }
            
            // Final fallback to previous close
            if (!isFinite(px)) {
              px = Number(meta.previousClose ?? 0);
            }

            lastPxNative = px || 0;
            nativeCcy = (meta.currency || sec.currency_quote || 'EUR').toUpperCase();
          }
        } else if (sec.pricing_source === 'COINGECKO') {
          const cgId = cgMap[sec.symbol.toUpperCase()];
          if (cgId) {
            const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd`);
            const cgData = await cgRes.json();
            lastPxNative = Number(cgData?.[cgId]?.usd ?? 0);
            nativeCcy = 'USD';
          }
        } else {
          continue; // MANUAL - skip
        }

        const fx = await getFxToEUR(nativeCcy);
        const lastPxEur = lastPxNative * fx;

        await supabase.from('market_data').upsert({
          security_id: sec.id,
          native_ccy: nativeCcy,
          last_px_native: lastPxNative,
          eur_fx: fx,
          last_px_eur: lastPxEur,
          last_close_dt: lastCloseDt,
          updated_at: new Date().toISOString()
        }, { onConflict: 'security_id' });

        results.push({
          symbol: sec.symbol,
          native_ccy: nativeCcy,
          last_px_native: lastPxNative,
          eur_fx: fx,
          last_px_eur: lastPxEur
        });

        console.log(`Updated ${sec.symbol}: ${lastPxEur} EUR`);
      } catch (e: any) {
        console.error(`Error processing ${sec.symbol}:`, e.message);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: securities?.length || 0, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in refresh-prices:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
