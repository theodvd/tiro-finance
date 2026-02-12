import { supabase } from "@/integrations/supabase/client";
import type { TRTransaction } from "./parsers/tradeRepublicParser";

/**
 * Persist Trade Republic transactions to the database.
 * 1. Ensure accounts (PEA/CTO) exist
 * 2. Ensure securities exist (by ISIN)
 * 3. Insert transactions (skip duplicates by account + security + date + shares)
 * 4. Upsert holdings with aggregated shares
 */
export async function persistTradeRepublicTransactions(
  transactions: TRTransaction[]
): Promise<{ inserted: number; skipped: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Vous devez être connecté pour importer.");

  // --- 1. Ensure accounts exist ---
  // Match existing Trade Republic accounts flexibly (name contains "Trade Republic")
  const accountTypes = [...new Set(transactions.map((t) => t.account))];
  const accountMap: Record<string, string> = {};

  for (const acctType of accountTypes) {
    const dbType = acctType === "PEA" ? "PEA" : "CTO";
    const canonicalName = acctType === "PEA" ? "Trade Republic PEA" : "Trade Republic CTO";

    // Search for any existing TR account with matching type
    const { data: existingAccounts } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("type", dbType)
      .ilike("name", "%Trade Republic%");

    if (existingAccounts && existingAccounts.length > 0) {
      // Prefer exact match, otherwise use the first one found
      const exact = existingAccounts.find((a) => a.name === canonicalName);
      accountMap[acctType] = exact ? exact.id : existingAccounts[0].id;
    } else {
      const { data: created, error } = await supabase
        .from("accounts")
        .insert({ user_id: user.id, type: dbType, name: canonicalName })
        .select("id")
        .single();
      if (error) throw new Error(`Erreur création compte ${canonicalName}: ${error.message}`);
      accountMap[acctType] = created.id;
    }
  }

  // --- 2. Ensure securities exist (by ISIN) ---
  const uniqueIsins = [...new Set(transactions.filter((t) => t.isin !== "UNKNOWN").map((t) => t.isin))];
  const securityMap: Record<string, string> = {};

  // Fetch existing securities for this user by ISIN
  const { data: existingSecurities } = await supabase
    .from("securities")
    .select("id, isin")
    .eq("user_id", user.id)
    .in("isin", uniqueIsins);

  for (const sec of existingSecurities || []) {
    if (sec.isin) securityMap[sec.isin] = sec.id;
  }

  // Create missing securities
  for (const isin of uniqueIsins) {
    if (securityMap[isin]) continue;
    const tx = transactions.find((t) => t.isin === isin)!;
    const { data: created, error } = await supabase
      .from("securities")
      .insert({
        user_id: user.id,
        isin,
        name: tx.name,
        symbol: isin, // placeholder, will be enriched later
        currency_quote: "EUR",
        pricing_source: "YFINANCE" as const,
        asset_class: "ETF" as const, // default, can be enriched
      })
      .select("id")
      .single();
    if (error) throw new Error(`Erreur création titre ${isin}: ${error.message}`);
    securityMap[isin] = created.id;
  }

  // --- 3. Insert transactions (skip duplicates) ---
  let inserted = 0;
  let skipped = 0;

  // Fetch existing transactions for dedup
  const { data: existingTx } = await supabase
    .from("transactions")
    .select("account_id, security_id, executed_at, shares, type")
    .eq("user_id", user.id);

  const existingSet = new Set(
    (existingTx || []).map((t) =>
      `${t.account_id}|${t.security_id}|${new Date(t.executed_at).toISOString().split("T")[0]}|${t.shares}|${t.type}`
    )
  );

  for (const tx of transactions) {
    if (tx.isin === "UNKNOWN") {
      skipped++;
      continue;
    }

    const accountId = accountMap[tx.account];
    const securityId = securityMap[tx.isin];
    const dbType = tx.type === "Vente" ? "SELL" : tx.type === "DCA" ? "DCA_BUY" : "BUY";
    const dateStr = tx.date;

    const key = `${accountId}|${securityId}|${dateStr}|${tx.quantity}|${dbType}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: accountId,
      security_id: securityId,
      type: dbType,
      executed_at: `${dateStr}T12:00:00Z`,
      shares: tx.quantity,
      price_eur: tx.unitPrice,
      total_eur: tx.amountEur,
      fees_eur: 0,
      notes: `Import TR - ${tx.name}`,
    });

    if (error) {
      console.error(`[TR Import] Failed to insert tx:`, tx, error);
      skipped++;
    } else {
      existingSet.add(key);
      inserted++;
    }
  }

  // --- 4. Recalculate holdings from full transaction history ---
  // Collect unique (accountId, securityId) pairs touched by this import
  const touchedPairs = new Set<string>();
  for (const tx of transactions) {
    if (tx.isin === "UNKNOWN") continue;
    const accountId = accountMap[tx.account];
    const securityId = securityMap[tx.isin];
    touchedPairs.add(`${accountId}|${securityId}`);
  }

  for (const pair of touchedPairs) {
    const [accountId, securityId] = pair.split("|");

    // Fetch ALL transactions for this (account, security, user) from DB
    const { data: allTx, error: txError } = await supabase
      .from("transactions")
      .select("type, shares, total_eur")
      .eq("user_id", user.id)
      .eq("account_id", accountId)
      .eq("security_id", securityId);

    if (txError) {
      console.error(`[TR Import] Failed to fetch transactions for recalc:`, txError);
      continue;
    }

    let totalShares = 0;
    let totalInvested = 0;
    for (const t of allTx || []) {
      if (t.type === "SELL") {
        totalShares -= Number(t.shares);
        totalInvested -= Number(t.total_eur);
      } else {
        totalShares += Number(t.shares);
        totalInvested += Number(t.total_eur);
      }
    }

    const avgPrice = totalShares > 0 ? Math.round((totalInvested / totalShares) * 100) / 100 : 0;

    // Upsert holding
    const { data: existing } = await supabase
      .from("holdings")
      .select("id")
      .eq("user_id", user.id)
      .eq("account_id", accountId)
      .eq("security_id", securityId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("holdings")
        .update({
          shares: totalShares,
          amount_invested_eur: totalInvested,
          avg_buy_price_native: avgPrice,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("holdings").insert({
        user_id: user.id,
        account_id: accountId,
        security_id: securityId,
        shares: totalShares,
        amount_invested_eur: totalInvested,
        avg_buy_price_native: avgPrice,
      });
    }
  }

  return { inserted, skipped };
}
