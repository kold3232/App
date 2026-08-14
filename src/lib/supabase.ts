import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Temporary, visible diagnostic for the "no API key found" TestFlight bug.
// The earlier version truncated the URL at 24 chars, which left a trailing
// stray character/quote/whitespace in the env var impossible to rule out —
// so the full value and its exact length are reported here.
export const debugEnvInfo = {
  urlPresent: !!supabaseUrl,
  url: supabaseUrl ?? 'MISSING',
  urlLength: supabaseUrl?.length ?? 0,
  anonKeyPresent: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey?.length ?? 0,
};

/**
 * Normalizes any of fetch's three accepted header shapes into a plain object,
 * without ever constructing a `Headers` instance.
 *
 * supabase-js builds request headers as a `Headers` object and hands that to
 * `fetch`. That round-trip is the one place in the login path where a header
 * can silently vanish: it depends on the `Headers` implementation and the
 * `fetch` implementation agreeing, and in a compiled release binary those can
 * come from different polyfill layers than they do under Expo Go — which is
 * exactly the split we're seeing (works in Expo Go, "No API key found" in
 * TestFlight, with a key that is provably correct and a server that provably
 * accepts it). Passing a plain object through instead removes that seam.
 */
function toPlainHeaders(init?: HeadersInit): Record<string, string> {
  const out: Record<string, string> = {};
  if (!init) return out;
  if (Array.isArray(init)) {
    init.forEach(([key, value]) => {
      out[key] = value;
    });
  } else if (typeof (init as Headers).forEach === 'function') {
    (init as Headers).forEach((value, key) => {
      out[key] = value;
    });
  } else {
    Object.assign(out, init as Record<string, string>);
  }
  return out;
}

function hasHeader(headers: Record<string, string>, name: string) {
  return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

const fetchWithApiKey: typeof fetch = (input, init) => {
  const headers = toPlainHeaders(init?.headers);
  // `apikey` is always the anon key, even once a user is signed in — it
  // identifies the project, not the user, so forcing it is always correct.
  if (supabaseAnonKey) headers.apikey = supabaseAnonKey;
  // Authorization is different: after login it carries the user's access
  // token, and overwriting that would silently downgrade every authenticated
  // request to anon and break RLS. Only fill it in when nothing set it.
  if (supabaseAnonKey && !hasHeader(headers, 'authorization')) {
    headers.Authorization = `Bearer ${supabaseAnonKey}`;
  }
  return fetch(input, { ...init, headers });
};

/**
 * Fires one hand-rolled login request with the apikey header attached
 * explicitly, bypassing supabase-js entirely, and reports the raw response.
 * Distinguishes "the client is dropping the header" from "the server is
 * rejecting the key" — the fork that can't be resolved from off-device.
 */
export async function runConnectionTest(): Promise<string> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return `URL present: ${!!supabaseUrl}\nKey present: ${!!supabaseAnonKey}\n\nEnv vars missing from this build.`;
  }
  const target = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`;
  try {
    const response = await fetch(target, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'connection-test@example.com', password: 'deliberately-wrong' }),
    });
    const text = await response.text();
    return `URL (${debugEnvInfo.urlLength} chars):\n${supabaseUrl}\n\nRaw POST status: ${response.status}\n${text.slice(0, 300)}\n\n"invalid_credentials" here = the key and server are fine, so the header loss is inside supabase-js.\n"No API key found" here = the header is being stripped below the client (network/URL level).`;
  } catch (error) {
    return `URL (${debugEnvInfo.urlLength} chars):\n${supabaseUrl}\n\nRequest threw before a response:\n${String(error)}`;
  }
}

export const supabase = createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseAnonKey ?? 'placeholder-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: { fetch: fetchWithApiKey },
});
