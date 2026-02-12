import { supabase } from "@/integrations/supabase/client";
import type { TRTransaction } from "./parsers/tradeRepublicParser";

export interface HoldingDelta {
  name: string;
  isin: string;
  account: string;
  currentShares: number;
  currentInvested: number;
  newShares: number;
  newInvested: number;
  deltaShares: number;
  deltaInvested: number;
}

export interface ImportDiff {
  newTransactions: TRTransaction[];
  skippedTransactions: TRTransaction[];
  holdingDeltas: HoldingDelta[];
}

export async function computeTradeRepublicDiff(
  transactions: TRTransaction[]
): Promise<ImportDiff> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  // --- Resolve account IDs ---
  const accountTypes = [...new Set(transactions.map((t) => t.account))];
  const accountMap: Record<string, string> = {};
  const accountNames: Record<string, string> = {};

  for (const acctType of accountTypes) {
    const dbType = acctType === "PEA" ? "PEA" : "CTO";
    const { data: existing } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("type", dbType)
      .ilike("name", "%Trade Republic%");

    if (existing && existing.length > 0) {
      accountMap[acctType] = existing[0].id;
      accountNames[acctType] = existing[0].name;
    } else {
      // Account doesn't exist yet — will be created on import
      accountMap[acctType] = `NEW_${acctType}`;
      accountNames[acctType] = `Trade Republic ${acctType}`;
    }
  }

  // --- Resolve security IDs ---
  const uniqueIsins = [...new Set(transactions.filter((t) => t.isin !== "UNKNOWN").map((t) => t.isin))];
  const securityMap: Record<string, string> = {};

  const { data: existingSecurities } = await supabase
    .from("securities")
    .select("id, isin")
    .eq("user_id", user.id)
    .in("isin", uniqueIsins);

  for (const sec of existingSecurities || []) {
    if (sec.isin) securityMap[sec.isin] = sec.id;
  }

  // --- Fetch existing transactions for dedup ---
  const { data: existingTx } = await supabase
    .from("transactions")
    .select("account_id, security_id, executed_at, shares, type")
    .eq("user_id", user.id);

  const existingSet = new Set(
    (existingTx || []).map((t) =>
      `${t.account_id}|${t.security_id}|${new Date(t.executed_at).toISOString().split("T")[0]}|${t.shares}|${t.type}`
    )
  );

  // --- Classify new vs skipped ---
  const newTransactions: TRTransaction[] = [];
  const skippedTransactions: TRTransaction[] = [];

  for (const tx of transactions) {
    if (tx.isin === "UNKNOWN") {
      skippedTransactions.push(tx);
      continue;
    }

    const accountId = accountMap[tx.account];
    const securityId = securityMap[tx.isin];
    if (!securityId || accountId?.startsWith("NEW_")) {
      // New security or new account — always new
      newTransactions.push(tx);
      continue;
    }

    const dbType = tx.type === "Vente" ? "SELL" : tx.type === "DCA" ? "DCA_BUY" : "BUY";
    const key = `${accountId}|${securityId}|${tx.date}|${tx.quantity}|${dbType}`;
    if (existingSet.has(key)) {
      skippedTransactions.push(tx);
    } else {
      newTransactions.push(tx);
    }
  }

  // --- Compute holding deltas ---
  // Group new transactions by (account, isin)
  const impactMap: Record<string, { txs: TRTransaction[]; account: string }> = {};
  for (const tx of newTransactions) {
    const key = `${tx.account}|${tx.isin}`;
    if (!impactMap[key]) impactMap[key] = { txs: [], account: tx.account };
    impactMap[key].txs.push(tx);
  }

  const holdingDeltas: HoldingDelta[] = [];

  for (const [key, { txs, account }] of Object.entries(impactMap)) {
    const isin = key.split("|")[1];
    const accountId = accountMap[account];
    const securityId = securityMap[isin];

    // Current holding state
    let currentShares = 0;
    let currentInvested = 0;

    if (securityId && !accountId?.startsWith("NEW_")) {
      const { data: holding } = await supabase
        .from("holdings")
        .select("shares, amount_invested_eur")
        .eq("user_id", user.id)
        .eq("account_id", accountId)
        .eq("security_id", securityId)
        .maybeSingle();

      if (holding) {
        currentShares = Number(holding.shares);
        currentInvested = Number(holding.amount_invested_eur || 0);
      }
    }

    // Delta from new transactions
    let deltaShares = 0;
    let deltaInvested = 0;
    for (const tx of txs) {
      if (tx.type === "Vente") {
        deltaShares -= tx.quantity;
        deltaInvested -= tx.amountEur;
      } else {
        deltaShares += tx.quantity;
        deltaInvested += tx.amountEur;
      }
    }

    holdingDeltas.push({
      name: txs[0].name,
      isin,
      account: accountNames[account] || account,
      currentShares,
      currentInvested,
      newShares: currentShares + deltaShares,
      newInvested: currentInvested + deltaInvested,
      deltaShares,
      deltaInvested,
    });
  }

  // Sort by absolute delta invested descending
  holdingDeltas.sort((a, b) => Math.abs(b.deltaInvested) - Math.abs(a.deltaInvested));

  return { newTransactions, skippedTransactions, holdingDeltas };
}
