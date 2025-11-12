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

    // 2) Fetch crypto prices (CryptoCompare supports direct symbol lookup)

    // 3) Fetch crypto prices using CryptoCompare (free API, stable with edge functions)
    if (cryptos.length > 0) {
      const symbols = Array.from(new Set(cryptos.map((s) => s.symbol?.toUpperCase?.()).filter(Boolean)));

      if (symbols.length > 0) {
        // CryptoCompare API: multi-symbol fetch
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

        // 4) Upsert dans market_data (1 ligne par security)
        // Convention: native_ccy='EUR', eur_fx=1, last_close_dt = now
        const nowIso = new Date().toISOString();

        // Option: batched inserts pour minimiser les round-trips
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
