import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { AdminAuthContext } from '../contexts/AdminAuthContext';

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  
  // Track abort controller for admin status checks to prevent hanging
  const adminCheckAbortRef = useRef<AbortController | null>(null);
  
  // Inactivity timeout: 30 minutes
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
  // Maximum session duration: 8 hours (even if active)
  const MAX_SESSION_DURATION = 8 * 60 * 60 * 1000;

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
      
      // Check if user has admin privileges in the database
      const { data, error } = await supabase
        .from('email_subscribers')
        .select('is_admin')
        .eq('email', currentUser.email)
        .eq('is_admin', true)
        .maybeSingle();

      // Clear timeout if request completed
      clearTimeout(timeoutId);
      
      // If this request was aborted, don't process the response
      if (abortController.signal.aborted) {
        return;
      }

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort errors gracefully
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Admin status check timed out');
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
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        setUser(session?.user ?? null);
        await checkAdminStatus(session?.user ?? null);

        // If there's an existing session on initialize, treat it as a signed-in session
        // and set sessionStart/lastActivity so the auto-logout logic can run.
        if (session?.user) {
          setSessionStart(Date.now());
          setLastActivity(Date.now());
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
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
        
        // Update last sign in timestamp for admins
        if (event === 'SIGNED_IN' && session?.user?.email) {
          try {
            await supabase.rpc('update_admin_last_sign_in', {
              admin_email: session.user.email
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

  // Auto-logout on inactivity or max session duration
  useEffect(() => {
    if (!isAdmin || !sessionStart) return;

    // Track user activity
    const updateActivity = () => setLastActivity(Date.now());
    
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Don't count time in background towards inactivity
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reset activity timer when user returns - don't penalize them for being away
        setLastActivity(Date.now());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Database heartbeat - ping every 4 minutes to prevent database from sleeping
    // Supabase free tier pauses after ~5 minutes of inactivity
    const heartbeatInterval = setInterval(async () => {
      try {
        // Simple lightweight query to keep database awake
        await supabase.from('prayers').select('id').limit(1).maybeSingle();
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.debug('Database heartbeat failed:', error);
      }
    }, 4 * 60 * 1000); // Every 4 minutes

    // Check for inactivity AND max session duration every minute
    const interval = setInterval(() => {
      const now = Date.now();
      const inactive = now - lastActivity > INACTIVITY_TIMEOUT;
      const sessionTooOld = now - sessionStart > MAX_SESSION_DURATION;
      
      if (inactive) {
        console.log('Auto-logout due to inactivity (30 minutes)');
        logout();
      } else if (sessionTooOld) {
        console.log('Auto-logout due to maximum session duration (8 hours)');
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
        console.log('Auto-logout due to inactivity (immediate check)');
        logout();
      } else if (sessionTooOld) {
        console.log('Auto-logout due to maximum session duration (immediate check)');
        logout();
      }
    })();

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [isAdmin, lastActivity, sessionStart]);

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