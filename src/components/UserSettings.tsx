import React, { useState, useEffect } from 'react';
import { Settings, Mail, X, CheckCircle, AlertTriangle, Sun, Moon, Monitor, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendPreferenceChangeNotification } from '../lib/emailNotifications';
import { downloadPrintablePrayerList } from '../utils/printablePrayerList';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSettings: React.FC<UserSettingsProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async (range: 'week' | 'month' | 'year') => {
    setIsPrinting(true);
    
    // Open window immediately (Safari requires this to be synchronous with user click)
    const newWindow = window.open('', '_blank');
    
    try {
      await downloadPrintablePrayerList(range, newWindow);
    } catch (error) {
      console.error('Error printing prayer list:', error);
      if (newWindow) newWindow.close();
    } finally {
      setIsPrinting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset states when modal opens
      setName('');
      setEmail('');
      setReceiveNotifications(true);
      setError(null);
      setSuccess(null);
      setHasPreferences(false);
      
      // Load current theme from localStorage
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
      setTheme(savedTheme || 'system');
    }
  }, [isOpen]);

  // Auto-load preferences when email changes (with debounce)
  useEffect(() => {
    if (!email.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;

    const timer = setTimeout(() => {
      loadPreferencesAutomatically();
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timer);
  }, [email]);

  const loadPreferencesAutomatically = async () => {
    try {
      const { data, error } = await supabase
        .from('email_subscribers')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('is_admin', false) // Only load regular user preferences, not admin subscribers
        .maybeSingle();

      if (error) {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setName(data.name || '');
        setReceiveNotifications(data.is_active);
        setHasPreferences(true);
      } else {
        // No preferences found, reset to defaults
        setName('');
        setReceiveNotifications(true);
        setHasPreferences(false);
      }
    } catch (err: any) {
      console.error('Error loading preferences:', err);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme immediately
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const savePreferences = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const emailLower = email.toLowerCase().trim();

      // Submit as pending preference change for admin approval
      const { error } = await supabase
        .from('pending_preference_changes')
        .insert({
          name: name.trim(),
          email: emailLower,
          receive_new_prayer_notifications: receiveNotifications
        });

      if (error) throw error;

      // Send admin notification email
      await sendPreferenceChangeNotification({
        name: name.trim(),
        email: emailLower,
        receiveNotifications
      });

      setSuccess(
        '✅ Your preference change has been submitted for approval! ' +
        'You will receive an email once approved. After approval, your preferences will be automatically updated the next time you open this settings panel.'
      );
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings className="text-purple-600 dark:text-purple-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Print Button */}
          <button
            onClick={() => handlePrint('week')}
            disabled={isPrinting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
          >
            <Printer size={18} className={isPrinting ? 'animate-spin' : ''} />
            <span className="font-medium">{isPrinting ? 'Generating...' : 'Print Prayer List'}</span>
          </button>

          {/* Theme Selection */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sun className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                  Theme Preference
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      theme === 'light'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                    }`}
                  >
                    <Sun size={20} className="text-amber-600" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Light</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      theme === 'dark'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                    }`}
                  >
                    <Moon size={20} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Dark</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      theme === 'system'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                    }`}
                  >
                    <Monitor size={20} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">System</span>
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Choose your preferred color theme or use your system settings
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Email Subscription Section Header */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Email Notification Preferences
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Manage your email subscription to receive notifications when new prayer requests are added. 
                  Enter your email below to opt-in or opt-out of notifications.
                </p>
              </div>
            </div>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setHasPreferences(false);
                setSuccess(null);
              }}
              placeholder="your.email@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your preferences will load automatically
            </p>
          </div>

          {/* Name Input - Only show after email is entered */}
          {email.trim() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Notification Preferences */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Mail className="text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiveNotifications}
                    onChange={(e) => setReceiveNotifications(e.target.checked)}
                    className="mt-1 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <div className="font-medium text-gray-800 dark:text-gray-100">
                      Receive new prayer notifications
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Get email notifications when new prayers are submitted to the prayer list
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Mail size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-2">How it works:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
                  <li>Enter your email to automatically load your current preferences</li>
                  <li>Toggle notifications on/off and click "Submit for Approval"</li>
                  <li>Admin will review and approve/deny your request</li>
                  <li>You'll receive an email confirmation once reviewed</li>
                  <li>After approval, your new settings take effect immediately</li>
                  <li>Reopen this settings panel to see your updated preferences</li>
                </ul>
                <p className="font-medium mb-1">You will always receive:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Approval/denial notifications for prayers you submit</li>
                  <li>Status update notifications for your prayers</li>
                </ul>
                <p className="mt-2">
                  This setting only controls notifications about <strong>other people's new prayers</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={savePreferences}
            disabled={saving || !email.trim() || !name.trim()}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Submitting...' : 'Submit for Approval'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
