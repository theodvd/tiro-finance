

# Fix Coinbase Cost Basis: Full Automation

## Diagnostic

From the edge function logs, the current situation is clear:

```text
BTC:  source=v2_transactions  cost=1912.00 EUR  ✅
ETH:  source=none              cost=0.00 EUR    ❌
SOL:  source=none              cost=0.00 EUR    ❌
EURC: source=none              cost=0.00 EUR    ❌
```

**Source A** (Portfolio Breakdown): 404 error — this endpoint doesn't work for standard Coinbase App accounts, only for Advanced Trade portfolios.

**Source B** (Fills): Returns 0 fills — the user buys through the Coinbase App, not Advanced Trade. Fills only exist for Advanced Trade orders.

**Source C** (V2 Transactions): Works for BTC but returns 0 for ETH/SOL. The current filter only accepts `type === 'buy'` or `type === 'advanced_trade_fill'`. Coinbase App purchases made via recurring buys, conversions, or other methods use different transaction types (e.g. `trade`, `send`, `exchange_deposit`).

## Root Cause

The `fetchV2CostBasis` function is too restrictive in its transaction type filter. Coinbase uses many transaction types for acquisitions:
- `buy` — standard one-time purchase
- `trade` — crypto-to-crypto swap or conversion
- `advanced_trade_fill` — Advanced Trade order fill
- `send` — received crypto (incoming transfers, rewards)
- `staking_reward` — staking income
- `learning_reward` — earn rewards

For cost basis, we need to count all "acquisition" types where crypto enters the wallet.

## Plan

### 1. Edge Function: Expand transaction type coverage and add debug logging

**File: `supabase/functions/sync-coinbase/index.ts`**

- In `fetchV2CostBasis`, expand the accepted transaction types to include: `buy`, `trade`, `advanced_trade_fill`, `send` (only incoming/positive amounts), `fiat_deposit`
- Add debug logging to print all unique transaction types found per account, so we can see exactly what Coinbase returns
- For `trade` type transactions: the `native_amount` is negative when spending fiat/crypto, positive when receiving — use absolute value for cost tracking
- For `send` type: only count if `amount` is positive (incoming transfer), treat as zero-cost acquisition unless `native_amount` shows a value

### 2. UI: Remove manual cost basis section

**File: `src/components/import/CoinbaseSync.tsx`**

- Remove the "Coût de revient par position" manual input section since the goal is full automation
- Replace with a read-only summary showing detected positions and their auto-calculated cost basis + source
- Keep showing PNL status per position so user can verify the data is correct

### 3. Improved fallback chain

If v2 transactions still return 0 for some assets, use the `native_balance` (current market value) as a last-resort fallback labeled as "market_value_fallback" — this at least gives a rough reference point rather than showing 0%.

### Files to Modify

- `supabase/functions/sync-coinbase/index.ts` — expand transaction types, add logging
- `src/components/import/CoinbaseSync.tsx` — replace manual inputs with auto-summary

