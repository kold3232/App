// Refunds a payment a customer has made on a job. Only the business that was
// paid can do this — it is their money going back, and they are the ones who
// know whether the job fell through.
//
// The refund reverses the whole arrangement, not just the customer's side:
// the transfer to the business is pulled back and RockServ's commission is
// returned too. A refunded job earns nobody anything, which is the only
// version of this that is defensible to either party.
//
// Note for whoever reads this next: Stripe debits the PLATFORM balance for
// refunds and chargebacks on destination charges. reverse_transfer claws the
// money back from the business, but if their balance is empty it goes
// negative and RockServ carries it until they earn again. That is the risk of
// letting businesses refund at will, and it is the reason this is restricted
// to the business that was actually paid.
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

    const { paymentId } = await req.json().catch(() => ({}));
    if (!paymentId) {
      return jsonResponse({ error: 'Bad request.' }, 400);
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
    const callerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: payment } = await admin
      .from('job_payments')
      .select('id, request_id, kind, amount, status, stripe_payment_intent_id')
      .eq('id', paymentId)
      .maybeSingle();
    if (!payment) {
      return jsonResponse({ error: 'Payment not found.' }, 404);
    }
    if (payment.status === 'refunded') {
      return jsonResponse({ ok: true, alreadyRefunded: true }, 200);
    }
    if (payment.status !== 'paid' || !payment.stripe_payment_intent_id) {
      return jsonResponse({ error: 'That payment has not been taken, so there is nothing to refund.' }, 409);
    }

    // The caller must own the listing this job belongs to. An admin override
    // is deliberately absent: admins can see payments but refunding is the
    // business's call, which is what was asked for.
    const { data: request } = await admin
      .from('service_requests')
      .select('id, listing_id')
      .eq('id', payment.request_id)
      .maybeSingle();
    const { data: listing } = await admin
      .from('business_listings')
      .select('id, business_id')
      .eq('id', request?.listing_id ?? '')
      .maybeSingle();
    if (!listing || listing.business_id !== callerId) {
      return jsonResponse({ error: 'Only the business paid for this job can refund it.' }, 403);
    }

    await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      // Pull the money back out of the business's balance rather than leaving
      // RockServ out of pocket for a refund it did not decide on.
      reverse_transfer: true,
      // And give back the commission. A job that did not happen should not
      // have earned a fee.
      refund_application_fee: true,
    });

    // The webhook confirms this too; writing it here means the business sees
    // the result immediately rather than waiting for Stripe to call back.
    await admin
      .from('job_payments')
      .update({ status: 'refunded', refunded_at: new Date().toISOString() })
      .eq('id', payment.id);

    return jsonResponse({ ok: true }, 200);
  } catch (err) {
    console.error('refund-job-payment error', err);
    return jsonResponse({ error: 'Could not refund that payment.' }, 500);
  }
});
