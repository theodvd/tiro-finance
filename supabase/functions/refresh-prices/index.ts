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

    /**
     * Returns EUR per 1 unit of quote currency (what we want to multiply native prices by).
     * ECB publishes QUOTE per 1 EUR, so we invert it.
     */
    const eurPer = (quote: string): number => {
      const q = (quote || 'EUR').toUpperCase();
      if (q === 'EUR') return 1;
      const quotePerEur = ecbRates[q];            // e.g. USD: 1.1561 USD per 1 EUR
      if (!Number.isFinite(quotePerEur) || quotePerEur <= 0) return 1;
      return 1 / quotePerEur;                     // EUR per 1 USD
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
          const cgId = cgMap[(sec.symbol || '').toUpperCase()];
          if (!cgId) {
            console.error(`Unknown CoinGecko ID for symbol ${sec.symbol}`);
            continue;
          }

          // Get price directly in EUR (no FX conversion afterward)
          const cgRes = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=eur`
          );
          const cgData = await cgRes.json();
          const px = Number(cgData?.[cgId]?.eur ?? 0);

          lastPxNative = px;
          nativeCcy = 'EUR';
        } else {
          continue; // MANUAL - skip
        }

        let fxToEUR = eurPer(nativeCcy);    // EUR per 1 native unit

        // Safety guard: if not EUR and fxToEUR looks inverted (>1.05), flip it
        if (nativeCcy !== 'EUR' && fxToEUR > 1.05) {
          fxToEUR = 1 / fxToEUR;
        }

        const lastPxEur = lastPxNative * fxToEUR;

        // Optional: cache ECB rate for auditing (ECB convention: QUOTE per 1 EUR)
        const quotePerEur = ecbRates[nativeCcy.toUpperCase()];
        if (quotePerEur) {
          await supabase.from('fx_rates').upsert({
            base: 'EUR',
            quote: nativeCcy.toUpperCase(),
            rate: quotePerEur,
            asof: new Date().toISOString().slice(0, 10)
          }, { onConflict: 'base,quote,asof' });
        }

        await supabase.from('market_data').upsert({
          security_id: sec.id,
          native_ccy: nativeCcy,
          last_px_native: lastPxNative,
          eur_fx: fxToEUR,           // EUR per 1 native unit
          last_px_eur: lastPxEur,
          last_close_dt: lastCloseDt,
          updated_at: new Date().toISOString()
        }, { onConflict: 'security_id' });

        results.push({
          symbol: sec.symbol,
          native_ccy: nativeCcy,
          last_px_native: lastPxNative,
          eur_fx: fxToEUR,
          last_px_eur: lastPxEur
        });

        console.log(`[FX] ${nativeCcy}: fxToEUR=${fxToEUR}`);
        console.log(`[PX] ${sec.symbol}: ${lastPxNative} ${nativeCcy} -> ${lastPxEur} EUR`);
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
