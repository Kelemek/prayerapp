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
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper to detect if an error is a network/connection error
export const isNetworkError = (error: unknown): boolean => {
  if (!error) return false;
  
  const errorStr = String(error).toLowerCase();
  return (
    errorStr.includes('failed to fetch') ||
    errorStr.includes('network') ||
    errorStr.includes('timeout') ||
    errorStr.includes('aborted') ||
    errorStr.includes('connection') ||
    (error instanceof Error && (
      error.message.includes('Failed to fetch') ||
      error.message.includes('Network') ||
      error.message.includes('Timeout')
    ))
  );
};

// Re-export the error helper from a small testable module so tests can import it
export { handleSupabaseError } from './supabaseHelpers'
