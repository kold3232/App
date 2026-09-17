import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Show an alert even when the app is open, otherwise a business watching one
// screen gets no sign that a job landed on another.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Asks permission, gets this device's Expo push token, and stores it against
 * the signed-in account.
 *
 * Returns quietly rather than throwing on every failure path — a simulator,
 * a refused prompt, Expo Go — because none of those should stop someone using
 * the app. They just will not get notifications.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Push tokens are only issued to real hardware.
  if (!Device.isDevice) return null;

  try {
    // Android 13+ needs the channel to exist before a token is issued.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Jobs and messages',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    // Only prompt if we have never asked. Asking again after a refusal does
    // nothing on iOS anyway, and iOS only ever shows the prompt once.
    if (status !== 'granted' && existing.canAskAgain) {
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return null;

    // Through an RPC rather than an upsert: a shared handset keeps the same
    // token, and claiming it back needs to see a row the select policy quite
    // rightly hides from the new account. See register_push_token in the
    // schema for why widening that policy would be worse.
    await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });

    return token;
  } catch {
    // A missing APNs key, no network, Expo Go — all end up here, and none of
    // them are worth interrupting someone over.
    return null;
  }
}

/** Called on sign-out so a shared handset stops receiving the old account's jobs. */
export async function unregisterPushToken() {
  if (!Device.isDevice) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token) await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // Nothing useful to do — the next sign-in reclaims the row anyway.
  }
}

export type PushEvent =
  | 'new_request'
  | 'new_message'
  | 'quote_sent'
  | 'quote_accepted'
  | 'request_accepted'
  | 'request_declined'
  | 'time_confirmed'
  | 'job_assigned'
  | 'job_completed';

/**
 * Asks the server to notify whoever the other party is.
 *
 * The caller never says who to notify — only which job and what happened. The
 * Edge Function works the recipient out itself, so a business cannot use this
 * to push messages at arbitrary accounts.
 *
 * Deliberately fire-and-forget: a failed notification must never fail the
 * action that triggered it.
 */
export async function sendPushForEvent(requestId: string, event: PushEvent) {
  try {
    await supabase.functions.invoke('send-push', { body: { requestId, event } });
  } catch {
    // Ignored on purpose — see above.
  }
}
