/**
 * How long something has been waiting, and how quickly a business usually
 * answers.
 *
 * Both are worded in the vague way people actually talk, because precision
 * here is false comfort: "sent 2 days ago" is the useful fact, and
 * "sent 2 days and 4 hours ago" is the same fact pretending to be more.
 */

/** After this long with no reply at all, the customer is offered a way out. */
export const OFFER_ALTERNATIVE_AFTER_HOURS = 24;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "3 hours ago", "2 days ago". */
export function timeAgo(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (elapsed < 45 * MINUTE) return 'just now';
  if (elapsed < 2 * HOUR) return 'an hour ago';
  if (elapsed < DAY) return `${Math.round(elapsed / HOUR)} hours ago`;
  const days = Math.round(elapsed / DAY);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

/** Whole hours since something happened. */
export function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / HOUR;
}

/**
 * Whether a request has gone unanswered long enough to offer the customer
 * somebody else. Nothing is cancelled when this turns true — it only decides
 * when to stop pretending the silence is normal.
 */
export function waitedLongEnoughForAlternative(createdAt: string): boolean {
  return hoursSince(createdAt) >= OFFER_ALTERNATIVE_AFTER_HOURS;
}

/**
 * "usually replies within the hour", from a median in minutes.
 *
 * Rounded outwards on purpose. A business that typically takes 50 minutes
 * should not be advertised as half an hour, because the customer remembers
 * being told half an hour.
 */
export function describeReplySpeed(medianMinutes: number): string {
  if (medianMinutes <= 15) return 'usually replies in minutes';
  if (medianMinutes <= 60) return 'usually replies within the hour';
  if (medianMinutes < 20 * 60) return `usually replies within ${Math.ceil(medianMinutes / 60)} hours`;
  const days = Math.ceil(medianMinutes / (24 * 60));
  return days <= 1 ? 'usually replies within a day' : `usually replies within ${days} days`;
}
