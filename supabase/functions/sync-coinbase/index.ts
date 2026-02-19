import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function importEdKey(privateKeyB64: string): Promise<CryptoKey> {
  const rawBytes = Uint8Array.from(atob(privateKeyB64), c => c.charCodeAt(0));
  const seed = rawBytes.slice(0, 32);
  const pkcs8Prefix = new Uint8Array([
    0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
    0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20,
  ]);
  const pkcs8Key = new Uint8Array([...pkcs8Prefix, ...seed]);
  return crypto.subtle.importKey('pkcs8', pkcs8Key, { name: 'Ed25519' }, false, ['sign']);
}

async function importEcKey(privateKeyB64: string): Promise<CryptoKey> {
  const rawBytes = Uint8Array.from(atob(privateKeyB64), c => c.charCodeAt(0));
  // Try PKCS8 import directly (the base64 might be a full PKCS8 DER)
  return crypto.subtle.importKey(
    'pkcs8',
    rawBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
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

async function detectAndImportKey(privateKeyB64: string): Promise<KeyInfo> {
  // Try Ed25519 first (most common for CDP keys)
  try {
    const key = await importEdKey(privateKeyB64);
    return { key, alg: 'EdDSA' };
  } catch (_) {
    // Ignore
  }
  // Try ECDSA P-256
  try {
    const key = await importEcKey(privateKeyB64);
    return { key, alg: 'ES256' };
  } catch (_) {
    // Ignore
  }
  throw new Error('Could not import private key as Ed25519 or ES256');
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

async function fetchAllFillsForProduct(
  key: CryptoKey,
  alg: string,
  keyId: string,
  productId: string
): Promise<any[]> {
  const all: any[] = [];
  let cursor = '';
  const limit = 100;
  let page = 0;
  while (page < 10) { // max 10 pages safety
    let path = `/api/v3/brokerage/orders/historical/fills?product_id=${productId}&limit=${limit}`;
    if (cursor) path += `&cursor=${cursor}`;
    const data = await coinbaseFetch(key, alg, keyId, 'GET', path);
    if (data.fills) all.push(...data.fills);
    if (!data.cursor || data.fills?.length < limit) break;
    cursor = data.cursor;
    page++;
  }
  return all;
}

// Try multiple quote currencies to find all fills regardless of how the asset was purchased
async function fetchAllFills(
  key: CryptoKey,
  alg: string,
  keyId: string,
  symbol: string
): Promise<any[]> {
  const quoteCurrencies = ['EUR', 'USD', 'USDC', 'USDT'];
  const allFills: any[] = [];
  for (const quote of quoteCurrencies) {
    const productId = `${symbol}-${quote}`;
    try {
      const fills = await fetchAllFillsForProduct(key, alg, keyId, productId);
      if (fills.length > 0) {
        console.log(`[sync-coinbase] Found ${fills.length} fills for ${productId}`);
        allFills.push(...fills);
      }
    } catch (_) {
      // Pair doesn't exist or no fills — skip silently
    }
  }
  return allFills;
}

function computeCostBasisFromFills(fills: any[], targetCurrency = 'EUR'): number {
  // Separate fills by quote currency
  const eurFills = fills.filter(f => (f.product_id || '').endsWith('-EUR'));
  const otherFills = fills.filter(f => !(f.product_id || '').endsWith('-EUR'));

  let totalCost = 0;

  // EUR fills: use price directly
  for (const fill of eurFills) {
    if (fill.side === 'BUY') {
      const price = parseFloat(fill.price || '0');
      const size = parseFloat(fill.size || '0');
      const commission = parseFloat(fill.commission || '0');
      totalCost += price * size + commission;
    }
  }

  // Non-EUR fills (USD, USDC, USDT): approximate EUR using a fixed 1:1 rate for stablecoins
  // For USD we use a rough 0.92 EUR/USD rate — this is an approximation
  for (const fill of otherFills) {
    if (fill.side === 'BUY') {
      const price = parseFloat(fill.price || '0');
      const size = parseFloat(fill.size || '0');
      const commission = parseFloat(fill.commission || '0');
      const quote = (fill.product_id || '').split('-').pop() || '';
      // Stablecoins pegged to USD: treat as 1 USD = 0.92 EUR (conservative estimate)
      const fxRate = (quote === 'USDC' || quote === 'USDT') ? 0.92 : (quote === 'USD' ? 0.92 : 1);
      totalCost += (price * size + commission) * fxRate;
    }
  }

  return totalCost;
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

    // 5. Find or create the CRYPTO account named "Coinbase"
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

    for (const pos of positions) {
      // 6. Fetch trade fills across all pairs to compute cost basis
      let costBasis = 0;
      let fillsFound = false;
      try {
        const fills = await fetchAllFills(key, alg, creds.keyId, pos.symbol);
        if (fills.length > 0) {
          costBasis = computeCostBasisFromFills(fills);
          fillsFound = true;
          console.log(`[sync-coinbase] ${pos.symbol}: ${fills.length} fills total, cost basis = ${costBasis.toFixed(2)} EUR`);
        } else {
          console.warn(`[sync-coinbase] ${pos.symbol}: no fills found across all pairs`);
        }
      } catch (e) {
        console.warn(`[sync-coinbase] Could not compute cost basis for ${pos.symbol}:`, e);
      }

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

      // Only update cost basis if we actually found fills; otherwise preserve existing value
      const existingCostBasis = holding ? Number((holding as any).amount_invested_eur || 0) : 0;
      const finalCostBasis = fillsFound ? costBasis : existingCostBasis;

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

    return new Response(JSON.stringify({
      success: true,
      positions: positions.length,
      synced,
      message: `${positions.length} position(s) crypto synchronisée(s) depuis Coinbase.`,
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
