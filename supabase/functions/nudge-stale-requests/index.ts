// Nudges businesses that have left a request unanswered.
//
// Most silence is not a refusal. It is someone who saw a notification while up
// a ladder and forgot, so one reminder clears most of it. The customer side
// never auto-cancels anything — only this nudge is automatic, because reminding
// a business to do their own job cannot go wrong.
//
// Runs on a schedule rather than in response to anything, so it is called by
// cron and has no user attached. Only something holding the service role key
// can invoke it; see the check below.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendExpoPush, type PushMessage } from '../_shared/expoPush.ts';

// How long a request may sit unanswered before the business hears about it.
const DEFAULT_NUDGE_AFTER_HOURS = 24;
// Past this, the customer has long since moved on and a reminder is just noise.
const GIVE_UP_AFTER_DAYS = 14;
// A cap so one bad run cannot turn into a thousand notifications.
const MAX_PER_RUN = 200;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const money = (n: number) => `£${Number(n).toFixed(2)}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

  // There is no user to authenticate, so the key itself is the credential. A
  // signed-in customer must not be able to fire this off.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!serviceRoleKey || token !== serviceRoleKey) {
    return json({ ok: false, reason: 'not authorised' }, 401);
  }

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const hours = Number(Deno.env.get('NUDGE_AFTER_HOURS') ?? DEFAULT_NUDGE_AFTER_HOURS);
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const floor = new Date(Date.now() - GIVE_UP_AFTER_DAYS * 86400 * 1000).toISOString();

    const { data: stale, error } = await admin
      .from('service_requests')
      .select('id, case_number, listing_id, category_name, quoted_amount, area, created_at')
      .eq('status', 'pending')
      .is('first_business_reply_at', null)
      .is('reply_nudged_at', null)
      .lt('created_at', cutoff)
      .gt('created_at', floor)
      .order('created_at', { ascending: true })
      .limit(MAX_PER_RUN);

    if (error) return json({ ok: false, reason: error.message }, 500);
    const requests = stale ?? [];
    if (requests.length === 0) return json({ ok: true, considered: 0, nudged: 0 });

    // Which business owns each listing, in one query rather than one per job.
    const listingIds = Array.from(new Set(requests.map((r) => r.listing_id as string)));
    const { data: listingRows } = await admin
      .from('business_listings')
      .select('id, business_id, name')
      .in('id', listingIds);
    const listings = new Map(
      ((listingRows ?? []) as { id: string; business_id: string; name: string | null }[]).map((l) => [l.id, l])
    );

    const businessIds = Array.from(new Set(Array.from(listings.values()).map((l) => l.business_id)));
    const { data: tokenRows } = await admin
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', businessIds);
    const tokensByBusiness = new Map<string, string[]>();
    ((tokenRows ?? []) as { token: string; user_id: string }[]).forEach((row) => {
      const list = tokensByBusiness.get(row.user_id) ?? [];
      list.push(row.token);
      tokensByBusiness.set(row.user_id, list);
    });

    const messages: PushMessage[] = [];
    // Only the jobs we actually managed to send something about get marked. A
    // business with notifications off would otherwise be marked as nudged and
    // never hear about it, even after turning them on.
    const nudgedIds: string[] = [];

    for (const request of requests) {
      const listing = listings.get(request.listing_id as string);
      if (!listing) continue;
      const tokens = tokensByBusiness.get(listing.business_id) ?? [];
      if (tokens.length === 0) continue;

      const days = Math.max(1, Math.round((Date.now() - new Date(request.created_at as string).getTime()) / 86400000));
      const value = request.quoted_amount ? ` · ${money(Number(request.quoted_amount))}` : '';
      const where = request.area ? ` in ${request.area}` : '';

      tokens.forEach((t) =>
        messages.push({
          token: t,
          title: days === 1 ? 'A job is still waiting' : `A job has been waiting ${days} days`,
          body: `Case #${request.case_number} · ${request.category_name}${where}${value}. Reply or decline so the customer knows.`,
          data: { requestId: request.id, event: 'reply_nudge' },
        })
      );
      nudgedIds.push(request.id as string);
    }

    const sent = await sendExpoPush(admin, messages);

    if (nudgedIds.length > 0) {
      // Server-side write, so the trigger that keeps both parties out of this
      // column lets it through — see enforce_reply_tracking in the schema.
      await admin
        .from('service_requests')
        .update({ reply_nudged_at: new Date().toISOString() })
        .in('id', nudgedIds);
    }

    return json({ ok: true, considered: requests.length, nudged: nudgedIds.length, sent });
  } catch (err) {
    console.error('nudge-stale-requests error', err);
    return json({ ok: false, reason: 'unexpected error' }, 500);
  }
});
