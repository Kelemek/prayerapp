import React, { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw, ChevronDown, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailSettingsProps {
  onSave?: () => void;
}

export const EmailSettings: React.FC<EmailSettingsProps> = ({ onSave }) => {
  const [requireEmailVerification, setRequireEmailVerification] = useState<boolean>(false);
  const [verificationCodeLength, setVerificationCodeLength] = useState<number>(6);
  const [verificationCodeExpiryMinutes, setVerificationCodeExpiryMinutes] = useState<number>(15);
  const [reminderIntervalDays, setReminderIntervalDays] = useState<number>(7);
  const [appTitle, setAppTitle] = useState<string>('Church Prayer Manager');
  const [appSubtitle, setAppSubtitle] = useState<string>('Keeping our community connected in prayer');
  const [loading, setLoading] = useState(true);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingVerification, setSavingVerification] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBranding, setSuccessBranding] = useState(false);
  const [successVerification, setSuccessVerification] = useState(false);
  const [successReminders, setSuccessReminders] = useState(false);

  // Load email list from Supabase
  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('require_email_verification, verification_code_length, verification_code_expiry_minutes, days_before_ongoing, reminder_interval_days, app_title, app_subtitle')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error loading emails:', error);
        throw error;
      }

      if (data?.require_email_verification !== null && data?.require_email_verification !== undefined) {
        setRequireEmailVerification(data.require_email_verification);
      }

      if (data?.verification_code_length !== null && data?.verification_code_length !== undefined) {
        setVerificationCodeLength(data.verification_code_length);
      }

      if (data?.verification_code_expiry_minutes !== null && data?.verification_code_expiry_minutes !== undefined) {
        setVerificationCodeExpiryMinutes(data.verification_code_expiry_minutes);
      }

      if (data?.reminder_interval_days !== null && data?.reminder_interval_days !== undefined) {
        setReminderIntervalDays(data.reminder_interval_days);
      }

      if (data?.app_title) {
        setAppTitle(data.app_title);
      }

      if (data?.app_subtitle) {
        setAppSubtitle(data.app_subtitle);
      }
    } catch (err: unknown) {
      console.error('Error loading emails:', err);
      setError('Failed to load email settings. Please make sure the database table is set up correctly.');
    } finally {
      setLoading(false);
    }
  };

  const saveVerificationSettings = async () => {
    try {
      setSavingVerification(true);
      setError(null);

      const dataToSave = {
        id: 1,
        require_email_verification: requireEmailVerification,
        verification_code_length: verificationCodeLength,
        verification_code_expiry_minutes: verificationCodeExpiryMinutes,
        app_title: appTitle,
        app_subtitle: appSubtitle,
        updated_at: new Date().toISOString()
      };

      console.log('🔍 Saving distribution settings:', dataToSave);

      const { data, error } = await supabase
        .from('admin_settings')
        .upsert(dataToSave)
        .select();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Save successful, returned data:', data);

      setSuccessVerification(true);
      setTimeout(() => setSuccessVerification(false), 3000);
      
      if (onSave) onSave();
    } catch (err: unknown) {
      console.error('Error saving distribution settings:', err);
      setError('Failed to save distribution settings');
    } finally {
      setSavingVerification(false);
    }
  };

  const saveBrandingSettings = async () => {
    try {
      setSavingBranding(true);
      setError(null);

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          id: 1,
          app_title: appTitle,
          app_subtitle: appSubtitle,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccessBranding(true);
      setTimeout(() => setSuccessBranding(false), 3000);
      
      if (onSave) onSave();
    } catch (err: unknown) {
      console.error('Error saving branding settings:', err);
      setError('Failed to save branding settings');
    } finally {
      setSavingBranding(false);
    }
  };

  const saveReminderSettings = async () => {
    try {
      setSavingReminders(true);
      setError(null);

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          id: 1,
          reminder_interval_days: reminderIntervalDays,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccessReminders(true);
      setTimeout(() => setSuccessReminders(false), 3000);
      
      if (onSave) onSave();
    } catch (err: unknown) {
      console.error('Error saving reminder settings:', err);
      setError('Failed to save reminder settings');
    } finally {
      setSavingReminders(false);
    }
  };

  const runReminderCheck = async () => {
    try {
      setSendingReminders(true);
      setError(null);
      const { data, error: functionError } = await supabase.functions.invoke('send-prayer-reminders');

      if (functionError) {
        console.error('Error sending reminders:', functionError);
        const errorMessage = functionError.message || JSON.stringify(functionError);
        
        // Check for common deployment issue
        if (errorMessage.includes('Failed to send a request to the Edge Function') || 
            errorMessage.includes('FunctionsRelayError') ||
            errorMessage.includes('Not Found')) {
          setError('Edge function not deployed. Please deploy the send-prayer-reminders function first.');
          alert(
            '⚠️ Edge Function Not Deployed\n\n' +
            'The send-prayer-reminders function needs to be deployed to Supabase.\n\n' +
            'To fix this:\n' +
            '1. Install Supabase CLI: npm install -g supabase\n' +
            '2. Login: supabase login\n' +
            '3. Link project: supabase link --project-ref YOUR_PROJECT_REF\n' +
            '4. Deploy: supabase functions deploy send-prayer-reminders\n\n' +
            'See DEPLOY_REMINDERS_FUNCTION.md for detailed instructions.'
          );
        } else {
          setError(`Failed to send reminders: ${errorMessage}`);
          alert(`Failed to send reminders: ${errorMessage}`);
        }
        return;
      }

      if (data) {
        console.log('Reminder result:', data);
        if (data.error) {
          setError(`Error: ${data.error}. ${data.details ? JSON.stringify(data.details) : ''}`);
          alert(`Error: ${data.error}\n\nDetails: ${data.details ? JSON.stringify(data.details, null, 2) : 'None'}`);
        } else {
          alert(`Successfully sent ${data.sent || 0} reminder emails${data.total ? ` out of ${data.total} eligible prayers` : ''}`);
        }
      }
    } catch (err: unknown) {
      console.error('Error sending reminders:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : JSON.stringify(err);
      setError(`Failed to send reminders: ${errorMessage}`);
      alert(`Failed to send reminders: ${errorMessage}`);
    } finally {
      setSendingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading email settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* App Branding Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="text-purple-600 dark:text-purple-400" size={24} />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
            App Branding
          </h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Customize the title and tagline displayed at the top of your app.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              App Title
            </label>
            <input
              type="text"
              value={appTitle}
              onChange={(e) => setAppTitle(e.target.value)}
              placeholder="Church Prayer Manager"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Main heading displayed in the app header
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              App Subtitle/Tagline
            </label>
            <input
              type="text"
              value={appSubtitle}
              onChange={(e) => setAppSubtitle(e.target.value)}
              placeholder="Keeping our community connected in prayer"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Descriptive tagline shown under the title (hidden on mobile)
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={saveBrandingSettings}
            disabled={savingBranding}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingBranding ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Branding Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Email Verification Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="text-blue-600 dark:text-blue-400" size={24} />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
            Email Verification (2FA)
          </h3>
        </div>

        {/* Email Verification Requirement */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireEmailVerification}
                  onChange={(e) => setRequireEmailVerification(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Require Email Verification (2FA)
                </span>
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-6">
                When enabled, users must verify their email address with a code before submitting:
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6 space-y-1">
                <li>• Prayer requests</li>
                <li>• Prayer updates</li>
                <li>• Deletion requests</li>
                <li>• Status change requests</li>
                <li>• Email preference changes</li>
              </ul>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 ml-6 font-medium">
                ✓ Prevents spam and validates email addresses
              </p>

              {/* Verification Code Settings */}
              {requireEmailVerification && (
                <div className="mt-4 ml-6 space-y-4">
                  {/* Code Length */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Verification Code Length
                    </label>
                    <div className="relative">
                      <select
                        value={verificationCodeLength}
                        onChange={(e) => setVerificationCodeLength(Number(e.target.value))}
                        className="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                      >
                        <option value={4}>4 digits</option>
                        <option value={6}>6 digits (recommended)</option>
                        <option value={8}>8 digits</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" size={18} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Length of verification code sent to users
                    </p>
                  </div>

                  {/* Code Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Code Expiration Time
                    </label>
                    <div className="relative">
                      <select
                        value={verificationCodeExpiryMinutes}
                        onChange={(e) => setVerificationCodeExpiryMinutes(Number(e.target.value))}
                        className="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                      >
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes (recommended)</option>
                        <option value={20}>20 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" size={18} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      How long verification codes remain valid
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {successVerification && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 mt-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              Email verification settings saved successfully!
            </p>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={saveVerificationSettings}
            disabled={savingVerification}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingVerification ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Verification Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prayer Update Reminders Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="text-orange-600 dark:text-orange-400" size={24} />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
            Prayer Update Reminders
          </h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Send email reminders to prayer requesters when their prayers have had no updates for the specified number of days.
        </p>

        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="number"
              min="0"
              max="90"
              value={reminderIntervalDays}
              onChange={(e) => setReminderIntervalDays(Math.max(0, Math.min(90, parseInt(e.target.value) || 0)))}
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">days of inactivity</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Set to 0 to disable reminder emails. Only prayers with no recent updates will receive reminders.
          </p>
          <button
            onClick={runReminderCheck}
            disabled={sendingReminders}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={sendingReminders ? 'animate-spin' : ''} />
            {sendingReminders ? 'Sending...' : 'Send Reminders Now'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Manually trigger reminder emails. Only sends to prayers that haven't had updates in the specified number of days.
          </p>
        </div>

        {successReminders && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 mb-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              Reminder settings saved successfully!
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={saveReminderSettings}
            disabled={savingReminders}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingReminders ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Reminder Settings
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  );
};
