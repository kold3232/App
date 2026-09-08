import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

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

/**
 * Appends `apikey` to the query string as well as sending it as a header.
 *
 * On-device testing proved the header alone is not enough: a hand-written
 * fetch, with apikey set explicitly and supabase-js bypassed entirely, still
 * came back "No API key found in request" — while the identical request from
 * a desktop curl succeeded. The header is being dropped below the JS layer,
 * so no amount of setting it correctly in JS can fix it. Supabase's own
 * gateway accepts the key as a URL parameter instead ("No `apikey` request
 * header or url param was found"), which doesn't depend on header transport.
 *
 * The key is the public anon key — designed to be embedded in clients and
 * safe in a URL. Row Level Security, not key secrecy, is what protects data.
 */
function withApiKeyParam(input: RequestInfo | URL): RequestInfo | URL {
  if (!supabaseAnonKey) return input;
  const asString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : null;
  // Request objects carry their own URL; leaving them untouched is safer than
  // rebuilding one, and supabase-js passes plain strings in practice.
  if (asString === null) return input;
  if (asString.includes('apikey=')) return asString;
  return `${asString}${asString.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(supabaseAnonKey)}`;
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
  return fetch(withApiKeyParam(input), { ...init, headers });
};

export const supabase = createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseAnonKey ?? 'placeholder-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: { fetch: fetchWithApiKey },
});
