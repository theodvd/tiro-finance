

# Fix Coinbase Cost Basis: Use Dedicated Buys Endpoint + Missing Transaction Types

## Diagnostic

From the edge function logs, the problem is clear:

```text
BTC account: types=[buy, subscription, incentives_rewards_payout] → 19 buys → 1912€ ✅
ETH account: types=[staking_transfer, staking_reward]            → 0 buys  → 1.39€ ❌
SOL account: types=[staking_reward, staking_transfer]            → 0 buys  → 0.92€ ❌
EURC account: types=[retail_simple_price_improvement]            → 0 buys  → 0.00€ ❌
```

ETH and SOL have real holdings worth ~297€ and ~90€ respectively, but cost basis only captures staking rewards (1.39€ and 0.92€). The actual purchase transactions are **not appearing** in the v2 transactions endpoint for those accounts.

Note: The International Exchange API docs you linked are for Coinbase derivatives/futures trading, not the retail Coinbase App. That API is not applicable here.

## Root Causes

1. **Missing dedicated Buys endpoint**: Coinbase has a separate `/v2/accounts/:id/buys` endpoint that returns the actual purchase history with fiat amounts. This is different from the generic transactions endpoint and specifically designed for buy history. The current code only uses `/v2/accounts/:id/transactions`.

2. **Missing `subscription` type**: BTC account shows `subscription` type (recurring buys) but this isn't in `ACQUISITION_TYPES`. While BTC still works because it also has `buy` type entries, other accounts might rely on `subscription` type only.

3. **Possible Advanced Trade routing**: Newer recurring buys may go through Advanced Trade internally. The v3 fills endpoint returned 0 results, but we should also try the `/v2/accounts/:id/buys` endpoint which should aggregate all purchase methods.

## Plan

### 1. Edge Function: Add Buys endpoint as primary cost basis source

**File: `supabase/functions/sync-coinbase/index.ts`**

Add a new `fetchV2Buys` function that calls `GET /v2/accounts/:id/buys` (paginated). Each buy object contains:
- `total.amount` / `total.currency` (total fiat spent including fees)
- `amount.amount` / `amount.currency` (crypto received)
- `status` (only count `completed`)

This becomes the **highest priority** cost basis source for per-position accuracy, above v2 transactions.

Priority chain becomes:
1. V2 Buys endpoint (most reliable for actual purchases)
2. V2 Transactions (catches trades, staking rewards, etc.)
3. V3 Fills (Advanced Trade)
4. Portfolio breakdown (fallback)
5. Preserved DB value

### 2. Edge Function: Add missing transaction types

Add `subscription`, `earn_payout`, `receive` to `ACQUISITION_TYPES`.

### 3. Edge Function: Combine buys + transactions for total cost basis

For each position, sum:
- All completed buys from `/v2/accounts/:id/buys` (fiat spent)
- Plus acquisition-type transactions (staking rewards, trade conversions, etc.)

This gives the complete picture: cash invested + crypto received via other means.

### 4. UI: Add reliability indicator per position

**File: `src/components/import/CoinbaseSync.tsx`**

Store the cost basis source alongside each holding in the component state. Display a badge:
- "buys" or "transactions" = reliable (green)
- "preserved" or "none" = needs attention (orange)

### 5. Edge Function: Enhanced debug logging

Log the raw response from the buys endpoint to verify what Coinbase returns for each account, enabling faster debugging if issues persist.

### Files to Modify

- `supabase/functions/sync-coinbase/index.ts` -- add buys endpoint, fix types, merge sources
- `src/components/import/CoinbaseSync.tsx` -- add reliability indicator

