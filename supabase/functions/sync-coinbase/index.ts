import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Parse a PEM string and return its DER bytes + header type
function parsePem(pem: string): { type: string; der: Uint8Array } {
  const match = pem.match(/-----BEGIN ([^-]+)-----/);
  const type = match?.[1]?.trim() || '';
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return { type, der };
}

// DER variable-length encoding
function derLength(len: number): Uint8Array {
  if (len < 128) return new Uint8Array([len]);
  if (len < 256) return new Uint8Array([0x81, len]);
  return new Uint8Array([0x82, (len >> 8) & 0xff, len & 0xff]);
}

// Wrap a SEC1 EC private key (BEGIN EC PRIVATE KEY) into PKCS#8 for P-256
function sec1ToPkcs8(sec1: Uint8Array): Uint8Array {
  // Algorithm SEQUENCE: ecPublicKey OID + prime256v1 OID
  const alg = new Uint8Array([
    0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID id-ecPublicKey
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID prime256v1
  ]);
  const version = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0
  const octetLen = derLength(sec1.length);
  const inner = new Uint8Array([0x04, ...octetLen, ...sec1]);
  const content = new Uint8Array([...version, ...alg, ...inner]);
  const seqLen = derLength(content.length);
  return new Uint8Array([0x30, ...seqLen, ...content]);
}

