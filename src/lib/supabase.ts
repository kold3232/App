import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Temporary, visible diagnostic for the "no API key found" TestFlight bug —
// shows exactly what got baked into this build instead of guessing about
// EAS's env var pipeline from the outside. Remove once that's confirmed fixed.
export const debugEnvInfo = {
  urlPresent: !!supabaseUrl,
  urlPreview: supabaseUrl ? `${supabaseUrl.slice(0, 24)}...` : 'MISSING',
  anonKeyPresent: !!supabaseAnonKey,
  anonKeyLength: supabaseAnonKey?.length ?? 0,
};

export const supabase = createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseAnonKey ?? 'placeholder-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
