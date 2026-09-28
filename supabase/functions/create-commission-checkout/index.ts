// Creates a Stripe Checkout session for the calling business's currently
// owed platform commission (10% on jobs <= £500, 5% above, tracked per
// completed job in service_requests.commission).
//
// This is the fallback route, not the main one. A job the customer pays for in
// the app has its commission taken out of that payment and never appears here.
// What is left are jobs settled outside RockServ — cash, bank transfer — where
// the only way to collect is still to invoice the business afterwards.
//
// The set of jobs a payment covers is snapshotted into commission_payments /
// commission_payment_items *before* Stripe is called, so a job that
// completes mid-checkout can never be swept into this payment by mistake.
// The webhook (stripe-webhook), not this function, is what actually marks
// jobs as paid once Stripe confirms the charge.
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

    // Identifies the caller from their own JWT — never trust a businessId from the request body.
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
      .select('id, email')
      .eq('id', businessId)
      .maybeSingle();
    if (businessError || !business) {
      return jsonResponse({ error: 'No business account found for this user.' }, 403);
    }

    const { data: listingRows, error: listingError } = await admin
      .from('business_listings')
      .select('id')
      .eq('business_id', businessId);
    if (listingError) {
      return jsonResponse({ error: 'Could not load listings.' }, 500);
    }
    const listingIds = (listingRows ?? []).map((l) => l.id);
    if (listingIds.length === 0) {
      return jsonResponse({ error: 'No commission owed.' }, 400);
    }

    const { data: owedRows, error: owedError } = await admin
      .from('service_requests')
      .select('id, commission')
      .in('listing_id', listingIds)
      .eq('status', 'completed')
      .eq('commission_paid', false)
      .not('commission', 'is', null);
    if (owedError) {
      return jsonResponse({ error: 'Could not load commission owed.' }, 500);
    }

    const candidates = owedRows ?? [];

    // Some of these jobs have already handed over part of their commission
    // through the app. A customer who pays the deposit in RockServ and then
    // settles the balance in cash leaves the job unpaid overall — but the
    // deposit's share of the commission was taken at the time, and billing the
    // whole amount again would charge the business twice for it.
    const collected = new Map<string, number>();
    for (let i = 0; i < candidates.length; i += 200) {
      const { data: paidRows } = await admin
        .from('job_payments')
        .select('request_id, commission')
        .eq('status', 'paid')
        .in(
          'request_id',
          candidates.slice(i, i + 200).map((r) => r.id)
        );
      (paidRows ?? []).forEach((row) => {
        collected.set(row.request_id, (collected.get(row.request_id) ?? 0) + Number(row.commission ?? 0));
      });
    }

    const owed = candidates
      .map((r) => ({
        id: r.id,
        remaining: Math.max(0, Math.round((Number(r.commission ?? 0) - (collected.get(r.id) ?? 0)) * 100) / 100),
      }))
      .filter((r) => r.remaining > 0);

    const amount = owed.reduce((sum, r) => sum + r.remaining, 0);
    if (owed.length === 0 || amount <= 0) {
      return jsonResponse({ error: 'No commission owed.' }, 400);
    }

    const { data: paymentRow, error: paymentError } = await admin
      .from('commission_payments')
      .insert({ business_id: businessId, amount, status: 'pending' })
      .select('id')
      .single();
    if (paymentError || !paymentRow) {
      return jsonResponse({ error: 'Could not create payment record.' }, 500);
    }

    const { error: itemsError } = await admin
      .from('commission_payment_items')
      .insert(owed.map((r) => ({ payment_id: paymentRow.id, request_id: r.id })));
    if (itemsError) {
      await admin.from('commission_payments').delete().eq('id', paymentRow.id);
      return jsonResponse({ error: 'Could not record covered jobs.' }, 500);
    }

    // Cosmetic only — Stripe redirects the browser here after checkout, but
    // whether the job actually gets marked paid always comes from the
    // webhook, never from this redirect. Fine to leave as a placeholder.
    const appUrl = Deno.env.get('APP_PUBLIC_URL') ?? 'https://example.com';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: business.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: { name: 'RockServ platform commission' },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/commission-paid.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/commission-cancelled.html`,
      metadata: { payment_id: paymentRow.id, business_id: businessId },
      // Managed Payments (on by default on newer Stripe accounts) wants a
      // product tax code we have no use for on a platform-fee line item —
      // opt this session out of it instead.
      // @ts-ignore — newer than this SDK version's bundled types
      managed_payments: { enabled: false },
    });

    if (!session.url) {
      return jsonResponse({ error: 'Could not start checkout.' }, 500);
    }

    await admin.from('commission_payments').update({ stripe_checkout_session_id: session.id }).eq('id', paymentRow.id);

    return jsonResponse({ url: session.url }, 200);
  } catch (err) {
    console.error('create-commission-checkout error', err);
    return jsonResponse({ error: 'Unexpected error starting checkout.' }, 500);
  }
});
