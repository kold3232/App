// Delivering a push through Expo, and tidying up after the tokens that die.
//
// Pulled out of send-push so the nudge job can reuse it. send-push still has
// its own copy; this is the one new code should use.
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type PushMessage = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

/**
 * Sends a batch and returns how many were accepted.
 *
 * Expo reports per-message failures in the response body rather than the
 * status code, so a 200 here does not mean everyone got it. A token belonging
 * to an app that has been deleted comes back as DeviceNotRegistered and will
 * never work again, so it is dropped rather than retried forever.
 */
export async function sendExpoPush(admin: any, messages: PushMessage[]): Promise<number> {
  if (messages.length === 0) return 0;

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(
      messages.map((m) => ({ to: m.token, title: m.title, body: m.body, sound: 'default', data: m.data ?? {} }))
    ),
  });

  if (!response.ok) return 0;
  const result = await response.json();

  const dead: string[] = [];
  (result?.data ?? []).forEach((entry: any, index: number) => {
    if (entry?.status === 'error' && entry?.details?.error === 'DeviceNotRegistered') {
      dead.push(messages[index].token);
    }
  });
  if (dead.length > 0) await admin.from('push_tokens').delete().in('token', dead);

  return messages.length - dead.length;
}
