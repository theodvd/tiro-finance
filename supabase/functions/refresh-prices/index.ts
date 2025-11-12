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

    // 2) CRYPTO: mapping symbol -> id CoinGecko (ajoute ce que tu utilises)
    const CG_MAP: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      SOL: "solana",
      BNB: "binancecoin",
      XRP: "ripple",
      ADA: "cardano",
      DOGE: "dogecoin",
      MATIC: "polygon-pos",
      DOT: "polkadot",
      LINK: "chainlink",
      LTC: "litecoin",
      ATOM: "cosmos",
      AVAX: "avalanche-2",
      // complète au besoin
    };

    // 3) Construire la requête CoinGecko si besoin
    if (cryptos.length > 0) {
      const ids = Array.from(new Set(cryptos.map((s) => CG_MAP[s.symbol?.toUpperCase?.() || ""]).filter(Boolean)));

      if (ids.length > 0) {
        const apiKey = Deno.env.get("COINGECKO_API_KEY");
        const headers: Record<string, string> = { accept: "application/json" };
        if (apiKey) {
          headers["x-cg-demo-api-key"] = apiKey;
        }
        
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=eur`;
        console.log(`[CoinGecko] Fetching prices for: ${ids.join(", ")}`);
        
        const res = await fetch(url, { headers });
        const responseText = await res.text();
        
        if (!res.ok) {
          console.error(`[CoinGecko] API error ${res.status}: ${responseText}`);
          throw new Error(`CoinGecko error: ${res.status} ${responseText}`);
        }
        
        const prices = JSON.parse(responseText);
        console.log(`[CoinGecko] Response:`, JSON.stringify(prices));

        // 4) Upsert dans market_data (1 ligne par security)
        // Convention: native_ccy='EUR', eur_fx=1, last_close_dt = now
        const nowIso = new Date().toISOString();

        // Option: batched inserts pour minimiser les round-trips
        const rows = cryptos
          .map((s) => {
            const id = CG_MAP[s.symbol.toUpperCase()];
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
