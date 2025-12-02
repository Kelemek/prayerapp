import { useState, useEffect, useRef } from 'react';
import { supabase, directQuery, getSupabaseConfig } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { AdminAuthContext } from '../contexts/AdminAuthContext';

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

interface TimeoutSettings {
  inactivityTimeoutMinutes: number;
  maxSessionDurationMinutes: number;
  dbHeartbeatIntervalMinutes: number;
}

// Default timeout values (in minutes)
const DEFAULT_TIMEOUTS: TimeoutSettings = {
  inactivityTimeoutMinutes: 30,
  maxSessionDurationMinutes: 480, // 8 hours
  dbHeartbeatIntervalMinutes: 1,
};

// Helper to get persisted session start from localStorage
const getPersistedSessionStart = (): number | null => {
  try {
    const stored = localStorage.getItem('adminSessionStart');
    if (stored) {
      const timestamp = parseInt(stored, 10);
      if (!isNaN(timestamp)) return timestamp;
    }
  } catch (e) {
    console.error('Error reading session start from localStorage:', e);
  }
  return null;
};

// Helper to persist session start to localStorage
const persistSessionStart = (timestamp: number | null) => {
  try {
    if (timestamp === null) {
      localStorage.removeItem('adminSessionStart');
    } else {
      localStorage.setItem('adminSessionStart', timestamp.toString());
    }
  } catch (e) {
    console.error('Error persisting session start to localStorage:', e);
  }
};

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  // Load sessionStart from localStorage so it persists across page reloads
  const [sessionStart, setSessionStartState] = useState<number | null>(getPersistedSessionStart);
  const [timeoutSettings, setTimeoutSettings] = useState<TimeoutSettings>(DEFAULT_TIMEOUTS);
  
  // Wrapper to persist sessionStart when it changes
  const setSessionStart = (value: number | null) => {
    setSessionStartState(value);
    persistSessionStart(value);
  };
  
  // Track abort controller for admin status checks to prevent hanging
  const adminCheckAbortRef = useRef<AbortController | null>(null);
  
  // Track heartbeat retry state
  const heartbeatRetryCountRef = useRef(0);
  const maxHeartbeatRetries = 3;
  
  // Cache expiry time for timeout settings (1 hour in milliseconds)
  const SETTINGS_CACHE_DURATION = 60 * 60 * 1000;

  // Load timeout settings from localStorage first (if fresh), then database
  const loadTimeoutSettings = async () => {
    try {
      // Try localStorage first (instant load) - but only if cache is fresh
      const cached = localStorage.getItem('adminTimeoutSettings');
      const cacheTimestamp = localStorage.getItem('adminTimeoutSettingsTimestamp');
      
      if (cached && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);
        if (cacheAge < SETTINGS_CACHE_DURATION) {
          const settings = JSON.parse(cached) as TimeoutSettings;
          setTimeoutSettings(settings);
          console.log('[AdminAuth] Loaded timeout settings from localStorage (cache age:', Math.round(cacheAge / 60000), 'min)');
          return;
        } else {
          console.log('[AdminAuth] Timeout settings cache expired, fetching from database');
        }
      }
    } catch (error) {
      console.error('Error reading timeout settings from localStorage:', error);
    }

    // Fetch from database if not cached or cache expired - use directQuery to avoid Supabase client hang
    try {
      const { data: dataArray, error } = await directQuery<Array<{
        inactivity_timeout_minutes: number;
        max_session_duration_minutes: number;
        db_heartbeat_interval_minutes: number;
      }>>('admin_settings', {
        select: 'inactivity_timeout_minutes, max_session_duration_minutes, db_heartbeat_interval_minutes',
        eq: { id: 1 },
        limit: 1,
        timeout: 10000
      });

      if (error) {
        console.error('Error loading timeout settings from database:', error);
        return;
      }

      const data = dataArray?.[0];
      if (data) {
        const settings: TimeoutSettings = {
          inactivityTimeoutMinutes: data.inactivity_timeout_minutes || DEFAULT_TIMEOUTS.inactivityTimeoutMinutes,
          maxSessionDurationMinutes: data.max_session_duration_minutes || DEFAULT_TIMEOUTS.maxSessionDurationMinutes,
          dbHeartbeatIntervalMinutes: data.db_heartbeat_interval_minutes || DEFAULT_TIMEOUTS.dbHeartbeatIntervalMinutes,
        };
        setTimeoutSettings(settings);
        // Cache in localStorage with timestamp for next time
        try {
          localStorage.setItem('adminTimeoutSettings', JSON.stringify(settings));
          localStorage.setItem('adminTimeoutSettingsTimestamp', Date.now().toString());
          console.log('[AdminAuth] Loaded timeout settings from database and cached in localStorage');
        } catch (storageError) {
          console.error('Error caching timeout settings in localStorage:', storageError);
        }
      }
    } catch (error) {
      console.error('Error loading timeout settings from database:', error);
      // Use defaults on error
    }
  };

  // Check if the current user is an admin with timeout
  const checkAdminStatus = async (currentUser: User | null) => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }

    // Cancel previous check if still pending
    if (adminCheckAbortRef.current) {
      adminCheckAbortRef.current.abort();
    }
    
    // Create new abort controller with 10 second timeout
    const abortController = new AbortController();
    adminCheckAbortRef.current = abortController;
    
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000);

    try {
      // For approval code sessions, use the Edge Function to check admin status
      // since the user isn't authenticated in Supabase yet
      if (currentUser.app_metadata?.provider === 'approval_code') {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        
        const response = await fetch(
          `${supabaseUrl}/functions/v1/check-admin-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${anonKey}`,
            },
            body: JSON.stringify({ email: currentUser.email }),
            signal: abortController.signal,
          }
        );

        if (abortController.signal.aborted) {
          return;
        }

        const data = await response.json();
        setIsAdmin(data.is_admin || false);
        clearTimeout(timeoutId);
        return;
      }
      
      // Check if user has admin privileges in the database (for authenticated users)
      // Use directQuery to avoid Supabase client hang after Safari minimize
      const { url, anonKey } = getSupabaseConfig();
      const params = new URLSearchParams();
      params.set('select', 'is_admin');
      params.set('email', `eq.${currentUser.email}`);
      params.set('is_admin', 'eq.true');
      params.set('limit', '1');
      
      const response = await fetch(`${url}/rest/v1/email_subscribers?${params.toString()}`, {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        signal: abortController.signal
      });

      // Clear timeout if request completed
      clearTimeout(timeoutId);
      
      // If this request was aborted, don't process the response
      if (abortController.signal.aborted) {
        return;
      }

      if (!response.ok) {
        console.error('Error checking admin status:', response.status);
        setIsAdmin(false);
        return;
      }

      const data = await response.json();
      const isAdminUser = Array.isArray(data) && data.length > 0;
      setIsAdmin(isAdminUser);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort errors gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        // Don't change admin status on timeout - keep current state
        return;
      }
      
      console.error('Exception checking admin status:', error);
      setIsAdmin(false);
    }
  };

  // Initialize auth state and listen for changes
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        // Check if there's an approval session first
        const approvalEmail = localStorage.getItem('approvalAdminEmail');
        const approvalValidated = localStorage.getItem('approvalSessionValidated');
        
        if (approvalEmail && approvalValidated === 'true') {
          // Create a temporary user object from the approval email
          const tempUser = {
            id: 'approval-' + Date.now(),
            email: approvalEmail,
            user_metadata: {},
            app_metadata: { provider: 'approval_code' },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            confirmation_sent_at: undefined,
            recovery_sent_at: undefined,
          } as any;
          
          setUser(tempUser);
          // Wait for checkAdminStatus to complete before setting loading to false
          await checkAdminStatus(tempUser);
          // Only set sessionStart if not already persisted (preserves original login time on page reload)
          if (!getPersistedSessionStart()) {
            setSessionStart(Date.now());
          }
          setLastActivity(Date.now());
          setLoading(false);
          return;
        }
        
        // Wrap getSession with a timeout to prevent indefinite hang after Safari minimize
        // The Supabase client's GoTrueClient can hang when the browser tab loses focus
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((_, reject) => {
          setTimeout(() => reject(new Error('Session check timed out')), 8000);
        });
        
        let session = null;
        try {
          const result = await Promise.race([sessionPromise, timeoutPromise]);
          if ('error' in result && result.error) throw result.error;
          session = result.data?.session ?? null;
        } catch (sessionError) {
          console.warn('[AdminAuth] Session check failed or timed out, continuing without session:', sessionError);
          // Continue without session - user can log in again if needed
        }
        
        setUser(session?.user ?? null);
        // Wait for checkAdminStatus to complete before setting loading to false
        await checkAdminStatus(session?.user ?? null);

        // If there's an existing session on initialize, treat it as a signed-in session
        // and set sessionStart/lastActivity so the auto-logout logic can run.
        // Only set sessionStart if not already persisted (preserves original login time on page reload)
        if (session?.user) {
          if (!getPersistedSessionStart()) {
            setSessionStart(Date.now());
          }
          setLastActivity(Date.now());
        }
        setLoading(false);
      } catch (error) {
        console.error('Error getting session:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        await checkAdminStatus(session?.user ?? null);
        setLoading(false);
        
        // Set session start time on sign in
        if (event === 'SIGNED_IN') {
          setSessionStart(Date.now());
          setLastActivity(Date.now());
        }
        
        // Clear session start on sign out
        if (event === 'SIGNED_OUT') {
          setSessionStart(null);
        }
        
        // Clean up URL hash AFTER admin check completes
        // This ensures isAdmin is set before routing logic runs
        if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
          window.location.hash = '#admin';
        }
        
        // Update last sign in timestamp for admins using direct fetch to avoid hang
        if (event === 'SIGNED_IN' && session?.user?.email) {
          try {
            const { url, anonKey } = getSupabaseConfig();
            await fetch(`${url}/rest/v1/rpc/update_admin_last_sign_in`, {
              method: 'POST',
              headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ admin_email: session.user.email })
            });
          } catch (error) {
            console.error('Error updating last sign in:', error);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Re-check admin status when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        checkAdminStatus(user);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Load timeout settings only when admin logs in (not for public users)
  useEffect(() => {
    if (isAdmin) {
      loadTimeoutSettings();
    }
  }, [isAdmin]);

  // Auto-logout on inactivity or max session duration
  useEffect(() => {
    if (!isAdmin || !sessionStart) return;

    // Convert timeout settings from minutes to milliseconds
    const INACTIVITY_TIMEOUT = timeoutSettings.inactivityTimeoutMinutes * 60 * 1000;
    const MAX_SESSION_DURATION = timeoutSettings.maxSessionDurationMinutes * 60 * 1000;
    const DB_HEARTBEAT_INTERVAL = timeoutSettings.dbHeartbeatIntervalMinutes * 60 * 1000;

    // Track user activity
    const updateActivity = () => setLastActivity(Date.now());
    
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Note: We intentionally do NOT reset lastActivity on visibility change.
    // The inactivity timeout should count real wall-clock time, not just "time looking at the app".
    // If user is away for 30 min and comes back, they should be logged out.

    // Database heartbeat with auto-retry and exponential backoff
    // Pings database to prevent Supabase free tier from pausing after ~5 minutes of inactivity
    const heartbeatInterval = setInterval(async () => {
      const attemptHeartbeat = async (retryCount = 0): Promise<boolean> => {
        try {
          // Simple lightweight query using directQuery to avoid Safari minimize hang
          await directQuery('prayers', {
            select: 'id',
            limit: 1,
            timeout: 5000
          });
          
          // Success - reset retry count
          heartbeatRetryCountRef.current = 0;
          console.debug('Database heartbeat successful');
          return true;
        } catch (error) {
          const isLastRetry = retryCount >= maxHeartbeatRetries;
          
          if (isLastRetry) {
            console.warn('Database heartbeat failed after 3 retries:', error);
            heartbeatRetryCountRef.current = 0;
            return false;
          }

          // Exponential backoff: 500ms, 1s, 2s
          const delay = Math.pow(2, retryCount) * 500;
          console.debug(`Retrying heartbeat in ${delay}ms (attempt ${retryCount + 1}/${maxHeartbeatRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return attemptHeartbeat(retryCount + 1);
        }
      };

      await attemptHeartbeat();
    }, DB_HEARTBEAT_INTERVAL);

    // Check for inactivity AND max session duration every minute
    const interval = setInterval(() => {
      const now = Date.now();
      const inactive = now - lastActivity > INACTIVITY_TIMEOUT;
      const sessionTooOld = now - sessionStart > MAX_SESSION_DURATION;
      
      if (inactive) {
        console.log(`Auto-logout due to inactivity (${timeoutSettings.inactivityTimeoutMinutes} minutes)`);
        logout();
      } else if (sessionTooOld) {
        console.log(`Auto-logout due to maximum session duration (${Math.round(timeoutSettings.maxSessionDurationMinutes / 60)} hours)`);
        logout();
      }
    }, 60000); // Check every minute

    // Perform an immediate check as well so tests (and fast flows) can trigger logout
    // without waiting for the first interval tick.
    (function immediateCheck() {
      const now = Date.now();
      const inactive = now - lastActivity > INACTIVITY_TIMEOUT;
      const sessionTooOld = now - sessionStart > MAX_SESSION_DURATION;

      if (inactive) {
        console.log(`Auto-logout due to inactivity (immediate check)`);
        logout();
      } else if (sessionTooOld) {
        console.log(`Auto-logout due to maximum session duration (immediate check)`);
        logout();
      }
    })();

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [isAdmin, lastActivity, sessionStart, timeoutSettings]);

  const sendMagicLink = async (email: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    
    try {
      // Use current origin, which works for any environment (localhost, preview, production)
      // Just make sure to add each environment's URL to Supabase redirect URLs list
      const redirectUrl = `${window.location.origin}?redirect=admin`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('Magic link error:', error.message, error);
        // Check for rate limit error
        if (error.message?.includes('over_email_send_rate_limit')) {
          // Try to extract wait time from error message if available
          const waitTimeMatch = error.message.match(/(\d+)\s*s(?:econds?)?/i);
          const waitTime = waitTimeMatch ? waitTimeMatch[1] : null;
          const message = waitTime 
            ? `Too many login attempts. Please wait ${waitTime} seconds before requesting another link.`
            : 'Too many login attempts. Please wait a few minutes before trying again.';
          return { success: false, error: message };
        }
        return { success: false, error: error.message || 'Failed to send magic link' };
      }

      // Reset activity timer
      setLastActivity(Date.now());
      return { success: true };
    } catch (error) {
      console.error('Magic link exception:', error);
      return { success: false, error: 'An unexpected error occurred. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear local state first
      setUser(null);
      setIsAdmin(false);
      // Clear session start timestamp (for both Supabase and approval code sessions)
      setSessionStart(null);
      
      // Try to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      // Ignore session missing errors as we're already logged out
      if (error && error.message !== 'Auth session missing!') {
        console.error('Logout error:', error);
      }
    } catch (error: unknown) {
      // Ignore session missing errors
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : '';
      if (errorMessage !== 'Auth session missing!') {
        console.error('Logout error:', error);
      }
    }
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, user, sendMagicLink, logout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
};