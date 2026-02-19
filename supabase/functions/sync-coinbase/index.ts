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

async function generateJWT(keyId: string, key: CryptoKey, method: string, path: string): Promise<string> {
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const header = { alg: 'EdDSA', kid: keyId, nonce: crypto.randomUUID(), typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: keyId,
    iss: 'cdp',
    aud: ['cdp_service'],
    nbf: now,
    exp: now + 120,
    uri: `${method} api.coinbase.com${path}`,
  };

  const headerB64 = b64url(header);
  const payloadB64 = b64url(payload);
  const message = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = await crypto.subtle.sign('Ed25519', key, message);
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

async function coinbaseFetch(key: CryptoKey, keyId: string, method: string, path: string): Promise<any> {
  const jwt = await generateJWT(keyId, key, method, path);
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

async function fetchAllTransactions(key: CryptoKey, keyId: string, accountId: string): Promise<any[]> {
  const all: any[] = [];
  let path = `/v2/accounts/${accountId}/transactions?limit=100`;
  while (path) {
    const data = await coinbaseFetch(key, keyId, 'GET', path);
    if (data.data) all.push(...data.data);
    path = data.pagination?.next_uri || null;
  }
  return all;
}

function computeCostBasis(transactions: any[]): number {
  const buyTypes = new Set(['buy', 'advanced_trade_fill', 'trade', 'fiat_deposit']);
  let total = 0;
  for (const tx of transactions) {
    if (buyTypes.has(tx.type)) {
      const amt = parseFloat(tx.native_amount?.amount || '0');
      // Buy transactions have negative native_amount (money spent), take absolute value
      if (amt < 0) total += Math.abs(amt);
      // Some formats have positive amounts for buys
      else if (tx.type === 'buy' || tx.type === 'advanced_trade_fill') total += amt;
    }
  }
  return total;
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

    // 2. Import key once, reuse for all requests
    const key = await importEdKey(creds.privateKey);
    console.log('[sync-coinbase] Key imported, fetching accounts...');

    const accountsData = await coinbaseFetch(key, creds.keyId, 'GET', '/v2/accounts?limit=100');
    const accounts = accountsData.data || [];
    console.log('[sync-coinbase] Coinbase returned', accounts.length, 'accounts');

    // 3. Filter accounts with non-zero balance
    const positions = accounts
      .filter((acc: any) => parseFloat(acc.balance?.amount || '0') > 0)
      .map((acc: any) => ({
        coinbaseId: acc.id,
        symbol: (acc.balance?.currency || acc.currency?.code || '').toUpperCase(),
        name: acc.currency?.name || acc.name,
        quantity: parseFloat(acc.balance?.amount || '0'),
        nativeValue: parseFloat(acc.native_balance?.amount || '0'),
        nativeCurrency: acc.native_balance?.currency || 'EUR',
      }));

    console.log('[sync-coinbase] Positions with balance:', positions.length);

    // 4. Find or create the CRYPTO account named "Coinbase"
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

    for (const pos of positions) {
      // 5. Fetch transaction history to compute cost basis
      let costBasis = 0;
      try {
        const transactions = await fetchAllTransactions(key, creds.keyId, pos.coinbaseId);
        costBasis = computeCostBasis(transactions);
        console.log(`[sync-coinbase] ${pos.symbol}: ${transactions.length} txs, cost basis = ${costBasis}`);
      } catch (e) {
        console.warn(`[sync-coinbase] Could not fetch txs for ${pos.symbol}, using native_balance:`, e);
        costBasis = pos.nativeValue;
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

      // Find or update holding
      let { data: holding } = await supabase
        .from('holdings')
        .select('id')
        .eq('user_id', user.id)
        .eq('account_id', cbAccount!.id)
        .eq('security_id', security!.id)
        .maybeSingle();

      const holdingData = {
        shares: pos.quantity,
        amount_invested_eur: costBasis,
      };

      if (holding) {
        const { error: updErr } = await supabase
          .from('holdings')
          .update(holdingData)
          .eq('id', holding.id);
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

    // 6. Update last_synced_at
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
