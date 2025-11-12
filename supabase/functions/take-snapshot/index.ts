import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

    // 1) Holdings (no nested queries)
    const { data: holdings, error: hErr } = await supabase
      .from('holdings')
      .select('id, shares, amount_invested_eur, account_id, security_id')
      .eq('user_id', user.id);

    if (hErr) throw hErr;
    if (!holdings || holdings.length === 0) {
      return new Response(JSON.stringify({ ok: true, snapshot_id: null, lines_created: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2) Latest prices via view (no nested queries)
    const securityIds = [...new Set(holdings.map(h => h.security_id).filter(Boolean))];
    const { data: latest, error: pErr } = await supabase
      .from('v_latest_market_price')
      .select('security_id, last_px_eur, updated_at')
      .in('security_id', securityIds);

    if (pErr) throw pErr;

    const priceMap = new Map<string, { px: number; ts: string }>();
    (latest ?? []).forEach(r => priceMap.set(r.security_id as string, {
      px: Number(r.last_px_eur ?? 0),
      ts: r.updated_at as string
    }));

    // 3) Get security metadata (region, sector, asset_class)
    const { data: securities, error: secErr } = await supabase
      .from('securities')
      .select('id, region, sector, asset_class')
      .in('id', securityIds);

    if (secErr) throw secErr;

    const securityMap = new Map<string, { region: string; sector: string; asset_class: string }>();
    (securities ?? []).forEach(s => securityMap.set(s.id as string, {
      region: s.region || 'Non défini',
      sector: s.sector || 'Diversifié',
      asset_class: s.asset_class || 'OTHER'
    }));

    // 4) Calculate totals and prepare lines
    let totalInvested = 0;
    let totalValue = 0;
    const lines: any[] = [];

    for (const h of holdings) {
      const px = priceMap.get(h.security_id)?.px ?? 0;
      const mv = Number(h.shares ?? 0) * px;
      const cost = Number(h.amount_invested_eur ?? 0);
      const secMeta = securityMap.get(h.security_id);

      totalInvested += cost;
      totalValue += mv;

      lines.push({
        user_id: user.id,
        account_id: h.account_id,
        security_id: h.security_id,
        shares: h.shares ?? 0,
        last_px_eur: px,
        market_value_eur: mv,
        cost_eur: cost,
        region: secMeta?.region || 'Non défini',
        sector: secMeta?.sector || 'Diversifié',
        asset_class: secMeta?.asset_class || 'OTHER'
      });
    }

    const pnl = totalValue - totalInvested;
    const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    // 5) Insert snapshot header (append-only)
    const { data: snap, error: sErr } = await supabase
      .from('snapshots')
      .insert([{
        user_id: user.id,
        total_invested_eur: totalInvested,
        total_value_eur: totalValue,
        pnl_eur: pnl,
        pnl_pct: pnlPct,
        meta: {}
      }])
      .select()
      .single();

    if (sErr) throw sErr;

    // 6) Insert snapshot lines with snapshot_id
    const withSnap = lines.map(l => ({ ...l, snapshot_id: snap.id }));
    if (withSnap.length > 0) {
      const { error: lErr } = await supabase.from('snapshot_lines').insert(withSnap);
      if (lErr) throw lErr;
    }

    console.log(`Snapshot created: ${snap.id}, ${withSnap.length} lines`);

    return new Response(JSON.stringify({ 
      ok: true, 
      snapshot_id: snap.id,
      lines_created: withSnap.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('Error in take-snapshot:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
