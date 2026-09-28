// Gets a business into its own Stripe Express dashboard, where it can see when
// money actually reaches its bank.
//
// RockServ can say what a job earned. It cannot say when Stripe paid it out,
// what the payout schedule is, or why one is delayed — that lives with Stripe,
// and a business will eventually want to look. This mints a single-use link
// into their account and nowhere near anyone else's: the account id comes from
// the caller's own JWT, never from the request.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Not authenticated.' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: business } = await admin
      .from('businesses')
      .select('id, stripe_account_id, stripe_charges_enabled')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (!business?.stripe_account_id) {
      return jsonResponse({ error: 'You have not set up payments yet.' }, 409);
    }

    // Single-use and short-lived, which is why it is minted per tap rather
    // than stored anywhere.
    const link = await stripe.accounts.createLoginLink(business.stripe_account_id);
    return jsonResponse({ url: link.url }, 200);
  } catch (err) {
    console.error('connect-dashboard-link error', err);
    const reason = err instanceof Error && err.message ? err.message : 'Could not open your Stripe dashboard.';
    return jsonResponse({ error: reason }, 500);
  }
});
