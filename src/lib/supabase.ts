import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables missing:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    envMode: import.meta.env.MODE
  });
  const error = new Error('Missing Supabase environment variables. Please check your .env file.');
  Sentry.captureException(error);
  throw error;
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

/**
 * Direct REST API query that bypasses the Supabase client.
 * Use this for queries that need to work reliably after browser minimize/restore.
 * The Supabase client's internal auth/lock mechanism can hang in Safari after minimize.
 * 
 * @param table - The table name to query
 * @param options - Query options (select, filters, order, limit, etc.)
 * @returns Promise with data and error similar to Supabase client
 */
export interface DirectQueryOptions {
  select?: string;
  eq?: Record<string, string | number | boolean>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  count?: 'exact' | 'planned' | 'estimated';
  head?: boolean;
  timeout?: number;
}

export const directQuery = async <T = unknown>(
  table: string,
  options: DirectQueryOptions = {}
): Promise<{ data: T | null; error: Error | null; count?: number }> => {
  const { select = '*', eq = {}, order, limit, count, head = false, timeout = 30000 } = options;
  
  const params = new URLSearchParams();
  params.set('select', select);
  
  // Add equality filters
  for (const [key, value] of Object.entries(eq)) {
    params.set(key, `eq.${value}`);
  }
  
  // Add ordering
  if (order) {
    params.set('order', `${order.column}.${order.ascending ? 'asc' : 'desc'}`);
  }
  
  // Add limit
  if (limit) {
    params.set('limit', String(limit));
  }
  
  const url = `${supabaseUrl}/rest/v1/${table}?${params.toString()}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const headers: Record<string, string> = {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    };
    
    // Request count if needed
    if (count) {
      headers['Prefer'] = head ? `count=${count}` : `count=${count}, return=representation`;
    }
    
    const response = await fetch(url, {
      method: head ? 'HEAD' : 'GET',
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      // Check for table not found error
      if (response.status === 404 || errorText.includes('42P01')) {
        return { data: null, error: { code: '42P01', message: 'Table not found' } as unknown as Error };
      }
      return { data: null, error: new Error(`Query failed: ${response.status} ${errorText}`) };
    }
    
    // Extract count from header if requested
    let resultCount: number | undefined;
    if (count) {
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        const match = contentRange.match(/\/(\d+|\*)/);
        if (match && match[1] !== '*') {
          resultCount = parseInt(match[1], 10);
        }
      }
    }
    
    // For HEAD requests, return null data with count
    if (head) {
      return { data: null, error: null, count: resultCount };
    }
    
    const data = await response.json();
    return { data: data as T, error: null, count: resultCount };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: new Error('Query timed out. Please try again.') };
    }
    return { data: null, error: err as Error };
  }
};

// Export URL and key for components that need direct fetch access
export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  anonKey: supabaseAnonKey
});

/**
 * Direct REST API mutation (insert, update, delete) that bypasses the Supabase client.
 * Use this for mutations that need to work reliably after browser minimize/restore.
 */
export interface DirectMutationOptions {
  method: 'POST' | 'PATCH' | 'DELETE';
  eq?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
  returning?: boolean;
  timeout?: number;
}

export const directMutation = async <T = unknown>(
  table: string,
  options: DirectMutationOptions
): Promise<{ data: T | null; error: Error | null }> => {
  const { method, eq = {}, body, returning = false, timeout = 15000 } = options;
  
  const params = new URLSearchParams();
  
  // Add equality filters for UPDATE and DELETE
  for (const [key, value] of Object.entries(eq)) {
    params.set(key, `eq.${value}`);
  }
  
  const url = `${supabaseUrl}/rest/v1/${table}${params.toString() ? '?' + params.toString() : ''}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const headers: Record<string, string> = {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    };
    
    if (returning) {
      headers['Prefer'] = 'return=representation';
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      return { data: null, error: new Error(`Mutation failed: ${response.status} ${errorText}`) };
    }
    
    // For DELETE without returning, there's no body
    if (method === 'DELETE' && !returning) {
      return { data: null, error: null };
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return { data: data as T, error: null };
    }
    
    return { data: null, error: null };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: new Error('Operation timed out. Please try again.') };
    }
    return { data: null, error: err as Error };
  }
};

/**
 * Wrapper to monitor Supabase operations with Sentry (Free Tier Compatible)
 * Captures errors without using performance transactions
 */
export const monitorSupabaseQuery = async <T>(
  operation: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  try {
    return await queryFn();
  } catch (error) {
    // Capture error in Sentry with context (free tier - no transaction tracking)
    Sentry.captureException(error, {
      tags: {
        operation_type: 'supabase',
        query: operation,
      },
      contexts: {
        supabase: {
          operation,
          is_network_error: isNetworkError(error),
        },
      },
    });
    
    throw error;
  }
};

