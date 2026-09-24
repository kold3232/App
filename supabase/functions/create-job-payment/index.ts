// Starts a customer's payment for a job: either the deposit a business has
// asked for, or the balance once the work is finished.
//
// Every figure here is worked out on the server from the job itself. The
// client sends a job id and which of the two payments it is, and nothing
// else — an amount in the request body would let a customer decide what a
// £3,000 job costs.
//
// The shape is a Stripe destination charge: the customer pays, RockServ's
// commission is taken as an application fee, and Stripe moves the rest to the
// business's connected account. The money never sits with RockServ, which is
// the point — there is no float to hold and no commission to chase.
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

// Mirrors COMMISSION_RATE in src/context/AppContext.tsx. Kept as a copy on
// purpose: this is the one that decides what is actually taken, and it must
// not be able to change because somebody edited a screen.
const commissionRate = (jobValue: number) => (jobValue > 500 ? 0.05 : 0.1);

// A deposit is taken before anyone knows what the job will actually come to,
// so its share of the commission is charged at the lowest rate the job could
// possibly attract. Charging the higher rate risks collecting more than the
// finished job owes — a £480 quote that lands at £600 crosses the band, and
// the fee already taken cannot be given back out of a later application fee.
// The overcharge would come out of the business's pocket, so we err the other
// way and let the balance true it up.
const MIN_COMMISSION_RATE = 0.05;

const round2 = (n: number) => Math.round(n * 100) / 100;
const toPence = (n: number) => Math.round(n * 100);

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

    const { requestId, kind } = await req.json().catch(() => ({}));
    if (!requestId || (kind !== 'deposit' && kind !== 'final')) {
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
    const customerId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: request, error: requestError } = await admin
      .from('service_requests')
      .select('id, customer_id, listing_id, status, quoted_amount, quote_accepted, job_value, deposit_amount')
      .eq('id', requestId)
      .maybeSingle();
    if (requestError || !request) {
      return jsonResponse({ error: 'Job not found.' }, 404);
    }
    // Only the customer on the job pays for it.
    if (request.customer_id !== customerId) {
      return jsonResponse({ error: 'This is not your job.' }, 403);
    }

    const { data: listing } = await admin
      .from('business_listings')
      .select('id, business_id, name')
      .eq('id', request.listing_id)
      .maybeSingle();
    if (!listing) {
      return jsonResponse({ error: 'Business not found for this job.' }, 404);
    }

    const { data: business } = await admin
      .from('businesses')
      .select('id, name, stripe_account_id, stripe_charges_enabled')
      .eq('id', listing.business_id)
      .maybeSingle();
    if (!business?.stripe_account_id || !business.stripe_charges_enabled) {
      // Worth being specific: the customer has done nothing wrong and there is
      // nothing they can do about it either.
      return jsonResponse(
        { error: 'This business has not finished setting up payments yet, so it cannot be paid in the app.' },
        409
      );
    }

    const { data: existing } = await admin
      .from('job_payments')
      .select('id, kind, amount, commission, status, stripe_payment_intent_id')
      .eq('request_id', requestId);
    const payments = existing ?? [];

    if (payments.some((p) => p.kind === kind && p.status === 'paid')) {
      return jsonResponse({ error: 'That has already been paid.' }, 409);
    }

    const paidDeposit = payments.find((p) => p.kind === 'deposit' && p.status === 'paid');
    const depositPaidAmount = Number(paidDeposit?.amount ?? 0);
    const depositPaidCommission = Number(paidDeposit?.commission ?? 0);

    let amount: number;
    let commission: number;
    let description: string;

    if (kind === 'deposit') {
      const deposit = Number(request.deposit_amount ?? 0);
      if (!deposit || deposit <= 0) {
        return jsonResponse({ error: 'No deposit has been requested on this job.' }, 409);
      }
      // A deposit is money taken before there is any work to show for it, so
      // it only exists against a quote the customer has actually accepted.
      if (!request.quote_accepted || !request.quoted_amount) {
        return jsonResponse({ error: 'Accept the quote before paying a deposit.' }, 409);
      }
      amount = round2(deposit);
      // Commission is charged on the job total, not on each payment in
      // isolation. The deposit carries a provisional share of it now; the
      // balance carries whatever is left once the real total is known.
      commission = round2(deposit * MIN_COMMISSION_RATE);
      description = `Deposit — ${listing.name ?? business.name ?? 'RockServ job'}`;
    } else {
      // The balance is only payable once the business says the work is done.
      if (request.status !== 'completed' || !request.job_value) {
        return jsonResponse({ error: 'This job is not finished yet.' }, 409);
      }
      const total = Number(request.job_value);
      amount = round2(total - depositPaidAmount);
      if (amount <= 0) {
        return jsonResponse({ error: 'This job is already paid in full.' }, 409);
      }
      // Total commission on the job, less whatever the deposit already
      // carried. Worked from the final figure, so a job that came in above or
      // below its quote still pays the right commission overall.
      const totalCommission = round2(total * commissionRate(total));
      // Capped at the balance itself. A business is free to ask for a deposit
      // covering nearly the whole job, which can leave a balance smaller than
      // the commission still outstanding — taking the shortfall out of the
      // business is not an option, so RockServ absorbs it.
      commission = round2(Math.min(Math.max(0, totalCommission - depositPaidCommission), amount));
      description = `${listing.name ?? business.name ?? 'RockServ job'} — balance`;
    }

    // Never take more in fees than the payment itself — a guard against an
    // arithmetic slip somewhere above ever producing a negative transfer.
    if (commission > amount) {
      console.error('commission exceeded amount', { requestId, kind, amount, commission });
      return jsonResponse({ error: 'Could not work out the payment. Please contact RockServ.' }, 500);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: toPence(amount),
      currency: 'gbp',
      application_fee_amount: toPence(commission),
      transfer_data: { destination: business.stripe_account_id },
      // The business is the one selling the work, so it is the merchant of
      // record: its name goes on the customer's statement and the contract is
      // with it, not with RockServ. RockServ is the marketplace, not the
      // builder, and the paperwork should say so.
      on_behalf_of: business.stripe_account_id,
      description,
      metadata: {
        rockserv_request_id: String(requestId),
        rockserv_kind: kind,
        rockserv_business_id: business.id,
        rockserv_customer_id: customerId,
      },
      automatic_payment_methods: { enabled: true },
    });

    // Recorded before the sheet opens so the webhook always has a row to find.
    // A pending row with no payment behind it is harmless; a successful charge
    // with nothing to attach it to is not.
    const pending = payments.find((p) => p.kind === kind && p.status === 'pending');
    if (pending) {
      await admin
        .from('job_payments')
        .update({ amount, commission, stripe_payment_intent_id: paymentIntent.id })
        .eq('id', pending.id);
    } else {
      await admin.from('job_payments').insert({
        request_id: requestId,
        kind,
        amount,
        commission,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
      });
    }

    return jsonResponse(
      {
        clientSecret: paymentIntent.client_secret,
        amount,
        commission,
        businessName: business.name ?? listing.name ?? 'the business',
      },
      200
    );
  } catch (err) {
    console.error('create-job-payment error', err);
    return jsonResponse({ error: 'Could not start the payment.' }, 500);
  }
});
