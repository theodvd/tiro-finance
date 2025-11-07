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

    // Parse body for optional valuation_date
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON
    }
    
    const valuationDate = body?.valuation_date ?? new Date().toISOString().slice(0, 10);

    // Fetch holdings with nested data
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select(`
        id, shares, amount_invested_eur, account_id, security_id,
        account:accounts(id, name, type),
        security:securities(id, name, symbol, market_data(last_px_eur))
      `)
      .eq('user_id', user.id);

    if (holdingsError) {
      console.error('Error fetching holdings:', holdingsError);
      return new Response(JSON.stringify({ error: holdingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create snapshot lines
    const snapshots = [];
    for (const h of (holdings as any) || []) {
      const price = Number((h.security?.market_data?.[0]?.last_px_eur || h.security?.market_data?.last_px_eur) ?? 0);
      const shares = Number(h.shares ?? 0);
      const marketValue = shares * price;
      const cost = h.amount_invested_eur ?? null;

      snapshots.push({
        user_id: user.id,
        valuation_date: valuationDate,
        account_id: h.account_id,
        security_id: h.security_id,
        shares: shares,
        last_px_eur: price,
        market_value_eur: marketValue,
        cost_eur: cost
      });
    }

    if (snapshots.length > 0) {
      const { error: insertError } = await supabase
        .from('snapshot_lines')
        .upsert(snapshots, { 
          onConflict: 'user_id,valuation_date,account_id,security_id',
          ignoreDuplicates: false 
        });

      if (insertError) {
        console.error('Error inserting snapshots:', insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      valuation_date: valuationDate,
      snapshots_created: snapshots.length 
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
