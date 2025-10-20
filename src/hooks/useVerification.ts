import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface VerificationState {
  codeId: string | null;
  expiresAt: string | null;
  email: string | null;
}

interface VerifiedSession {
  email: string;
  verifiedAt: number;
  expiresAt: number;
}

const VERIFIED_SESSIONS_KEY = 'prayer_app_verified_sessions';

// Helper to check if an email has been recently verified
const isRecentlyVerified = (email: string, expiryMinutes: number): boolean => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
    if (!sessionsData) return false;

    const sessions: VerifiedSession[] = JSON.parse(sessionsData);
    const session = sessions.find(s => s.email === normalizedEmail);
    
    if (!session) return false;
    
    // Validate session has required fields
    if (!session.expiresAt || typeof session.expiresAt !== 'number') {
      return false;
    }

    const now = Date.now();
    if (now > session.expiresAt) {
      // Session expired, clean it up
      cleanupExpiredSessions();
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error checking verification session:', err);
    return false;
  }
};

// Save a verified session
const saveVerifiedSession = (email: string, expiryMinutes: number): void => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
    let sessions: VerifiedSession[] = sessionsData ? JSON.parse(sessionsData) : [];
    
    // Remove any existing session for this email
    sessions = sessions.filter(s => s.email !== normalizedEmail);
    
    // Add new session
    const now = Date.now();
    sessions.push({
      email: normalizedEmail,
      verifiedAt: now,
      expiresAt: now + (expiryMinutes * 60 * 1000)
    });
    
    localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error saving verification session:', err);
  }
};

// Clean up expired sessions
const cleanupExpiredSessions = (): void => {
  try {
    const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
    if (!sessionsData) return;

    const sessions: VerifiedSession[] = JSON.parse(sessionsData);
    const now = Date.now();
    const activeSessions = sessions.filter(s => s.expiresAt > now);
    
    if (activeSessions.length !== sessions.length) {
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(activeSessions));
    }
  } catch (err) {
    console.error('Error cleaning up sessions:', err);
  }
};

export const useVerification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(15);
  const [verificationState, setVerificationState] = useState<VerificationState>({
    codeId: null,
    expiresAt: null,
    email: null
  });

  // Check if email verification is enabled in admin settings
  useEffect(() => {
    const checkIfEnabled = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('require_email_verification, verification_code_expiry_minutes')
          .eq('id', 1)
          .maybeSingle();

        if (error) {
          console.error('Error checking verification setting:', error);
          // Default to disabled if we can't check
          setIsEnabled(false);
          return;
        }

        const enabled = data?.require_email_verification ?? false;
        const expiry = data?.verification_code_expiry_minutes ?? 15;
        setIsEnabled(enabled);
        setExpiryMinutes(expiry);
        
        // Clean up expired sessions on load
        cleanupExpiredSessions();
      } catch (err) {
        console.error('Error checking verification setting:', err);
        setIsEnabled(false);
      }
    };

    checkIfEnabled();
  }, []);

  /**
   * Request a verification code to be sent to the user's email
   * @param email - User's email address
   * @param actionType - Type of action being verified
   * @param actionData - Data to be submitted after verification
   * @returns Object with codeId and expiresAt, or null if verification is disabled or recently verified
   */
  const requestCode = useCallback(async (
    email: string,
    actionType: string,
    actionData: any
  ): Promise<{ codeId: string; expiresAt: string } | null> => {
    // If verification is disabled, return null to signal skip
    if (!isEnabled) {
      return null;
    }

    // Check if this email was recently verified
    if (isRecentlyVerified(email, expiryMinutes)) {
      return null; // Skip verification, they're still in the valid window
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke(
        'send-verification-code',
        {
          body: {
            email: email.toLowerCase().trim(),
            actionType,
            actionData
          }
        }
      );

      if (functionError) {
        console.error('Error requesting code:', functionError);
        throw new Error(functionError.message || 'Failed to send verification code');
      }

      if (data?.error) {
        console.error('Data error:', data.error);
        throw new Error(data.error);
      }

      if (!data.success || !data.codeId || !data.expiresAt) {
        throw new Error('Invalid response from verification service');
      }

      setVerificationState({
        codeId: data.codeId,
        expiresAt: data.expiresAt,
        email: email.toLowerCase().trim()
      });

      return {
        codeId: data.codeId,
        expiresAt: data.expiresAt
      };

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
      console.error('Request code error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, expiryMinutes]);

  /**
   * Verify a code entered by the user
   * @param codeId - ID of the verification code record
   * @param code - 6-digit code entered by user
   * @returns Object with actionType and actionData if valid
   */
  const verifyCode = useCallback(async (
    codeId: string,
    code: string
  ): Promise<{ actionType: string; actionData: any; email: string }> => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke(
        'verify-code',
        {
          body: {
            codeId,
            code
          }
        }
      );

      if (functionError) {
        console.error('Error verifying code:', functionError);
        throw new Error(functionError.message || 'Failed to verify code');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.success || !data.actionType || !data.actionData) {
        throw new Error('Invalid verification response');
      }

      // Save verification session so user doesn't need to verify again for a while
      if (data.email) {
        saveVerifiedSession(data.email, expiryMinutes);
      }

      // Clear verification state after successful verification
      setVerificationState({
        codeId: null,
        expiresAt: null,
        email: null
      });

      return {
        actionType: data.actionType,
        actionData: data.actionData,
        email: data.email
      };

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify code';
      console.error('Verify code error:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [expiryMinutes]);

  /**
   * Clear any error messages
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset the verification state
   */
  const reset = useCallback(() => {
    setVerificationState({
      codeId: null,
      expiresAt: null,
      email: null
    });
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    error,
    isEnabled,
    verificationState,

    // Methods
    requestCode,
    verifyCode,
    clearError,
    reset
  };
};
