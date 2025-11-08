import { useState, useEffect } from 'react';
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
  
  // Inactivity timeout: 30 minutes
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
  // Maximum session duration: 8 hours (even if active)
  const MAX_SESSION_DURATION = 8 * 60 * 60 * 1000;

  // Check if the current user is an admin
  const checkAdminStatus = async (currentUser: User | null) => {
    if (!currentUser) {
      setIsAdmin(false);
      return;
    }

    try {
      // Check if user has admin privileges in the database
      const { data, error } = await supabase
        .from('email_subscribers')
        .select('is_admin')
        .eq('email', currentUser.email)
        .eq('is_admin', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(!!data);
    } catch (error) {
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
        checkAdminStatus(session?.user ?? null);
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
        
        // Clean up URL hash after magic link authentication
        if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
          console.log('🧹 Cleaning URL hash...');
          // Remove the auth tokens from the URL and redirect to #admin
          window.location.hash = '#admin';
          console.log('✅ Redirected to #admin');
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

  // Auto-logout on inactivity or max session duration
  useEffect(() => {
    if (!isAdmin || !sessionStart) return;

    // Track user activity
    const updateActivity = () => setLastActivity(Date.now());
    
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

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

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
    };
  }, [isAdmin, lastActivity, sessionStart]);

  const sendMagicLink = async (email: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      // Use current origin, which works for any environment (localhost, preview, production)
      // Just make sure to add each environment's URL to Supabase redirect URLs list
      const redirectUrl = `${window.location.origin}?redirect=admin`;
      
      console.log('🔗 Magic link redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('Magic link error:', error.message, error);
        return false;
      }

      // Reset activity timer
      setLastActivity(Date.now());
      return true;
    } catch (error) {
      console.error('Magic link exception:', error);
      return false;
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