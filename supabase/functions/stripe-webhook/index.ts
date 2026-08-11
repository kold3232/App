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

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

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

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header.', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed', err);
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
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
