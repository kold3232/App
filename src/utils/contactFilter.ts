// Mirrors public.looks_like_contact_details in supabase/schema.sql. The
// database is what actually enforces this — both sides of a chat hold a real
// session token and can post without going near our screen — but running the
// same rule here means the sender gets an explanation instead of an error.
//
// Deliberately narrow: it catches "call me on 54001234" and "whatsapp me", not
// someone spelling a number out in words. The point is closing the casual
// route, not winning an arms race.

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const HANDLES = /(whats\s*app|wapp|telegram|t\.me|wa\.me|signal|snapchat|instagram|insta\b|messenger|facebook|@[a-z0-9._]{3,})/i;
// A run of digits that may contain spaces, dashes, dots, brackets or a plus.
const DIGIT_RUN = /[0-9][0-9\s()+.-]{4,}[0-9]/g;

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

export const CONTACT_BLOCKED_MESSAGE =
  'Phone numbers, emails and handles like WhatsApp can’t be sent in RockServ chat. Keep the job here and contact details are shared automatically once the quote is accepted — that’s also what keeps the job covered by RockServ.';
