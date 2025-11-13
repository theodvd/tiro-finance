import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRIDGE_API_URL = 'https://api.bridgeapi.io/v3/aggregation';
const BRIDGE_VERSION = '2025-01-15';

interface BridgeAccount {
  id: number;
  name: string;
  balance: number;
  currency_code: string;
  type: string;
  item_id: number;
}

interface BridgeTransaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  currency_code: string;
  category_id?: number;
}

// Helper to get Bridge user token
async function getBridgeUserToken(userId: string, clientId: string, clientSecret: string) {
  const response = await fetch(`${BRIDGE_API_URL}/authorization/token`, {
    method: 'POST',
    headers: {
      'Bridge-Version': BRIDGE_VERSION,
      'Client-Id': clientId,
      'Client-Secret': clientSecret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_user_id: userId,
    }),
  });

  if (!response.ok) {
    // User doesn't exist, create one
    const createResponse = await fetch(`${BRIDGE_API_URL}/users`, {
      method: 'POST',
      headers: {
        'Bridge-Version': BRIDGE_VERSION,
        'Client-Id': clientId,
        'Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_user_id: userId,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create Bridge user: ${error}`);
    }

    // Get token for newly created user
    const tokenResponse = await fetch(`${BRIDGE_API_URL}/authorization/token`, {
      method: 'POST',
      headers: {
        'Bridge-Version': BRIDGE_VERSION,
        'Client-Id': clientId,
        'Client-Secret': clientSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_user_id: userId,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to get token for new user: ${error}`);
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Bridge credentials
    const BRIDGE_CLIENT_ID = Deno.env.get('BRIDGE_CLIENT_ID');
    const BRIDGE_CLIENT_SECRET = Deno.env.get('BRIDGE_CLIENT_SECRET');
    const BRIDGE_API_URL = 'https://api.bridgeapi.io/v2';

    if (!BRIDGE_CLIENT_ID || !BRIDGE_CLIENT_SECRET) {
      throw new Error('Bridge API credentials not configured');
    }

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/bridge-proxy')[1] || '';

    // GET /bridge/init - Create Bridge Connect session
    if (path === '/init' && req.method === 'GET') {
      // Get or create Bridge user token
      const accessToken = await getBridgeUserToken(user.id, BRIDGE_CLIENT_ID, BRIDGE_CLIENT_SECRET);

      const response = await fetch(`${BRIDGE_API_URL}/connect-sessions`, {
        method: 'POST',
        headers: {
          'Bridge-Version': BRIDGE_VERSION,
          'Client-Id': BRIDGE_CLIENT_ID,
          'Client-Secret': BRIDGE_CLIENT_SECRET,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Bridge init error:', error);
        return new Response(JSON.stringify({ error: 'Failed to initialize Bridge session' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify({ redirect_url: data.url }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /bridge/accounts - Fetch user's accounts
    if (path === '/accounts' && req.method === 'GET') {
      const accessToken = await getBridgeUserToken(user.id, BRIDGE_CLIENT_ID, BRIDGE_CLIENT_SECRET);

      const response = await fetch(`${BRIDGE_API_URL}/accounts`, {
        headers: {
          'Bridge-Version': BRIDGE_VERSION,
          'Client-Id': BRIDGE_CLIENT_ID,
          'Client-Secret': BRIDGE_CLIENT_SECRET,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Bridge accounts error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch accounts' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const accounts = data.resources as BridgeAccount[];

      // Store accounts in Supabase
      for (const account of accounts) {
        await supabase
          .from('bridge_accounts')
          .upsert({
            user_id: user.id,
            provider: `item_${account.item_id}`,
            provider_account_id: account.id.toString(),
            name: account.name,
            balance: account.balance,
            currency: account.currency_code,
            type: account.type,
            raw_json: account,
          }, {
            onConflict: 'user_id,provider_account_id',
          });
      }

      return new Response(JSON.stringify({ accounts: data.resources }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /bridge/transactions?account_id=xxx - Fetch transactions for an account
    if (path.startsWith('/transactions') && req.method === 'GET') {
      const accountId = url.searchParams.get('account_id');
      if (!accountId) {
        return new Response(JSON.stringify({ error: 'account_id parameter required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const accessToken = await getBridgeUserToken(user.id, BRIDGE_CLIENT_ID, BRIDGE_CLIENT_SECRET);

      const response = await fetch(`${BRIDGE_API_URL}/accounts/${accountId}/transactions`, {
        headers: {
          'Bridge-Version': BRIDGE_VERSION,
          'Client-Id': BRIDGE_CLIENT_ID,
          'Client-Secret': BRIDGE_CLIENT_SECRET,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Bridge transactions error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch transactions' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      const transactions = data.resources as BridgeTransaction[];

      // Get the bridge_account_id from our database
      const { data: bridgeAccount } = await supabase
        .from('bridge_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_account_id', accountId)
        .maybeSingle();

      if (bridgeAccount) {
        // Store transactions in Supabase
        for (const transaction of transactions) {
          await supabase
            .from('bridge_transactions')
            .upsert({
              user_id: user.id,
              bridge_account_id: bridgeAccount.id,
              amount: transaction.amount,
              currency: transaction.currency_code,
              date: transaction.date,
              description: transaction.description,
              bridge_transaction_id: transaction.id.toString(),
              category: transaction.category_id?.toString(),
              raw_json: transaction,
            }, {
              onConflict: 'bridge_transaction_id',
            });
        }
      }

      return new Response(JSON.stringify({ transactions: data.resources }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Route not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bridge proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
