import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DcaPlan {
  id: string;
  user_id: string;
  account_id: string;
  security_id: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'interval';
  interval_days: number | null;
  weekday: number | null;
  monthday: number | null;
  start_date: string;
  next_execution_date: string | null;
  active: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`[DCA] Checking plans for ${todayStr}`);

    // Fetch all active DCA plans
    const { data: plans, error: plansError } = await supabase
      .from('dca_plans')
      .select('*')
      .eq('active', true);

    if (plansError) {
      console.error('[DCA] Error fetching plans:', plansError);
      throw plansError;
    }

    console.log(`[DCA] Found ${plans?.length || 0} active plans`);

    const executedPlans: any[] = [];
    const errors: any[] = [];

    for (const plan of plans || []) {
      try {
        const shouldExecute = checkIfShouldExecute(plan as DcaPlan, today);

        if (shouldExecute) {
          console.log(`[DCA] Executing plan ${plan.id} for user ${plan.user_id}`);

          // Fetch current security price
          const { data: marketData } = await supabase
            .from('market_data')
            .select('last_px_eur')
            .eq('security_id', plan.security_id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const priceEur = marketData?.last_px_eur || 0;
          const shares = priceEur > 0 ? plan.amount / priceEur : 0;

          if (shares <= 0) {
            console.warn(`[DCA] Plan ${plan.id}: Invalid price (${priceEur}), skipping`);
            errors.push({
              plan_id: plan.id,
              error: 'Invalid or missing market price',
            });
            continue;
          }

          // Check if holding exists
          const { data: existingHolding } = await supabase
            .from('holdings')
            .select('id, shares, amount_invested_eur')
            .eq('user_id', plan.user_id)
            .eq('account_id', plan.account_id)
            .eq('security_id', plan.security_id)
            .maybeSingle();

          if (existingHolding) {
            // Update existing holding
            const newShares = Number(existingHolding.shares) + shares;
            const newInvested = Number(existingHolding.amount_invested_eur || 0) + plan.amount;

            const { error: updateError } = await supabase
              .from('holdings')
              .update({
                shares: newShares,
                amount_invested_eur: newInvested,
              })
              .eq('id', existingHolding.id);

            if (updateError) throw updateError;
          } else {
            // Create new holding
            const { error: insertError } = await supabase
              .from('holdings')
              .insert({
                user_id: plan.user_id,
                account_id: plan.account_id,
                security_id: plan.security_id,
                shares: shares,
                amount_invested_eur: plan.amount,
              });

            if (insertError) throw insertError;
          }

          // Calculate next execution date
          const nextExecution = calculateNextExecution(plan as DcaPlan, today);

          // Update plan's next execution date
          const { error: updatePlanError } = await supabase
            .from('dca_plans')
            .update({ next_execution_date: nextExecution })
            .eq('id', plan.id);

          if (updatePlanError) throw updatePlanError;

          executedPlans.push({
            plan_id: plan.id,
            user_id: plan.user_id,
            amount: plan.amount,
            shares: shares,
            price: priceEur,
            next_execution: nextExecution,
          });

          console.log(`[DCA] Plan ${plan.id} executed successfully`);
        }
      } catch (error: any) {
        console.error(`[DCA] Error executing plan ${plan.id}:`, error);
        errors.push({
          plan_id: plan.id,
          error: error.message,
        });
      }
    }

    console.log(`[DCA] Execution complete: ${executedPlans.length} executed, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        executed: executedPlans.length,
        errors: errors.length,
        details: {
          executed_plans: executedPlans,
          errors: errors,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[DCA] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function checkIfShouldExecute(plan: DcaPlan, today: Date): boolean {
  const startDate = new Date(plan.start_date);
  startDate.setHours(0, 0, 0, 0);

  // Not yet started
  if (today < startDate) {
    return false;
  }

  // Check if already executed today
  if (plan.next_execution_date) {
    const nextExec = new Date(plan.next_execution_date);
    nextExec.setHours(0, 0, 0, 0);
    if (today < nextExec) {
      return false;
    }
  }

  switch (plan.frequency) {
    case 'weekly':
      // Check if today's weekday matches
      const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
      return dayOfWeek === plan.weekday;

    case 'monthly':
      // Check if today's day of month matches
      const dayOfMonth = today.getDate();
      return dayOfMonth === plan.monthday;

    case 'interval':
      if (!plan.interval_days) return false;
      const daysSinceStart = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceStart % plan.interval_days === 0;

    default:
      return false;
  }
}

function calculateNextExecution(plan: DcaPlan, executedDate: Date): string {
  const next = new Date(executedDate);
  next.setHours(0, 0, 0, 0);

  switch (plan.frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      // Handle edge case where day doesn't exist in next month
      if (plan.monthday && plan.monthday > 28) {
        const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(plan.monthday, lastDay));
      }
      break;

    case 'interval':
      if (plan.interval_days) {
        next.setDate(next.getDate() + plan.interval_days);
      }
      break;
  }

  return next.toISOString().split('T')[0];
}
