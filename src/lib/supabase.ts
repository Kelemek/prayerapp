import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables missing:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    envMode: import.meta.env.MODE
  });
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

console.log('Supabase client initializing...', {
  url: supabaseUrl,
  mode: import.meta.env.MODE
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Type-safe wrapper for common operations
export const supabaseClient = supabase;

// Re-export the error helper from a small testable module so tests can import it
export { handleSupabaseError } from './supabaseHelpers'