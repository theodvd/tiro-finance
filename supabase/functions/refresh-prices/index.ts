// supabase/functions/refresh-prices/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Security = {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  asset_class: string;
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

// Check if a DCA plan should execute today or has missed executions
function shouldExecuteDca(plan: DcaPlan, today: Date): boolean {
  const startDate = new Date(plan.start_date);
  startDate.setHours(0, 0, 0, 0);
  
  // Not yet started
  if (today < startDate) return false;
  
  // If next_execution_date is set and in the future, don't execute
  if (plan.next_execution_date) {
    const nextExec = new Date(plan.next_execution_date);
    nextExec.setHours(0, 0, 0, 0);
    if (today < nextExec) return false;
  }
  
  // Check based on frequency
  switch (plan.frequency) {
    case 'weekly':
      return today.getDay() === plan.weekday;
    case 'monthly':
      return today.getDate() === plan.monthday;
    case 'interval':
      if (!plan.interval_days) return false;
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceStart % plan.interval_days === 0;
    default:
      return false;
  }
}

// Calculate the next execution date based on frequency
function calculateNextExecution(plan: DcaPlan, executedDate: Date): string {
  const next = new Date(executedDate);
  next.setHours(0, 0, 0, 0);
  
  switch (plan.frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
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

// Check for missed DCA executions and execute them
function getMissedExecutionDates(plan: DcaPlan, today: Date): Date[] {
  const missedDates: Date[] = [];
  const startDate = new Date(plan.start_date);
  startDate.setHours(0, 0, 0, 0);
  
  // Start from next_execution_date if set, otherwise start_date
  let checkDate = plan.next_execution_date 
    ? new Date(plan.next_execution_date) 
    : new Date(startDate);
  checkDate.setHours(0, 0, 0, 0);
  
  // Don't go before start date
  if (checkDate < startDate) checkDate = new Date(startDate);
  
  while (checkDate <= today) {
    let shouldAdd = false;
    
    switch (plan.frequency) {
      case 'weekly':
        if (checkDate.getDay() === plan.weekday) shouldAdd = true;
        break;
      case 'monthly':
        if (checkDate.getDate() === plan.monthday) shouldAdd = true;
        break;
      case 'interval':
        if (plan.interval_days) {
          const daysSinceStart = Math.floor((checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceStart % plan.interval_days === 0) shouldAdd = true;
        }
        break;
    }
    
    if (shouldAdd) {
      missedDates.push(new Date(checkDate));
    }
    
    // Move to next day
    checkDate.setDate(checkDate.getDate() + 1);
  }
  
  return missedDates;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  try {
    // 1) Récupérer les securities de l'utilisateur
    const { data: secs, error: secErr } = await supabase
      .from("securities")
      .select("id,user_id,symbol,name,asset_class")
      .eq("user_id", user.id);

    if (secErr) throw secErr;

    const cryptos = (secs ?? []).filter((s) => (s.asset_class || "").toUpperCase() === "CRYPTO");
    const nonCryptos = (secs ?? []).filter((s) => (s.asset_class || "").toUpperCase() !== "CRYPTO");

    const nowIso = new Date().toISOString();

    // 2) Refresh non-crypto prices via Yahoo Finance
    if (nonCryptos.length > 0) {
      console.log(`[Yahoo Finance] Fetching prices for ${nonCryptos.length} securities`);
      
      for (const security of nonCryptos) {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${security.symbol}`;
          const res = await fetch(url);
          
          if (!res.ok) {
            console.error(`[Yahoo Finance] Error for ${security.symbol}: ${res.status}`);
            continue;
          }
          
          const data = await res.json();
          const quote = data?.chart?.result?.[0]?.meta;
          
          if (!quote || !quote.regularMarketPrice) {
            console.error(`[Yahoo Finance] No price data for ${security.symbol}`);
            continue;
          }
          
          const price = quote.regularMarketPrice;
          const currency = quote.currency || "USD";
          
          // Convert to EUR if needed
          let priceEur = price;
          let fxRate = 1.0;
          
          if (currency !== "EUR") {
            const fxUrl = `https://api.frankfurter.app/latest?from=${currency}&to=EUR`;
            const fxRes = await fetch(fxUrl);
            
            if (fxRes.ok) {
              const fxData = await fxRes.json();
              fxRate = fxData.rates.EUR || 1.0;
              priceEur = price * fxRate;
            }
          }
          
          await supabase.from("market_data").upsert({
            security_id: security.id,
            native_ccy: currency,
            last_px_native: price,
            eur_fx: fxRate,
            last_px_eur: priceEur,
            last_close_dt: nowIso,
            updated_at: nowIso,
          }, { onConflict: "security_id" });
          
          console.log(`[Yahoo Finance] Updated ${security.symbol}: ${priceEur.toFixed(2)} EUR`);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[Yahoo Finance] Error processing ${security.symbol}:`, error);
        }
      }
    }

    // 3) Fetch crypto prices using CryptoCompare
    if (cryptos.length > 0) {
      const symbols = Array.from(new Set(cryptos.map((s) => s.symbol?.toUpperCase?.()).filter(Boolean)));

      if (symbols.length > 0) {
        const fsyms = symbols.join(",");
        const url = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms}&tsyms=EUR`;
        console.log(`[CryptoCompare] Fetching prices for: ${fsyms}`);
        
        const res = await fetch(url, { headers: { accept: "application/json" } });
        const responseText = await res.text();
        
        if (!res.ok) {
          console.error(`[CryptoCompare] API error ${res.status}: ${responseText}`);
          throw new Error(`CryptoCompare error: ${res.status} ${responseText}`);
        }
        
        const prices = JSON.parse(responseText);
        console.log(`[CryptoCompare] Response:`, JSON.stringify(prices));

        const rows = cryptos
          .map((s) => {
            const symbol = s.symbol.toUpperCase();
            const px = prices?.[symbol]?.EUR ?? null;
            return px
              ? {
                  security_id: s.id,
                  native_ccy: "EUR",
                  last_px_native: px,
                  eur_fx: 1,
                  last_px_eur: px,
                  last_close_dt: nowIso,
                  updated_at: nowIso,
                }
              : null;
          })
          .filter(Boolean) as any[];

        if (rows.length > 0) {
          const { error: upsertErr } = await supabase
            .from("market_data")
            .upsert(rows, { onConflict: "security_id" });
          if (upsertErr) throw upsertErr;
        }
      }
    }

    // 4) Execute pending DCA plans for this user
    const dcaResults: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: dcaPlans, error: dcaErr } = await supabase
      .from("dca_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true);
    
    if (dcaErr) {
      console.error("[DCA] Error fetching plans:", dcaErr);
    } else if (dcaPlans && dcaPlans.length > 0) {
      console.log(`[DCA] Found ${dcaPlans.length} active plans for user`);
      
      for (const plan of dcaPlans) {
        const missedDates = getMissedExecutionDates(plan as DcaPlan, today);
        
        if (missedDates.length === 0) {
          console.log(`[DCA] Plan ${plan.id}: No executions needed`);
          continue;
        }
        
        console.log(`[DCA] Plan ${plan.id}: ${missedDates.length} execution(s) to process`);
        
        // Get current market price for this security
        const { data: marketData } = await supabase
          .from("market_data")
          .select("last_px_eur")
          .eq("security_id", plan.security_id)
          .maybeSingle();
        
        const priceEur = marketData?.last_px_eur || 0;
        
        if (priceEur <= 0) {
          console.warn(`[DCA] Plan ${plan.id}: No valid price, skipping`);
          continue;
        }
        
        // Execute for each missed date
        for (const execDate of missedDates) {
          const shares = plan.amount / priceEur;
          
          // Check if holding exists
          const { data: existingHolding } = await supabase
            .from("holdings")
            .select("id, shares, amount_invested_eur")
            .eq("user_id", user.id)
            .eq("account_id", plan.account_id)
            .eq("security_id", plan.security_id)
            .maybeSingle();
          
          if (existingHolding) {
            // Update existing holding
            const newShares = Number(existingHolding.shares) + shares;
            const newInvested = Number(existingHolding.amount_invested_eur || 0) + plan.amount;
            
            const { error: updateError } = await supabase
              .from("holdings")
              .update({
                shares: newShares,
                amount_invested_eur: newInvested,
              })
              .eq("id", existingHolding.id);
            
            if (updateError) {
              console.error(`[DCA] Error updating holding:`, updateError);
              continue;
            }
          } else {
            // Create new holding
            const { error: insertError } = await supabase
              .from("holdings")
              .insert({
                user_id: user.id,
                account_id: plan.account_id,
                security_id: plan.security_id,
                shares: shares,
                amount_invested_eur: plan.amount,
              });
            
            if (insertError) {
              console.error(`[DCA] Error creating holding:`, insertError);
              continue;
            }
          }
          
          dcaResults.push({
            plan_id: plan.id,
            execution_date: execDate.toISOString().split('T')[0],
            amount: plan.amount,
            shares: shares,
            price: priceEur,
          });
          
          console.log(`[DCA] Executed plan ${plan.id} for ${execDate.toISOString().split('T')[0]}: ${shares.toFixed(6)} shares @ ${priceEur.toFixed(2)} EUR`);
        }
        
        // Update next execution date to the day after the last missed date
        const lastExecDate = missedDates[missedDates.length - 1];
        const nextExecution = calculateNextExecution(plan as DcaPlan, lastExecDate);
        
        await supabase
          .from("dca_plans")
          .update({ next_execution_date: nextExecution })
          .eq("id", plan.id);
        
        console.log(`[DCA] Plan ${plan.id}: Next execution set to ${nextExecution}`);
      }
    }

    return new Response(JSON.stringify({ 
      ok: true,
      dca_executed: dcaResults.length,
      dca_details: dcaResults
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[refresh-prices]", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
