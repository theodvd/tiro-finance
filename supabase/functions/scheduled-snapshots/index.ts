import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use service role key for cron-triggered functions (no user auth)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface HoldingData {
  id: string;
  shares: number;
  amount_invested_eur: number;
  account_id: string;
  security_id: string;
  user_id: string;
}

interface PriceData {
  security_id: string;
  last_px_eur: number;
  updated_at: string;
}

interface SecurityData {
  id: string;
  region: string | null;
  sector: string | null;
  asset_class: string;
}

async function createSnapshotForUser(userId: string, snapshotType: 'weekly' | 'monthly'): Promise<{ success: boolean; snapshotId?: string; error?: string }> {
  try {
    // Check for duplicate snapshot in the current period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (snapshotType === 'weekly') {
      // Get the start of the current week (Sunday)
      const dayOfWeek = now.getDay();
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - dayOfWeek);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 7);
    } else {
      // Get the start of the current month
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    // Check if snapshot already exists for this period
    const { data: existing } = await supabase
      .from('snapshots')
      .select('id')
      .eq('user_id', userId)
      .eq('snapshot_type', snapshotType)
      .gte('snapshot_ts', periodStart.toISOString())
      .lt('snapshot_ts', periodEnd.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Snapshot ${snapshotType} already exists for user ${userId} in this period`);
      return { success: true, snapshotId: existing[0].id };
    }

    // Get user holdings
    const { data: holdings, error: hErr } = await supabase
      .from('holdings')
      .select('id, shares, amount_invested_eur, account_id, security_id, user_id')
      .eq('user_id', userId);

    if (hErr) throw hErr;
    if (!holdings || holdings.length === 0) {
      console.log(`No holdings for user ${userId}, skipping snapshot`);
      return { success: true };
    }

    // Get latest prices
    const securityIds = [...new Set(holdings.map(h => h.security_id).filter(Boolean))];
    const { data: prices, error: pErr } = await supabase
      .from('v_latest_market_price')
      .select('security_id, last_px_eur, updated_at')
      .in('security_id', securityIds);

    if (pErr) throw pErr;

    const priceMap = new Map<string, { px: number; ts: string }>();
    (prices ?? []).forEach((r: PriceData) => priceMap.set(r.security_id, {
      px: Number(r.last_px_eur ?? 0),
      ts: r.updated_at
    }));

    // Get security metadata
    const { data: securities, error: secErr } = await supabase
      .from('securities')
      .select('id, region, sector, asset_class')
      .in('id', securityIds);

    if (secErr) throw secErr;

    const securityMap = new Map<string, { region: string; sector: string; asset_class: string }>();
    (securities ?? []).forEach((s: SecurityData) => securityMap.set(s.id, {
      region: s.region || 'Non défini',
      sector: s.sector || 'Diversifié',
      asset_class: s.asset_class || 'OTHER'
    }));

    // Calculate totals
    let totalInvested = 0;
    let totalValue = 0;
    const lines: any[] = [];

    for (const h of holdings as HoldingData[]) {
      const px = priceMap.get(h.security_id)?.px ?? 0;
      const mv = Number(h.shares ?? 0) * px;
      const cost = Number(h.amount_invested_eur ?? 0);
      const secMeta = securityMap.get(h.security_id);

      totalInvested += cost;
      totalValue += mv;

      lines.push({
        user_id: userId,
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

    // Insert snapshot
    const { data: snap, error: sErr } = await supabase
      .from('snapshots')
      .insert([{
        user_id: userId,
        total_invested_eur: totalInvested,
        total_value_eur: totalValue,
        pnl_eur: pnl,
        pnl_pct: pnlPct,
        snapshot_type: snapshotType,
        meta: { 
          generated_at: now.toISOString(),
          type: snapshotType 
        }
      }])
      .select()
      .single();

    if (sErr) throw sErr;

    // Insert snapshot lines
    const withSnap = lines.map(l => ({ ...l, snapshot_id: snap.id }));
    if (withSnap.length > 0) {
      const { error: lErr } = await supabase.from('snapshot_lines').insert(withSnap);
      if (lErr) throw lErr;
    }

    console.log(`Created ${snapshotType} snapshot ${snap.id} for user ${userId} with ${withSnap.length} lines`);
    return { success: true, snapshotId: snap.id };

  } catch (error: any) {
    console.error(`Error creating snapshot for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  const authHeader = req.headers.get('Authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse request body for snapshot type
    let snapshotType: 'weekly' | 'monthly' = 'weekly';
    try {
      const body = await req.json();
      if (body.type === 'monthly') {
        snapshotType = 'monthly';
      }
    } catch {
      // Default to weekly if no body
    }

    console.log(`Running ${snapshotType} snapshot job at ${new Date().toISOString()}`);

    // Get all users with holdings
    const { data: users, error: uErr } = await supabase
      .from('holdings')
      .select('user_id')
      .limit(1000);

    if (uErr) throw uErr;

    // Get unique user IDs
    const uniqueUserIds = [...new Set((users ?? []).map(u => u.user_id))];
    console.log(`Found ${uniqueUserIds.length} users with holdings`);

    const results = {
      total: uniqueUserIds.length,
      success: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each user
    for (const userId of uniqueUserIds) {
      const result = await createSnapshotForUser(userId, snapshotType);
      if (result.success) {
        if (result.snapshotId) {
          results.success++;
        } else {
          results.skipped++;
        }
      } else {
        results.failed++;
        results.errors.push(`User ${userId}: ${result.error}`);
      }
    }

    console.log(`Snapshot job completed: ${results.success} created, ${results.skipped} skipped, ${results.failed} failed`);

    return new Response(JSON.stringify({
      ok: true,
      snapshot_type: snapshotType,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in scheduled-snapshots:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
