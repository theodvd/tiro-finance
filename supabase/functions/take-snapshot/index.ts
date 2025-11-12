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

    const body = await req.json().catch(() => ({}));
    const valuationDate = body?.valuation_date ?? new Date().toISOString().slice(0, 10);

    // Fetch holdings with nested security and market_data
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select(`
        id, shares, amount_invested_eur, account_id, security_id,
        security:securities(
          id,
          market_data(last_px_eur)
        )
      `)
      .eq('user_id', user.id);

    if (holdingsError) {
      console.error('Error fetching holdings:', holdingsError);
      return new Response(JSON.stringify({ error: holdingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let linesCreated = 0;

    for (const h of holdings ?? []) {
      const px = Number((h.security as any)?.market_data?.[0]?.last_px_eur ?? 0);
      const mv = Number(h.shares ?? 0) * px;
      const cost = h.amount_invested_eur ?? null;

      const { error: upsertError } = await supabase.from('snapshot_lines').upsert({
        user_id: user.id,
        valuation_date: valuationDate,
        account_id: h.account_id,
        security_id: h.security_id,
        shares: h.shares ?? 0,
        last_px_eur: px,
        market_value_eur: mv,
        cost_eur: cost
      }, { 
        onConflict: 'user_id,valuation_date,account_id,security_id' 
      });

      if (upsertError) {
        console.error('Snapshot line upsert error:', upsertError.message);
      } else {
        linesCreated++;
      }
    }

    console.log(`Snapshot created: ${valuationDate}, ${linesCreated} lines`);

    return new Response(JSON.stringify({ 
      ok: true, 
      valuation_date: valuationDate,
      lines_created: linesCreated
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
