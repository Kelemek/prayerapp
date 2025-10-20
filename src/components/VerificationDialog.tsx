import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, Clock, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useVerification } from '../hooks/useVerification';

interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (actionData: any) => void;
  onResend: () => Promise<void>;
  email: string;
  codeId: string;
  expiresAt: string;
}

export const VerificationDialog: React.FC<VerificationDialogProps> = ({
  isOpen,
  onClose,
  onVerified,
  onResend,
  email,
  codeId,
  expiresAt
}) => {
  const { verifyCode } = useVerification();
  const [codeLength, setCodeLength] = useState<number>(6);
  const [code, setCode] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch code length from admin settings
  useEffect(() => {
    const fetchCodeLength = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('verification_code_length')
          .eq('id', 1)
          .maybeSingle();

        if (!error && data?.verification_code_length) {
          const length = data.verification_code_length;
          setCodeLength(length);
          setCode(new Array(length).fill(''));
        } else {
          setCode(new Array(6).fill(''));
        }
      } catch (err) {
        console.error('Failed to fetch code length:', err);
        setCode(new Array(6).fill(''));
      }
    };

    if (isOpen) {
      fetchCodeLength();
    }
  }, [isOpen]);

  // Calculate time remaining
  useEffect(() => {
    if (!isOpen || !expiresAt) return;

    const updateTimer = () => {
      const expires = new Date(expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setError('Code expired. Please request a new one.');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isOpen]);

  // Focus first input when dialog opens
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setCode(new Array(codeLength).fill(''));
      setError(null);
    }
  }, [isOpen, codeLength]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'Enter' && code.every(c => c)) {
      // Verify on Enter if all digits are filled
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    
    if (fullCode.length !== codeLength) {
      setError(`Please enter all ${codeLength} digits`);
      return;
    }

    if (timeRemaining === 0) {
      setError('Code expired. Please request a new one.');
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      // Use the verifyCode function from the hook - this will save the session!
      const result = await verifyCode(codeId, fullCode);
      
      // Pass the action data to the parent component
      onVerified(result.actionData);
      onClose();
    } catch (err: unknown) {
      console.error('Verification error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify code. Please try again.';
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      setError(null);
      setCode(['', '', '', '', '', '']);
      await onResend();
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      console.error('Resend error:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  const isExpired = timeRemaining === 0;
  const isCodeComplete = code.every(c => c);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <Mail size={32} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Your Email
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We've sent a {codeLength}-digit code to
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {email}
          </p>
        </div>

        {/* Timer */}
        <div className={`flex items-center justify-center gap-2 mb-6 p-3 rounded-lg ${
          isExpired 
            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            : timeRemaining < 60
            ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
        }`}>
          <Clock size={16} />
          <span className="text-sm font-medium">
            {isExpired ? 'Code expired' : `Expires in ${formatTime(timeRemaining)}`}
          </span>
        </div>

        {/* Code inputs */}
        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isExpired}
              className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg
                ${isExpired
                  ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400'
                }
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                transition-colors`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400 text-center">
              {error}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleVerify}
            disabled={!isCodeComplete || isVerifying || isExpired}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 
              focus:ring-blue-500 font-medium transition-colors"
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Verifying...
              </span>
            ) : (
              'Verify Code'
            )}
          </button>

          <button
            onClick={handleResend}
            disabled={isResending}
            className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-600 
              text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
              disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 
              focus:ring-gray-500 font-medium transition-colors"
          >
            {isResending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600 dark:border-gray-400"></div>
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={16} />
                Resend Code
              </span>
            )}
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          Didn't receive the code? Check your spam folder or click Resend Code
        </p>
      </div>
    </div>
  );
};
