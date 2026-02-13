import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function generateCoinbaseJWT(keyName: string, privateKeyPem: string): Promise<string> {
  const pemBody = privateKeyPem
    .replace(/-----BEGIN EC PRIVATE KEY-----/, '')
    .replace(/-----END EC PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const header = { alg: 'ES256', kid: keyName, nonce: crypto.randomUUID(), typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: keyName,
    iss: 'cdp',
    aud: ['cdp_service'],
    nbf: now,
    exp: now + 120,
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);
  const message = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    message
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${sigB64}`;
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

    const creds = connection.credentials as { name: string; privateKey: string };
    if (!creds?.name || !creds?.privateKey) throw new Error('Invalid Coinbase credentials');

    // 2. Generate JWT and call Coinbase API
    const jwt = await generateCoinbaseJWT(creds.name, creds.privateKey);
    console.log('[sync-coinbase] JWT generated, calling Coinbase API...');

    const accountsRes = await fetch('https://api.coinbase.com/v2/accounts?limit=100', {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (!accountsRes.ok) {
      const errBody = await accountsRes.text();
      console.error('[sync-coinbase] Coinbase API error:', accountsRes.status, errBody);
      throw new Error(`Coinbase API error: ${accountsRes.status}`);
    }

    const accountsData = await accountsRes.json();
    const accounts = accountsData.data || [];
    console.log('[sync-coinbase] Coinbase returned', accounts.length, 'accounts');

    // 3. Filter accounts with non-zero balance
    const positions = accounts
      .filter((acc: any) => parseFloat(acc.balance?.amount || '0') > 0)
      .map((acc: any) => ({
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

      if (holding) {
        const { error: updErr } = await supabase
          .from('holdings')
          .update({
            shares: pos.quantity,
            amount_invested_eur: pos.nativeValue,
          })
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
            shares: pos.quantity,
            amount_invested_eur: pos.nativeValue,
          });
        if (insErr) {
          console.error('[sync-coinbase] Holding insert error:', insErr);
          continue;
        }
      }

      synced++;
    }

    // 5. Update last_synced_at
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
