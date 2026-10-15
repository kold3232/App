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
//
// Accounts are created through the Accounts v2 API; everything after that —
// the onboarding link, the status check, the charges — uses v1 endpoints,
// which accept a v2 account id.
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

// Stripe refuses to create Accounts v1 for platforms that did not already use
// them, and the compatibility switch that lets you opt back in exists only in
// test mode — so live accounts have to be made through /v2/core/accounts.
//
// Called directly rather than through the SDK: the pinned client predates this
// endpoint, and the rest of this codebase talks to v1 endpoints that the SDK
// handles well. A v2 account id works on those v1 endpoints — Stripe returns a
// v1-shaped response and applies updates to the v2 object underneath — which is
// why only account creation changes here and the account link, the status check
// and the charges themselves are untouched.
const ACCOUNTS_V2_API_VERSION = '2026-08-26.dahlia';

async function createConnectedAccount(opts: {
  businessId: string;
  name?: string;
  email?: string;
}): Promise<string> {
  const response = await fetch('https://api.stripe.com/v2/core/accounts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY') ?? ''}`,
      'Stripe-Version': ACCOUNTS_V2_API_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contact_email: opts.email,
      display_name: opts.name,
      // The Express dashboard is what a tradesperson uses to see their own
      // payouts. Stripe requires that choosing it puts both the fees and the
      // losses on the platform, which is the arrangement RockServ already
      // operates under.
      dashboard: 'express',
      // Entity type is left out on purpose. A sole trader and a limited
      // company need different details, and only the person signing up knows
      // which they are — Stripe asks them during onboarding.
      identity: { country: 'gi' },
      configuration: {
        // merchant lets the account be paid; recipient lets money be
        // transferred to it, which is what a destination charge does.
        merchant: { capabilities: { card_payments: { requested: true } } },
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
      defaults: {
        currency: 'gbp',
        responsibilities: { fees_collector: 'application', losses_collector: 'application' },
      },
      metadata: { rockserv_business_id: opts.businessId },
    }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id) {
    // Stripe's message names the actual problem — an unsupported country, a
    // configuration it will not allow, a platform not yet activated — and all
    // of those need a person to go and fix something.
    const message = body?.error?.message ?? `Stripe refused to create the account (${response.status}).`;
    console.error('createConnectedAccount failed', response.status, body);
    throw new Error(message);
  }
  return body.id as string;
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

    // A stored id is only worth reusing if Stripe still knows about it. Test
    // and live mode hold entirely separate accounts, so every id saved while
    // testing is meaningless once live keys are in use — and reusing one would
    // fail on the account link with an error about a missing account rather
    // than anything a business could act on. Treat an unknown id as no id.
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId);
      } catch {
        console.warn('Stored stripe_account_id not found on this key, creating a fresh account', accountId);
        accountId = null;
      }
    }

    if (!accountId) {
      accountId = await createConnectedAccount({
        businessId,
        name: business.name ?? undefined,
        email: business.email ?? undefined,
      });

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
