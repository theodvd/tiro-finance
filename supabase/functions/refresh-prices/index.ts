// supabase/functions/refresh-prices/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Security = {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_class: string;
};

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        console.warn(`[Yahoo] Attempt ${attempt + 1} failed for ${url}: ${res.status}`);
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      return res; // 4xx other than 429 = don't retry
    } catch (err) {
      console.warn(`[Yahoo] Attempt ${attempt + 1} network error for ${url}:`, err);
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} retries: ${url}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  try {
    // 1) Récupérer les securities de l'utilisateur
    const { data: secs, error: secErr } = await supabase
      .from("securities")
      .select("id,user_id,symbol,name,asset_class")
      .eq("user_id", user.id);

    if (secErr) throw secErr;

    const cryptos = (secs ?? []).filter((s) => (s.asset_class || "").toUpperCase() === "CRYPTO");
    const nonCryptos = (secs ?? []).filter((s) => (s.asset_class || "").toUpperCase() !== "CRYPTO");

    const nowIso = new Date().toISOString();

    // 2) Refresh non-crypto prices via Yahoo Finance
    if (nonCryptos.length > 0) {
      console.log(`[Yahoo Finance] Fetching prices for ${nonCryptos.length} securities`);
      
      for (const security of nonCryptos) {
        try {
          // Check if we already have a recent price (< 4 hours old)
          const { data: existingPrice } = await supabase
            .from("market_data")
            .select("last_px_eur, updated_at")
            .eq("security_id", security.id)
            .maybeSingle();

          if (existingPrice?.updated_at) {
            const ageMs = Date.now() - new Date(existingPrice.updated_at).getTime();
            const ageHours = ageMs / (1000 * 60 * 60);
            if (ageHours < 4) {
              console.log(`[Yahoo] ${security.symbol}: price is ${ageHours.toFixed(1)}h old, skipping`);
              continue;
            }
          }

          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${security.symbol}`;
          const res = await fetchWithRetry(url);
          
          if (!res.ok) {
            console.error(`[Yahoo Finance] Error for ${security.symbol}: ${res.status}`);
            continue;
          }
          
          const data = await res.json();
          const quote = data?.chart?.result?.[0]?.meta;
          
          if (!quote || !quote.regularMarketPrice) {
            console.error(`[Yahoo Finance] No price data for ${security.symbol}`);
            continue;
          }
          
          const price = quote.regularMarketPrice;
          const currency = quote.currency || "USD";
          
          // Convert to EUR if needed
          let priceEur = price;
          let fxRate = 1.0;
          
          if (currency !== "EUR") {
            try {
              const fxRes = await fetchWithRetry(`https://api.frankfurter.app/latest?from=${currency}&to=EUR`);
              const fxData = await fxRes.json();
              fxRate = fxData.rates?.EUR || 1.0;
            } catch (fxErr) {
              console.warn(`[FX] Fallback for ${currency}: using existing rate`);
              if (existingPrice?.last_px_eur && existingPrice?.last_px_eur > 0) {
                // Keep existing EUR price rather than using wrong FX
                continue;
              }
            }
            priceEur = price * fxRate;
          }
          
          await supabase.from("market_data").upsert({
            security_id: security.id,
            native_ccy: currency,
            last_px_native: price,
            eur_fx: fxRate,
            last_px_eur: priceEur,
            last_close_dt: nowIso,
            updated_at: nowIso,
          }, { onConflict: "security_id" });
          
          console.log(`[Yahoo Finance] Updated ${security.symbol}: ${priceEur.toFixed(2)} EUR`);
          
          // Rate limiting - 300ms between calls to avoid 429s
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`[Yahoo Finance] Error processing ${security.symbol}:`, error);
        }
      }
    }

    // 3) Fetch crypto prices using CryptoCompare
    if (cryptos.length > 0) {
      const symbols = Array.from(new Set(cryptos.map((s) => s.symbol?.toUpperCase?.()).filter(Boolean)));

      if (symbols.length > 0) {
        const fsyms = symbols.join(",");
        const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=EUR`;
        console.log(`[CryptoCompare] Fetching prices for: ${fsyms}`);
        
        const res = await fetch(url, { headers: { accept: "application/json" } });
        const responseText = await res.text();
        
        if (!res.ok) {
          console.error(`[CryptoCompare] API error ${res.status}: ${responseText}`);
          throw new Error(`CryptoCompare error: ${res.status} ${responseText}`);
        }
        
        const prices = JSON.parse(responseText);
        console.log(`[CryptoCompare] Response:`, JSON.stringify(prices));

        const rows = cryptos
          .map((s) => {
            const symbol = s.symbol.toUpperCase();
            const px = prices?.[symbol]?.EUR ?? null;
            return px
              ? {
                  security_id: s.id,
                  native_ccy: "EUR",
                  last_px_native: px,
                  eur_fx: 1,
                  last_px_eur: px,
                  last_close_dt: nowIso,
                  updated_at: nowIso,
                }
              : null;
          })
          .filter(Boolean) as any[];

        if (rows.length > 0) {
          const { error: upsertErr } = await supabase
            .from("market_data")
            .upsert(rows, { onConflict: "security_id" });
          if (upsertErr) throw upsertErr;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[refresh-prices]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
