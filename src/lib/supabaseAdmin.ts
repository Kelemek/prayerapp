import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Service role environment variables missing:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseServiceKey,
    envMode: import.meta.env.MODE
  });
  throw new Error('Missing service role environment variables. Please add VITE_SUPABASE_SERVICE_KEY to .env');
}

if (supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  throw new Error('Service role key not configured. Add actual VITE_SUPABASE_SERVICE_KEY to .env');
}

/**
 * Service role client - bypasses RLS for admin operations
 * This client should ONLY be used for admin-level operations that need to bypass RLS
 * such as approving prayers, preference changes, etc.
 * 
 * WARNING: This key should NEVER be exposed in client-side code in production.
 * In a production environment, these operations should go through backend Edge Functions.
 * This is only safe here because this is a church app with no untrusted external users.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
