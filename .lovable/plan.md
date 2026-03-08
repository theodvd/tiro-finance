

# Fix Coinbase Sync: Purchase Price and PNL

## Problem

The Coinbase sync currently stores `amount_invested_eur: 0.00` for all crypto holdings, resulting in a `+0.00%` PNL display. Two root causes:

1. The `native_balance` from the Coinbase `/v2/accounts` endpoint represents the **current market value**, not the cost basis (amount originally invested).
2. Even the current value appears to be stored as 0, suggesting a parsing issue with the API response.

## Solution

Enhance the `sync-coinbase` edge function to also fetch **transaction history** for each account with a non-zero balance. By summing up `buy` and `sell` transactions, we can compute the actual cost basis (total amount spent on purchases).

### Changes

#### 1. Edge Function (`supabase/functions/sync-coinbase/index.ts`)

After fetching accounts and filtering for non-zero balances:

- For each account with a balance, call `GET /v2/accounts/:account_id/transactions` (paginated)
- Filter transactions by type `buy`, `fiat_deposit` -> `buy`, `trade` (crypto purchases)
- Sum up the `native_amount` of buy-type transactions to compute cost basis
- Generate a separate JWT with the correct `uri` for the transactions endpoint (Coinbase requires the `uri` claim to match the request)
- Store the computed cost basis as `amount_invested_eur` in the holdings table

Key logic:
- For each Coinbase account with balance > 0:
  - Fetch all transactions via pagination
  - Filter for `type === 'buy'` or `type === 'advanced_trade_fill'` or `type === 'trade'` with positive amounts
  - Sum `native_amount.amount` (absolute value of debits for buys) as the cost basis
- Fall back to `native_balance` if no transaction history is available

#### 2. JWT Generation Update

The current JWT has a hardcoded `uri: 'GET api.coinbase.com/v2/accounts'`. Since we also need to call the transactions endpoint, the function needs to either:
- Generate a new JWT per request (with the matching `uri`), OR
- Remove the `uri` claim if Coinbase allows it for CDP keys with `view` scope

We will generate one JWT without the `uri` claim or with a wildcard approach, or generate per-endpoint JWTs.

### Technical Details

```text
For each position:
  1. GET /v2/accounts/:id/transactions?limit=100
  2. Paginate through all pages
  3. Filter: type in ['buy', 'advanced_trade_fill', 'trade', 'send' (incoming)]
  4. Cost basis = SUM of abs(native_amount) for buy transactions
  5. Store in holdings.amount_invested_eur
```

#### 3. No UI Changes Required

The existing PNL calculation in `Investments.tsx` already computes:
```
pnl = marketValue - amount_invested_eur
pnlPct = (pnl / amount_invested_eur) * 100
```

Once `amount_invested_eur` contains the real cost basis, PNL will display correctly.

### Files to Modify

- `supabase/functions/sync-coinbase/index.ts` -- add transaction fetching and cost basis calculation

### Risks and Edge Cases

- Rate limiting on Coinbase API (multiple calls per account) -- mitigated by the 100-item limit per page
- Users who received crypto as gifts/transfers won't have buy transactions -- fallback to 0 cost basis
- The JWT `uri` claim must match each endpoint called -- will generate per-endpoint JWTs

