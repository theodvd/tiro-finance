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

    // 1) Fetch holdings with nested data including region and sector
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select(`
        id, shares, amount_invested_eur, account_id, security_id,
        accounts(id, name, type),
        security:securities(id, name, symbol, asset_class, region, sector)
      `)
      .eq('user_id', user.id);

    if (holdingsError) {
      console.error('Error fetching holdings:', holdingsError);
      return new Response(JSON.stringify({ error: holdingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get security IDs to fetch prices
    const securityIds = holdings?.map(h => h.security_id).filter(Boolean) || [];
    
    // Fetch market data
    const { data: marketData, error: mdError } = await supabase
      .from('market_data')
      .select('security_id, last_px_eur')
      .in('security_id', securityIds);

    if (mdError) {
      console.error('Error fetching market data:', mdError);
      return new Response(JSON.stringify({ error: mdError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build price map
    const priceMap = new Map<string, number>();
    marketData?.forEach(md => {
      priceMap.set(md.security_id, Number(md.last_px_eur || 0));
    });

    // 2) Calculate totals and prepare snapshot lines
    let totalInvested = 0;
    let totalValue = 0;
    const lines: any[] = [];

    for (const h of holdings || []) {
      const shares = Number(h.shares || 0);
      const invested = Number(h.amount_invested_eur || 0);
      const price = priceMap.get(h.security_id) || 0;
      const marketValue = shares * price;

      totalInvested += invested;
      totalValue += marketValue;

      lines.push({
        user_id: user.id,
        account_id: h.account_id || null,
        security_id: h.security_id || null,
        asset_class: (h.security as any)?.asset_class || null,
        region: (h.security as any)?.region || null,
        sector: (h.security as any)?.sector || null,
        shares: shares,
        cost_eur: invested,
        market_value_eur: marketValue,
      });
    }

    const pnl = totalValue - totalInvested;
    const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;

    // 3) Insert snapshot header (append-only, no upsert)
    const { data: snapshot, error: snapError } = await supabase
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

    if (snapError) {
      console.error('Error inserting snapshot:', snapError);
      return new Response(JSON.stringify({ error: snapError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4) Insert snapshot lines
    const linesWithSnap = lines.map(l => ({ ...l, snapshot_id: snapshot.id }));
    if (linesWithSnap.length > 0) {
      const { error: linesError } = await supabase
        .from('snapshot_lines')
        .insert(linesWithSnap);

      if (linesError) {
        console.error('Error inserting snapshot lines:', linesError);
        return new Response(JSON.stringify({ error: linesError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log(`Snapshot created: ${snapshot.id}, ${linesWithSnap.length} lines`);

    return new Response(JSON.stringify({ 
      ok: true, 
      snapshot_id: snapshot.id,
      lines_created: linesWithSnap.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in take-snapshot:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
