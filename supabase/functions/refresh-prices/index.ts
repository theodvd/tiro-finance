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
  asset_class: string; // 'EQUITY' | 'ETF' | 'CRYPTO' | ...
};

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

    // --------- TON CHEMIN EXISTANT POUR NON-CRYPTO ICI ---------
    // Si tu avais déjà une logique Yahoo/EOD pour actions/ETF, garde-la.
    // (Optionnel) await refreshNonCryptoPrices(nonCryptos);

    // 2) CRYPTO: mapping symbol -> id CoinCap (free API, no auth needed)
    const COINCAP_MAP: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      SOL: "solana",
      BNB: "binance-coin",
      XRP: "xrp",
      ADA: "cardano",
      DOGE: "dogecoin",
      MATIC: "polygon",
      DOT: "polkadot",
      LINK: "chainlink",
      LTC: "litecoin",
      ATOM: "cosmos",
      AVAX: "avalanche",
      // complète au besoin
    };

    // 3) Construire la requête CoinCap (free API, no rate limit issues)
    if (cryptos.length > 0) {
      const ids = Array.from(new Set(cryptos.map((s) => COINCAP_MAP[s.symbol?.toUpperCase?.() || ""]).filter(Boolean)));

      if (ids.length > 0) {
        const url = `https://api.coincap.io/v2/assets?ids=${ids.join(",")}`;
        console.log(`[CoinCap] Fetching prices for: ${ids.join(", ")}`);
        
        const res = await fetch(url, { headers: { accept: "application/json" } });
        const responseText = await res.text();
        
        if (!res.ok) {
          console.error(`[CoinCap] API error ${res.status}: ${responseText}`);
          throw new Error(`CoinCap error: ${res.status} ${responseText}`);
        }
        
        const data = JSON.parse(responseText);
        console.log(`[CoinCap] Response:`, JSON.stringify(data));
        
        // CoinCap returns prices in USD, need to convert to EUR
        // Get EUR/USD rate (approximate: 1 USD = 0.92 EUR, but could fetch live rate)
        const usdToEur = 0.92; // You could fetch this from ECB or another source
        
        // Build a map of id -> price in EUR
        const prices: Record<string, { eur: number }> = {};
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((asset: any) => {
            if (asset.priceUsd) {
              prices[asset.id] = { eur: parseFloat(asset.priceUsd) * usdToEur };
            }
          });
        }
        console.log(`[CoinCap] Converted prices to EUR:`, JSON.stringify(prices));

        // 4) Upsert dans market_data (1 ligne par security)
        // Convention: native_ccy='EUR', eur_fx=1, last_close_dt = now
        const nowIso = new Date().toISOString();

        // Option: batched inserts pour minimiser les round-trips
        const rows = cryptos
          .map((s) => {
            const id = COINCAP_MAP[s.symbol.toUpperCase()];
            const px = prices?.[id]?.eur ?? null;
            return px
              ? {
                  user_id: user.id,
                  security_id: s.id,
                  native_ccy: "EUR",
                  last_px_native: px,
                  eur_fx: 1,
                  last_px_eur: px,
                  last_close_dt: nowIso,
                }
              : null;
          })
          .filter(Boolean) as any[];

        if (rows.length > 0) {
          const { error: insErr } = await supabase.from("market_data").insert(rows);
          if (insErr) throw insErr;
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
