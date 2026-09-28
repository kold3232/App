// Confirms commission payments. This is the ONLY thing that marks a job's
// commission as paid — never trust the client's "I paid" for that, always
// wait for Stripe's signed webhook telling us the charge actually succeeded.
//
// Deploy this function with `--no-verify-jwt`: Stripe calls it directly,
// with no Supabase auth session, so the platform's own JWT gate must be off
// here. The Stripe signature check below is what authenticates the caller
// instead.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

// Stripe delivers our events through two separate destinations, and each one
// signs with its own secret.
//
// Everything about a payment — the charge, the refund, the checkout session —
// happens on the platform account, so it arrives through a "Your account"
// destination. But account.updated for a connected business happens on THEIR
// account, so it only arrives through a "Connected accounts" destination.
// That event is what tells us a business has finished signing up and can be
// paid, so we need both, and Stripe will not put both on one destination.
//
// Rather than run two functions, this one accepts either signature. A request
// is genuine if it verifies against any secret we hold; it is rejected if it
// verifies against none.
const webhookSecrets = [
  Deno.env.get('STRIPE_WEBHOOK_SECRET'),
  Deno.env.get('STRIPE_WEBHOOK_SECRET_CONNECT'),
].filter((s): s is string => !!s && s.length > 0);

async function verifyEvent(body: string, signature: string): Promise<Stripe.Event | null> {
  for (const secret of webhookSecrets) {
    try {
      return await stripe.webhooks.constructEventAsync(body, signature, secret);
    } catch {
      // Wrong secret for this destination — try the next one.
    }
  }
  return null;
}

function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function markPaymentPaid(session: Stripe.Checkout.Session) {
  const admin = adminClient();

  const { data: payment, error } = await admin
    .from('commission_payments')
    .select('id, status')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();
  if (error || !payment) {
    console.error('No matching commission_payments row for session', session.id);
    return;
  }
  if (payment.status === 'paid') return; // Stripe retries webhooks — this makes it a no-op the second time.

  const { data: items } = await admin
    .from('commission_payment_items')
    .select('request_id')
    .eq('payment_id', payment.id);
  const requestIds = (items ?? []).map((i) => i.request_id);

  if (requestIds.length > 0) {
    await admin.from('service_requests').update({ commission_paid: true }).in('id', requestIds);
  }

  await admin
    .from('commission_payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', payment.id);
}

async function markPaymentStatus(session: Stripe.Checkout.Session, status: 'expired' | 'failed') {
  const admin = adminClient();
  await admin
    .from('commission_payments')
    .update({ status })
    .eq('stripe_checkout_session_id', session.id)
    .eq('status', 'pending');
}

// --- In-app job payments (Stripe Connect) -----------------------------------
// This, not the app, is what marks a job payment as taken. The client saying
// "the sheet said it worked" is not evidence that money moved.

async function markJobPaymentPaid(intent: Stripe.PaymentIntent) {
  const admin = adminClient();

  const { data: payment } = await admin
    .from('job_payments')
    .select('id, request_id, kind, status')
    .eq('stripe_payment_intent_id', intent.id)
    .maybeSingle();
  if (!payment) {
    console.error('No matching job_payments row for payment intent', intent.id);
    return;
  }
  if (payment.status === 'paid') return; // Stripe retries — second time is a no-op.

  await admin
    .from('job_payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', payment.id);

  // The balance being paid settles the platform's commission on that job too:
  // it was taken as an application fee out of this very charge, so there is
  // nothing left to collect.
  if (payment.kind === 'final') {
    await admin.from('service_requests').update({ commission_paid: true }).eq('id', payment.request_id);
  }
  // A paid deposit unblocks the work. Recorded on the job so every screen that
  // has to decide whether it can proceed can read it without a second query.
  if (payment.kind === 'deposit') {
    await admin
      .from('service_requests')
      .update({ deposit_paid_at: new Date().toISOString() })
      .eq('id', payment.request_id);
  }
}

async function markJobPaymentFailed(intent: Stripe.PaymentIntent) {
  const admin = adminClient();
  await admin
    .from('job_payments')
    .update({ status: 'failed' })
    .eq('stripe_payment_intent_id', intent.id)
    .eq('status', 'pending');
}

async function markJobPaymentRefunded(charge: Stripe.Charge) {
  const intentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!intentId) return;

  const admin = adminClient();
  const { data: payment } = await admin
    .from('job_payments')
    .select('id, request_id, kind, status')
    .eq('stripe_payment_intent_id', intentId)
    .maybeSingle();
  if (!payment || payment.status === 'refunded') return;

  await admin
    .from('job_payments')
    .update({ status: 'refunded', refunded_at: new Date().toISOString() })
    .eq('id', payment.id);

  // The commission went back with it, so the job owes it again.
  if (payment.kind === 'final') {
    await admin.from('service_requests').update({ commission_paid: false }).eq('id', payment.request_id);
  }
  // A refunded deposit is an unpaid deposit: the work is blocked again.
  if (payment.kind === 'deposit') {
    await admin.from('service_requests').update({ deposit_paid_at: null }).eq('id', payment.request_id);
  }
}

// Stripe is the authority on whether a business is cleared to be paid, so the
// flags on our side are only ever a copy of what it tells us here.
async function syncConnectedAccount(account: Stripe.Account) {
  const admin = adminClient();
  await admin
    .from('businesses')
    .update({
      stripe_charges_enabled: !!account.charges_enabled,
      stripe_payouts_enabled: !!account.payouts_enabled,
      stripe_details_submitted: !!account.details_submitted,
    })
    .eq('stripe_account_id', account.id);
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header.', { status: 400 });
  }

  const body = await req.text();

  if (webhookSecrets.length === 0) {
    console.error('No webhook signing secret configured — refusing everything.');
    return new Response('Not configured.', { status: 500 });
  }

  const event = await verifyEvent(body, signature);
  if (!event) {
    console.error('Webhook signature verification failed against all configured secrets.');
    return new Response('Invalid signature.', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') {
        await markPaymentPaid(session);
      }
      break;
    }
    case 'checkout.session.expired':
      await markPaymentStatus(event.data.object as Stripe.Checkout.Session, 'expired');
      break;
    case 'checkout.session.async_payment_failed':
      await markPaymentStatus(event.data.object as Stripe.Checkout.Session, 'failed');
      break;

    // In-app job payments. These carry rockserv_request_id in their metadata,
    // but the payment intent id is what we match on — it was written to the
    // row before the customer ever saw the card sheet.
    case 'payment_intent.succeeded':
      await markJobPaymentPaid(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await markJobPaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.refunded':
      await markJobPaymentRefunded(event.data.object as Stripe.Charge);
      break;

    // Onboarding progress, and any later suspension. A business can be cleared
    // to take money one week and asked for more documents the next.
    case 'account.updated':
      await syncConnectedAccount(event.data.object as Stripe.Account);
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
