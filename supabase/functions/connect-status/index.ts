// Re-reads a business's Stripe account and copies the three flags we care
// about back into the database.
//
// The account.updated webhook does this too, and is the authority. This exists
// because a business that has just finished onboarding comes straight back
// into the app and wants to see "ready" immediately, not whenever a webhook
// happens to land. Same values, asked for rather than waited for.
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
    const businessId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: business } = await admin
      .from('businesses')
      .select('id, stripe_account_id')
      .eq('id', businessId)
      .maybeSingle();

    if (!business?.stripe_account_id) {
      return jsonResponse({ chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false }, 200);
    }

    const account = await stripe.accounts.retrieve(business.stripe_account_id);
    const flags = {
      stripe_charges_enabled: !!account.charges_enabled,
      stripe_payouts_enabled: !!account.payouts_enabled,
      stripe_details_submitted: !!account.details_submitted,
    };
    await admin.from('businesses').update(flags).eq('id', businessId);

    return jsonResponse(
      {
        chargesEnabled: flags.stripe_charges_enabled,
        payoutsEnabled: flags.stripe_payouts_enabled,
        detailsSubmitted: flags.stripe_details_submitted,
        // What Stripe is still waiting on, if anything. Shown to the business
        // verbatim is not much use, but "we still need something from you" is.
        pending: account.requirements?.currently_due ?? [],
      },
      200
    );
  } catch (err) {
    console.error('connect-status error', err);
    const reason = err instanceof Error && err.message ? err.message : 'Could not check your payment account.';
    return jsonResponse({ error: reason }, 500);
  }
});
