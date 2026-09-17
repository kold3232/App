// Sends a push notification about one job to whoever the other party is.
//
// The caller says which job and what happened — never who to notify. This
// function works the recipient out from the job itself, so a business cannot
// use it to push messages at arbitrary accounts, and it checks the caller is
// actually a party to the job before doing anything at all.
//
// Failures are swallowed with a 200. A notification is a nicety; the action
// that triggered it has already succeeded, and there is nothing useful the app
// can do about a push that did not send.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type PushEvent =
  | 'new_request'
  | 'new_message'
  | 'quote_sent'
  | 'quote_accepted'
  | 'request_accepted'
  | 'request_declined'
  | 'time_confirmed'
  | 'job_assigned'
  | 'job_completed';

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return ok({ ok: false, reason: 'no auth' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Who is calling, from their own JWT.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await callerClient.auth.getUser();
    const callerId = userData?.user?.id;
    if (!callerId) return ok({ ok: false, reason: 'not authenticated' });

    const { requestId, event } = (await req.json()) as { requestId?: string; event?: PushEvent };
    if (!requestId || !event) return ok({ ok: false, reason: 'missing arguments' });

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: request } = await admin
      .from('service_requests')
      .select(
        'id, case_number, customer_id, listing_id, company_name, category_name, customer_display_name, assigned_employee_id, quoted_amount, scheduled_for'
      )
      .eq('id', requestId)
      .maybeSingle();
    if (!request) return ok({ ok: false, reason: 'no such job' });

    const { data: listing } = await admin
      .from('business_listings')
      .select('id, business_id, name')
      .eq('id', request.listing_id)
      .maybeSingle();
    if (!listing) return ok({ ok: false, reason: 'no such listing' });

    const businessId = listing.business_id as string;
    const customerId = request.customer_id as string | null;

    // The caller has to be a party to this job. Without this check any signed
    // in account could fish for notifications about other people's work.
    let employeeUserId: string | null = null;
    if (request.assigned_employee_id) {
      const { data: employee } = await admin
        .from('business_employees')
        .select('user_id')
        .eq('id', request.assigned_employee_id)
        .maybeSingle();
      employeeUserId = (employee?.user_id as string | null) ?? null;
    }
    const isParty = callerId === businessId || callerId === customerId || callerId === employeeUserId;
    if (!isParty) return ok({ ok: false, reason: 'not your job' });

    const caseLabel = `Case #${request.case_number}`;
    const listingName = listing.name ?? 'your business';
    const customerLabel = request.customer_display_name || 'A customer';

    // Who hears about what. Recipients are ids resolved above, never anything
    // the caller sent.
    let recipientId: string | null = null;
    let title = '';
    let body = '';

    switch (event) {
      case 'new_request':
        recipientId = businessId;
        title = 'New job request';
        body = `${customerLabel} sent ${listingName} a ${request.category_name} request.`;
        break;
      case 'new_message':
        // Whoever did not send it. An employee has no chat access, so this is
        // only ever between the customer and the business.
        recipientId = callerId === businessId ? customerId : businessId;
        title = 'New message';
        body =
          callerId === businessId
            ? `${listingName} replied about ${caseLabel}.`
            : `${customerLabel} sent a message about ${caseLabel}.`;
        break;
      case 'quote_sent':
        recipientId = customerId;
        title = 'You have a quote';
        body = request.quoted_amount
          ? `${listingName} quoted £${Number(request.quoted_amount).toFixed(2)} for ${caseLabel}.`
          : `${listingName} sent you a quote for ${caseLabel}.`;
        break;
      case 'quote_accepted':
        recipientId = businessId;
        title = 'Quote accepted';
        body = `${customerLabel} accepted your quote for ${caseLabel}. Their contact details are now unlocked.`;
        break;
      case 'request_accepted':
        recipientId = customerId;
        title = 'Request accepted';
        body = `${listingName} accepted ${caseLabel}.`;
        break;
      case 'request_declined':
        recipientId = customerId;
        title = 'Request declined';
        body = `${listingName} can't take on ${caseLabel}.`;
        break;
      case 'time_confirmed':
        recipientId = customerId;
        title = 'Time confirmed';
        body = request.scheduled_for
          ? `${listingName} confirmed ${new Date(request.scheduled_for as string).toLocaleString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })} for ${caseLabel}.`
          : `${listingName} confirmed a time for ${caseLabel}.`;
        break;
      case 'job_assigned':
        recipientId = employeeUserId;
        title = 'New job assigned to you';
        body = `${caseLabel} · ${request.category_name}.`;
        break;
      case 'job_completed':
        recipientId = customerId;
        title = 'Job marked complete';
        body = `${listingName} marked ${caseLabel} as done. Confirm it in the app.`;
        break;
      default:
        return ok({ ok: false, reason: 'unknown event' });
    }

    // Nobody to tell — an unclaimed staff invite, or a deleted customer.
    if (!recipientId) return ok({ ok: true, sent: 0 });
    // Never notify someone about their own action.
    if (recipientId === callerId) return ok({ ok: true, sent: 0 });

    const { data: tokenRows } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', recipientId);
    const tokens = (tokenRows ?? []).map((t) => t.token as string);
    if (tokens.length === 0) return ok({ ok: true, sent: 0 });

    // data rides along so tapping the notification can open the right job
    // once that is wired up.
    const messages = tokens.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      data: { requestId, event },
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const result = await response.json();

    // Expo reports per-message errors in the body, not the status code. A
    // token belonging to an app that has been uninstalled comes back as
    // DeviceNotRegistered and will never work again, so drop it.
    const dead: string[] = [];
    (result?.data ?? []).forEach((entry: any, index: number) => {
      if (entry?.status === 'error' && entry?.details?.error === 'DeviceNotRegistered') {
        dead.push(tokens[index]);
      }
    });
    if (dead.length > 0) {
      await admin.from('push_tokens').delete().in('token', dead);
    }

    return ok({ ok: true, sent: tokens.length - dead.length });
  } catch (err) {
    console.error('send-push error', err);
    return ok({ ok: false, reason: 'unexpected error' });
  }
});
