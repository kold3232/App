// Puts a business through Stripe's own onboarding so it can be paid.
//
// RockServ never sees a bank account, a passport or a date of birth. Stripe
// collects all of it against an Express connected account and tells us only
// whether the account is cleared to take money. That is the whole point of
// doing it this way: the identity and banking data is exactly the data a
// small marketplace has no business holding.
//
// Called twice in practice — once to start, and again whenever the business
// comes back to finish or to fix something Stripe has asked for. Both cases
// are the same call: an account link is single-use and short-lived, so a
// fresh one is minted every time.
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

    // The caller is identified from their own JWT. A business id in the body
    // would let anyone onboard — or re-onboard — somebody else's account.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return jsonResponse({ error: 'Not authenticated.' }, 401);
    }
    const businessId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: business, error: businessError } = await admin
      .from('businesses')
      .select('id, name, email, stripe_account_id')
      .eq('id', businessId)
      .maybeSingle();
    if (businessError || !business) {
      return jsonResponse({ error: 'No business account found for this user.' }, 403);
    }

    let accountId = business.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GI',
        email: business.email ?? undefined,
        business_profile: {
          name: business.name ?? undefined,
          // Gibraltar trades, described the way Stripe's risk review expects.
          product_description: 'Home and trade services booked through the RockServ marketplace.',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { rockserv_business_id: businessId },
      });
      accountId = account.id;

      // Saved before the account link is minted. If this write fails we would
      // otherwise create a fresh Stripe account on every attempt and leave a
      // trail of orphans that can never be reconciled to a business.
      const { error: saveError } = await admin
        .from('businesses')
        .update({ stripe_account_id: accountId })
        .eq('id', businessId);
      if (saveError) {
        console.error('Could not save stripe_account_id', saveError);
        return jsonResponse({ error: 'Could not save your payment account.' }, 500);
      }
    }

    // Stripe requires https in live mode, so these point at the public site
    // rather than the app's own rockserv:// scheme. Both pages just tell the
    // person to go back to the app; nothing is decided by the redirect.
    const appUrl = Deno.env.get('APP_PUBLIC_URL') ?? 'https://kold3232.github.io/App';
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/stripe-refresh.html`,
      return_url: `${appUrl}/stripe-return.html`,
      type: 'account_onboarding',
    });

    return jsonResponse({ url: link.url }, 200);
  } catch (err) {
    console.error('connect-onboard error', err);
    // Pass Stripe's own words through. Everything that fails here is a setup
    // problem someone has to go and fix — Connect not enabled, a missing key,
    // a country that is not allowed — and "could not start payment setup"
    // sends them hunting with no idea where to look. Stripe redacts its own
    // keys in these messages, so there is nothing secret to leak.
    const reason = err instanceof Error && err.message ? err.message : 'Could not start payment setup.';
    return jsonResponse({ error: reason }, 500);
  }
});
