// Mirrors public.looks_like_contact_details and
// public.looks_like_payment_evasion in supabase/schema.sql. The database is
// what actually enforces these — both sides of a chat hold a real session
// token and can post without going near our screen — but running the same
// rules here means the sender gets an explanation instead of an error.
//
// Deliberately narrow. They catch the obvious ("call me on 54001234",
// "send it to my Revolut") and will not catch someone being careful. The
// point is closing the casual route, not winning an arms race.

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const HANDLES = /(whats\s*app|wapp|telegram|t\.me|wa\.me|signal|snapchat|instagram|insta\b|messenger|facebook|@[a-z0-9._]{3,})/i;
// A run of digits that may contain spaces, dashes, dots, brackets or a plus.
const DIGIT_RUN = /[0-9][0-9\s()+.-]{4,}[0-9]/g;

// Money apps and bank details. Revolut in particular is how this would
// actually happen in Gibraltar.
const PAYMENT_SERVICES =
  /(revolut|pay\s*pal|venmo|zelle|cash\s*app\b|bizum|monzo|starling|transferwise|wise\.com|\biban\b|sort\s*code|bank\s*transfer|bank\s*details|account\s*(number|details)|swift\s*code)/i;
// Taking it off the platform, said plainly. The trailing \b keeps "apple",
// "apply" and "appointment" out of it.
const LEAVING_PLATFORM =
  /(off|outside|outside\s+of|away\s+from|without|bypass|bypassing|skip|skipping|avoid|avoiding|not\s+through)\s+(the\s+|this\s+)?app\b/i;
const OFF_PLATFORM = /off[\s-]*platform/i;
// Cash, but only where the phrase itself is the evasion.
const CASH_EVASION = /(cash\s*in\s*hand|cash\s*job|cash\s+deal|under\s+the\s+table|off\s+the\s+books)/i;
// Dealing directly. Narrow on purpose: "between us" and "go direct" are
// ordinary English ("I will go directly to the merchant for the tiles"), so
// only phrasings that name the payment or the deal count.
const DIRECT_DEAL = /(pay\s+(me|you)\s+direct(ly)?|deal\s+direct(ly)?|keep\s+it\s+between\s+us)/i;

export function containsContactDetails(text: string): boolean {
  if (!text) return false;
  if (EMAIL.test(text)) return true;
  if (HANDLES.test(text)) return true;
  // Seven digits is a local Gibraltar number, and the threshold clears
  // ordinary prices, measurements and dates: "1250", "3000 x 600mm" and
  // "26/08" all pass.
  const runs = text.match(DIGIT_RUN) ?? [];
  return runs.some((run) => run.replace(/\D/g, '').length >= 7);
}

/**
 * Masking contact details stops the casual swap of phone numbers. It does not
 * stop the other half of the same move — "send it to my Revolut", "cash in
 * hand and we skip the app" — which is where the commission is lost.
 *
 * Bare mentions of cash are deliberately absent. Until RockServ takes payment
 * in the app, "can I pay cash on the day?" is an ordinary question with no
 * in-app answer, and blocking it would punish people for using the app
 * correctly.
 */
export function containsPaymentEvasion(text: string): boolean {
  if (!text) return false;
  return (
    PAYMENT_SERVICES.test(text) ||
    LEAVING_PLATFORM.test(text) ||
    OFF_PLATFORM.test(text) ||
    CASH_EVASION.test(text) ||
    DIRECT_DEAL.test(text)
  );
}

export const CONTACT_BLOCKED_MESSAGE =
  'Phone numbers, emails and handles like WhatsApp can’t be sent in RockServ chat. Keep the job here and contact details are shared automatically once the quote is accepted — that’s also what keeps the job covered by RockServ.';

export const PAYMENT_BLOCKED_MESSAGE =
  'Bank details and payment apps can’t be sent in RockServ chat, and neither can arranging the job off the app. Agreeing the work here is what keeps it covered — if it happens off RockServ, neither side has any protection if something goes wrong.';

/**
 * Both rules in one call, returning the message that fits what was typed
 * rather than a generic refusal. The caller shows it and stops; the database
 * rejects the same text either way.
 */
export function blockedMessageFor(text: string): string | null {
  if (containsContactDetails(text)) return CONTACT_BLOCKED_MESSAGE;
  if (containsPaymentEvasion(text)) return PAYMENT_BLOCKED_MESSAGE;
  return null;
}
