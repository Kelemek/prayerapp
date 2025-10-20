import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface VerificationState {
  codeId: string | null;
  expiresAt: string | null;
  email: string | null;
}

export const useVerification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
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
          .select('require_email_verification')
          .eq('id', 1)
          .maybeSingle();

        if (error) {
          console.error('Error checking verification setting:', error);
          // Default to disabled if we can't check
          setIsEnabled(false);
          return;
        }

        setIsEnabled(data?.require_email_verification ?? false);
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
   * @returns Object with codeId and expiresAt, or null if verification is disabled
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

    try {
      setIsLoading(true);
      setError(null);

      console.log(`📧 Requesting verification code for ${email}`);

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

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.success || !data.codeId || !data.expiresAt) {
        throw new Error('Invalid response from verification service');
      }

      console.log(`✅ Verification code sent to ${email}`);

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
  }, [isEnabled]);

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

      console.log(`🔐 Verifying code for ID: ${codeId}`);

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

      console.log(`✅ Code verified successfully`);

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
  }, []);

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