async function generateJWT(
  keyId: string,
  key: CryptoKey,
  alg: string,
  method: string,
  path: string
): Promise<string> {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const header = { alg, kid: keyId, nonce: crypto.randomUUID(), typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  // Strip query params from URI
  const cleanPath = path.split('?')[0];
  const payload = {
    sub: keyId,
    iss: 'cdp',
    aud: ['cdp_service'],
    nbf: now,
    exp: now + 120,
    uri: `${method} api.coinbase.com${cleanPath}`,
  };

  const headerB64 = b64url(header);
  const payloadB64 = b64url(payload);
  const message = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const signAlgo = alg === 'EdDSA' ? 'Ed25519' : { name: 'ECDSA', hash: 'SHA-256' };
  const signature = await crypto.subtle.sign(signAlgo, key, message);

  let sigBytes = new Uint8Array(signature);
  // For ECDSA, convert DER to raw r||s (64 bytes) if needed
  if (alg === 'ES256' && sigBytes.length !== 64) {
    sigBytes = derToRaw(sigBytes);
  }

  const sigB64 = btoa(String.fromCharCode(...sigBytes))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // Parse DER SEQUENCE { INTEGER r, INTEGER s }
  const raw = new Uint8Array(64);
  let offset = 2; // skip SEQUENCE tag + length
  // r
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  // s
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

interface KeyInfo {
  key: CryptoKey;
  alg: string;
}

async function detectAndImportKey(privateKeyPem: string): Promise<KeyInfo> {
  // privateKeyPem is a PEM string (e.g. "-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----\n")
  const { type, der } = parsePem(privateKeyPem);
  console.log(`[sync-coinbase] PEM type: "${type}", DER length: ${der.length}`);

  if (type === 'PRIVATE KEY') {
    // Already PKCS#8 — try Ed25519 first, then P-256
    try {
      const key = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign']);
      return { key, alg: 'EdDSA' };
    } catch (_) { /* not Ed25519 */ }
    try {
      const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
      return { key, alg: 'ES256' };
    } catch (_) { /* not P-256 */ }
  } else if (type === 'EC PRIVATE KEY') {
    // SEC1 format — wrap in PKCS#8 then import as P-256
    try {
      const pkcs8 = sec1ToPkcs8(der);
      const key = await crypto.subtle.importKey('pkcs8', pkcs8, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
      return { key, alg: 'ES256' };
    } catch (_) { /* conversion failed */ }
  } else {
    // Fallback: try raw PKCS#8 parse in case headers were stripped
    try {
      const key = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, false, ['sign']);
      return { key, alg: 'EdDSA' };
    } catch (_) {}
    try {
      const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
      return { key, alg: 'ES256' };
    } catch (_) {}
  }

  throw new Error(`Impossible d'importer la clé privée (type PEM: "${type}"). Vérifiez que le fichier JSON Coinbase CDP est valide.`);
}

async function coinbaseFetch(
  key: CryptoKey,
  alg: string,
  keyId: string,
  method: string,
  path: string
): Promise<any> {
  const jwt = await generateJWT(keyId, key, alg, method, path);
  const res = await fetch(`https://api.coinbase.com${path}`, {
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[sync-coinbase] API error ${res.status} on ${path}:`, body);
    throw new Error(`Coinbase API error: ${res.status}`);
  }
  return res.json();
}

// Fetch ALL fills across ALL products in one paginated call.
// product_id is optional on this endpoint — omitting it returns the full history.
async function fetchAllFillsGlobal(
  key: CryptoKey,
  alg: string,
  keyId: string
): Promise<any[]> {
  const all: any[] = [];
  let cursor = '';
  const limit = 250; // max per page
  let page = 0;
  while (page < 40) { // up to 10 000 fills
    let path = `/api/v3/brokerage/orders/historical/fills?limit=${limit}`;
    if (cursor) path += `&cursor=${cursor}`;
    const data = await coinbaseFetch(key, alg, keyId, 'GET', path);
    if (data.fills && data.fills.length > 0) all.push(...data.fills);
    if (!data.cursor || !data.fills || data.fills.length < limit) break;
    cursor = data.cursor;
    page++;
  }
  return all;
}

// Group fills by base symbol and compute cost basis in EUR for each
function computeCostBasisPerSymbol(fills: any[], usdToEur: number): Map<string, number> {
  const costMap = new Map<string, number>();
  for (const fill of fills) {
    if (fill.side !== 'BUY') continue;
    const parts = (fill.product_id || '').split('-');
    if (parts.length < 2) continue;
    const symbol = parts[0].toUpperCase();
    const quote = parts[parts.length - 1].toUpperCase();

    const price = parseFloat(fill.price || '0');
    const size = parseFloat(fill.size || '0');
    const commission = parseFloat(fill.commission || '0');
    const fillCostNative = price * size + commission;
    const fxRate = quote === 'EUR' ? 1 : usdToEur; // USD / USDC / USDT → EUR
    costMap.set(symbol, (costMap.get(symbol) ?? 0) + fillCostNative * fxRate);
  }
  return costMap;
}

// Fetch live USD → EUR rate (falls back to 0.92 if unavailable)
async function fetchUsdToEurRate(): Promise<number> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR');
    if (!res.ok) return 0.92;
    const data = await res.json();
    return data.rates?.EUR ?? 0.92;
  } catch {
    return 0.92;
  }
}

// Fetch cost basis per asset from Coinbase portfolio breakdown.
// Returns a map of symbol → { valueEur: number } using Coinbase's own accounting.
// The cost_basis field may be in USD or EUR depending on account settings; we convert as needed.
async function fetchPortfolioCostBasis(
  key: CryptoKey,
  alg: string,
  keyId: string,
  usdToEur: number
): Promise<Map<string, number>> {
  const costMap = new Map<string, number>();
  try {
    const portfoliosData = await coinbaseFetch(key, alg, keyId, 'GET', '/api/v3/brokerage/portfolios');
    const portfolios: any[] = portfoliosData.portfolios || [];
    console.log(`[sync-coinbase] ${portfolios.length} portfolio(s) found`);

    for (const portfolio of portfolios) {
      try {
        const bd = await coinbaseFetch(
          key, alg, keyId, 'GET',
          `/api/v3/brokerage/portfolios/${portfolio.uuid}/breakdown`
        );
        const positions: any[] = bd.breakdown?.spot_positions || [];
        for (const pos of positions) {
          if (pos.is_cash) continue;
          const symbol = (pos.asset as string || '').toUpperCase();
          if (!symbol) continue;

          // Try cost_basis first, then fall back to average_entry_price × balance
          let rawValue = parseFloat(pos.cost_basis?.value || '0');
          let currency = (pos.cost_basis?.currency as string || 'USD').toUpperCase();

          if (rawValue <= 0) {
            const avgPrice = parseFloat(pos.average_entry_price || '0');
            const balance = parseFloat(pos.total_balance_crypto || '0');
            if (avgPrice > 0 && balance > 0) {
              rawValue = avgPrice * balance;
              currency = 'USD'; // average_entry_price is in fiat (usually USD)
              console.log(`[sync-coinbase] ${symbol}: using avg_entry_price fallback: ${avgPrice} × ${balance}`);
            }
          }

          if (rawValue <= 0) continue;
          const valueEur = currency === 'EUR' ? rawValue : rawValue * usdToEur;
          costMap.set(symbol, (costMap.get(symbol) ?? 0) + valueEur);
          console.log(`[sync-coinbase] Portfolio: ${symbol} = ${rawValue} ${currency} → ${valueEur.toFixed(2)} EUR`);
        }
      } catch (e) {
        console.warn(`[sync-coinbase] Portfolio breakdown error (${portfolio.uuid}):`, e);
      }
    }
  } catch (e) {
    console.warn('[sync-coinbase] Could not fetch portfolios (will fall back to fills):', e);
  }
  return costMap;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing auth');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Not authenticated');

    // 1. Get stored Coinbase credentials
    const { data: connection, error: connError } = await supabase
      .from('broker_connections')
      .select('credentials')
      .eq('user_id', user.id)
      .eq('broker', 'coinbase')
      .single();

    if (connError || !connection) throw new Error('No Coinbase connection found.');

    const creds = connection.credentials as { keyId: string; privateKey: string };
    if (!creds?.keyId || !creds?.privateKey) throw new Error('Invalid Coinbase credentials');

    // 2. Auto-detect key type and import
    const { key, alg } = await detectAndImportKey(creds.privateKey);
    console.log(`[sync-coinbase] Key imported (${alg}), fetching accounts...`);

    // 3. Use Advanced Trade API (supports both EdDSA and ES256)
    const accountsData = await coinbaseFetch(key, alg, creds.keyId, 'GET', '/api/v3/brokerage/accounts?limit=250');
    const accounts = accountsData.accounts || [];
    console.log('[sync-coinbase] Coinbase returned', accounts.length, 'accounts');

    // 4. Filter accounts with non-zero balance (use total balance, not just available)
    const positions = accounts
      .filter((acc: any) => {
        const bal = parseFloat(acc.balance?.value || acc.available_balance?.value || '0');
        return bal > 0 && acc.type === 'ACCOUNT_TYPE_CRYPTO';
      })
      .map((acc: any) => ({
        uuid: acc.uuid,
        symbol: (acc.currency || '').toUpperCase(),
        name: acc.name || acc.currency,
        quantity: parseFloat(acc.balance?.value || acc.available_balance?.value || '0'),
      }));

    console.log('[sync-coinbase] Positions with balance:', positions.length);

    // 5. Fetch cost basis — two independent sources, merged by priority
    const usdToEur = await fetchUsdToEurRate();
    console.log(`[sync-coinbase] USD/EUR rate: ${usdToEur}`);

    // Source A: Coinbase portfolio breakdown (cost_basis / average_entry_price per asset)
    const portfolioCostBasis = await fetchPortfolioCostBasis(key, alg, creds.keyId, usdToEur);
    console.log(`[sync-coinbase] Portfolio cost basis: ${portfolioCostBasis.size} symbol(s)`);

    // Source B: All fills in one global call (product_id is optional → returns full history)
    let fillsCostBasis = new Map<string, number>();
    try {
      const allFills = await fetchAllFillsGlobal(key, alg, creds.keyId);
      fillsCostBasis = computeCostBasisPerSymbol(allFills, usdToEur);
      console.log(`[sync-coinbase] Fills: ${allFills.length} total, cost basis for ${fillsCostBasis.size} symbol(s)`);
    } catch (e) {
      console.warn('[sync-coinbase] Global fills fetch failed:', e);
    }

    // 6. Find or create the CRYPTO account named "Coinbase"
    let { data: cbAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', 'Coinbase')
      .eq('type', 'CRYPTO')
      .maybeSingle();

    if (!cbAccount) {
      const { data: newAcc, error: accErr } = await supabase
        .from('accounts')
        .insert({ user_id: user.id, name: 'Coinbase', type: 'CRYPTO' })
        .select('id')
        .single();
      if (accErr) throw new Error('Failed to create Coinbase account: ' + accErr.message);
      cbAccount = newAcc;
    }

    let synced = 0;
    const syncedSecurityIds: string[] = [];
    const debugCostBasis: Record<string, { source: string; eur: number }> = {};

    for (const pos of positions) {
      // 7. Determine cost basis — 3-level priority:
      //    1. Coinbase portfolio breakdown (most authoritative)
      //    2. Global fills computation (covers all pairs at once)
      //    3. Existing DB value (preserve manual entry or previous sync)
      let costBasis = 0;
      let costBasisSource = 'none';

      const portfolioCost = portfolioCostBasis.get(pos.symbol);
      const fillsCost = fillsCostBasis.get(pos.symbol);

      if (portfolioCost !== undefined && portfolioCost > 0) {
        costBasis = portfolioCost;
        costBasisSource = 'portfolio';
      } else if (fillsCost !== undefined && fillsCost > 0) {
        costBasis = fillsCost;
        costBasisSource = 'fills';
      }
      console.log(`[sync-coinbase] ${pos.symbol}: source=${costBasisSource} cost=${costBasis.toFixed(2)} EUR`);

      // Find or create security
      let { data: security } = await supabase
        .from('securities')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', pos.symbol)
        .eq('asset_class', 'CRYPTO')
        .maybeSingle();

      if (!security) {
        const { data: newSec, error: secErr } = await supabase
          .from('securities')
          .insert({
            user_id: user.id,
            symbol: pos.symbol,
            name: pos.name,
            asset_class: 'CRYPTO',
            currency_quote: 'EUR',
            pricing_source: 'COINGECKO',
          })
          .select('id')
          .single();
        if (secErr) {
          console.error('[sync-coinbase] Security insert error:', secErr, pos);
          continue;
        }
        security = newSec;
      }

      syncedSecurityIds.push(security!.id);

      // Find or update holding
      let { data: holding } = await supabase
        .from('holdings')
        .select('id, amount_invested_eur')
        .eq('user_id', user.id)
        .eq('account_id', cbAccount!.id)
        .eq('security_id', security!.id)
        .maybeSingle();

      // Preserve existing DB value if no source found (e.g. manual entry)
      const existingCostBasis = holding ? Number((holding as any).amount_invested_eur || 0) : 0;
      const finalCostBasis = costBasisSource !== 'none' ? costBasis : existingCostBasis;
      const finalSource = costBasisSource !== 'none' ? costBasisSource : 'preserved';
      debugCostBasis[pos.symbol] = { source: finalSource, eur: Math.round(finalCostBasis * 100) / 100 };


      const holdingData = {
        shares: pos.quantity,
        amount_invested_eur: finalCostBasis,
      };

      if (holding) {
        const { error: updErr } = await supabase
          .from('holdings')
          .update(holdingData)
          .eq('id', (holding as any).id);
        if (updErr) {
          console.error('[sync-coinbase] Holding update error:', updErr);
          continue;
        }
      } else {
        const { error: insErr } = await supabase
          .from('holdings')
          .insert({
            user_id: user.id,
            account_id: cbAccount!.id,
            security_id: security!.id,
            ...holdingData,
          });
        if (insErr) {
          console.error('[sync-coinbase] Holding insert error:', insErr);
          continue;
        }
      }

      synced++;
    }

    // 7b. Remove stale holdings for positions that no longer exist on Coinbase
    if (syncedSecurityIds.length > 0) {
      const { error: delErr } = await supabase
        .from('holdings')
        .delete()
        .eq('user_id', user.id)
        .eq('account_id', cbAccount!.id)
        .not('security_id', 'in', `(${syncedSecurityIds.join(',')})`);
      if (delErr) {
        console.warn('[sync-coinbase] Could not clean stale holdings:', delErr);
      }
    }

    // 7. Update last_synced_at
    await supabase
      .from('broker_connections')
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('broker', 'coinbase');

    const sourceCounts = Object.values(debugCostBasis).reduce((acc, { source }) => {
      acc[source] = (acc[source] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const hasCostBasis = Object.values(debugCostBasis).some(v => v.eur > 0);
    const diagnose = hasCostBasis
      ? `Coût de revient calculé (${Object.entries(sourceCounts).map(([s, n]) => `${n}×${s}`).join(', ')})`
      : `⚠️ Aucun coût de revient trouvé — sources testées : portfolio (${portfolioCostBasis.size} résultat(s)), fills (${fillsCostBasis.size} résultat(s))`;

    return new Response(JSON.stringify({
      success: true,
      positions: positions.length,
      synced,
      message: `${positions.length} position(s) synchronisée(s). ${diagnose}`,
      debug: { costBasis: debugCostBasis, usdToEur },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sync-coinbase] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
