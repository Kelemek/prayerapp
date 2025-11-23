import React, { useState, useEffect } from 'react';
import { Shield, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useAdminAuth } from '../hooks/useAdminAuthHook';
import { supabase } from '../lib/supabase';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { sendMagicLink } = useAdminAuth();

  // Check if we just sent a magic link (persisted across re-renders)
  useEffect(() => {
    const magicLinkSent = sessionStorage.getItem('magic_link_sent');
    const savedEmail = sessionStorage.getItem('magic_link_email');
    
    if (magicLinkSent === 'true' && savedEmail) {
      setSuccess(true);
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Clear any previous success state
    sessionStorage.removeItem('magic_link_sent');
    sessionStorage.removeItem('magic_link_email');

    try {
      // Check if email has admin privileges
      const { data: adminCheck, error: checkError } = await supabase
        .from('email_subscribers')
        .select('is_admin')
        .eq('email', email.toLowerCase().trim())
        .eq('is_admin', true)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking admin status:', checkError);
        setError('An error occurred. Please try again.');
        setLoading(false);
        return;
      }

      if (!adminCheck) {
        setError('This email address does not have admin access.');
        setLoading(false);
        return;
      }

      // Email is an admin, send magic link
      const result = await sendMagicLink(email);
      
      if (result.success) {
        // Save to sessionStorage to persist across re-renders
        sessionStorage.setItem('magic_link_sent', 'true');
        sessionStorage.setItem('magic_link_email', email);
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to send magic link. Please try again.');
      }
    } catch (err) {
      console.error('Error sending magic link:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
      <div className="max-w-md w-full mx-auto space-y-8 p-4 sm:p-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-600 dark:text-red-400" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Admin Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in with a magic link sent to your email
          </p>
        </div>

        {success ? (
          <div className="space-y-4">
            {/* Main success notification */}
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-6 shadow-lg">
              <div className="flex items-start gap-3 mb-4">
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={24} />
                <div className="flex-1">
                  <h3 className="text-green-900 dark:text-green-100 font-bold text-lg">
                    Magic Link Sent! 📧
                  </h3>
                  <p className="text-green-800 dark:text-green-200 text-sm mt-1">
                    We've sent a secure sign-in link to:
                  </p>
                  <p className="text-green-900 dark:text-green-100 font-semibold text-base mt-2">
                    {email}
                  </p>
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div className="mt-4 bg-white dark:bg-gray-800 rounded-md p-4 border border-green-200 dark:border-green-800">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  What to do next:
                </h4>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span>Open your email inbox and look for an email from Prayer App</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span>Click the <strong>"Sign in to Admin Portal"</strong> button in the email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span>You'll be automatically signed in to the Admin Portal</span>
                  </li>
                </ol>
              </div>

              {/* Additional info */}
              <div className="mt-4 flex items-start gap-2 text-xs text-green-700 dark:text-green-300">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Don't see the email?</strong> Check your spam/junk folder. The link expires in 60 minutes.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                // Clear sessionStorage
                sessionStorage.removeItem('magic_link_sent');
                sessionStorage.removeItem('magic_link_email');
                setSuccess(false);
                setEmail('');
              }}
              className="w-full py-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ← Send to a different email
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="sr-only">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 pr-3 py-3 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Admin Email Address"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Enter your admin email to receive a secure sign-in link
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
                <span className="text-red-800 dark:text-red-200 text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending magic link...
                </div>
              ) : (
                'Send Magic Link'
              )}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🔒 Passwordless authentication via Supabase Magic Link
          </p>
        </div>
      </div>
    </div>
  );
};