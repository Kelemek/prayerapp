import React, { useState, useEffect } from 'react';
import { Mail, Plus, X, Save, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailSettingsProps {
  onSave?: () => void;
}

export const EmailSettings: React.FC<EmailSettingsProps> = ({ onSave }) => {
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailDistribution, setEmailDistribution] = useState<'admin_only' | 'all_users'>('admin_only');
  const [daysBeforeOngoing, setDaysBeforeOngoing] = useState<number>(30);
  const [reminderIntervalDays, setReminderIntervalDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load email list from Supabase
  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('notification_emails, email_distribution, days_before_ongoing, reminder_interval_days')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error loading emails:', error);
        throw error;
      }

      if (data?.notification_emails) {
        setEmails(data.notification_emails);
      } else {
        // No row exists yet, that's okay - we'll create it on save
        setEmails([]);
      }

      if (data?.email_distribution) {
        setEmailDistribution(data.email_distribution as 'admin_only' | 'all_users');
      }

      if (data?.days_before_ongoing !== null && data?.days_before_ongoing !== undefined) {
        setDaysBeforeOngoing(data.days_before_ongoing);
      }

      if (data?.reminder_interval_days !== null && data?.reminder_interval_days !== undefined) {
        setReminderIntervalDays(data.reminder_interval_days);
      }
    } catch (err: any) {
      console.error('Error loading emails:', err);
      setError('Failed to load email settings. Please make sure the database table is set up correctly.');
    } finally {
      setLoading(false);
    }
  };

  const saveEmails = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          id: 1, // Use a fixed ID for singleton settings
          notification_emails: emails,
          email_distribution: emailDistribution,
          days_before_ongoing: daysBeforeOngoing,
          reminder_interval_days: reminderIntervalDays,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      if (onSave) onSave();
    } catch (err: any) {
      console.error('Error saving emails:', err);
      setError('Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const addEmail = () => {
    const trimmedEmail = newEmail.trim();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (emails.includes(trimmedEmail)) {
      setError('This email is already in the list');
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setNewEmail('');
    setError(null);
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(email => email !== emailToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  const runAutoTransition = async () => {
    try {
      setError(null);
      const { data, error: functionError } = await supabase.functions.invoke('auto-transition-prayers');

      if (functionError) {
        console.error('Error running auto-transition:', functionError);
        setError('Failed to run auto-transition');
        return;
      }

      if (data) {
        console.log('Auto-transition result:', data);
        alert(`Successfully transitioned ${data.transitioned} prayers from Current to Ongoing`);
      }
    } catch (err: any) {
      console.error('Error running auto-transition:', err);
      setError('Failed to run auto-transition');
    }
  };

  const runReminderCheck = async () => {
    try {
      setError(null);
      const { data, error: functionError } = await supabase.functions.invoke('send-prayer-reminders');

      if (functionError) {
        console.error('Error sending reminders:', functionError);
        setError('Failed to send reminders');
        return;
      }

      if (data) {
        console.log('Reminder result:', data);
        alert(`Successfully sent ${data.sent || 0} reminder emails`);
      }
    } catch (err: any) {
      console.error('Error sending reminders:', err);
      setError('Failed to send reminders');
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Mail className="text-blue-600 dark:text-blue-400" size={24} />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Email Notifications
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Configure who receives email notifications when prayers and updates are approved.
      </p>

      {/* Email Distribution Setting */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Send Approved Prayer Emails To:
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="emailDistribution"
              value="admin_only"
              checked={emailDistribution === 'admin_only'}
              onChange={(e) => setEmailDistribution(e.target.value as 'admin_only')}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Admin Only
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Only admin emails below will receive notifications
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="emailDistribution"
              value="all_users"
              checked={emailDistribution === 'all_users'}
              onChange={(e) => setEmailDistribution(e.target.value as 'all_users')}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                All Users
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Send to all email addresses in the database
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Auto-Transition Setting */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Auto-Transition to Ongoing
        </label>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Automatically move prayers from "Current" to "Ongoing" after the specified number of days.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            max="365"
            value={daysBeforeOngoing}
            onChange={(e) => setDaysBeforeOngoing(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">days</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Set to 0 to disable auto-transition.
        </p>
        <button
          onClick={runAutoTransition}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors text-sm"
        >
          <RefreshCw size={16} />
          Run Transition Now
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Manually trigger the auto-transition check. This will transition any prayers that meet the criteria.
        </p>
      </div>

      {/* Prayer Update Reminder Setting */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Prayer Update Reminders
        </label>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Send email reminders to prayer requesters to update their prayer requests every specified number of days.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="1"
            max="90"
            value={reminderIntervalDays}
            onChange={(e) => setReminderIntervalDays(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
            className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">days</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Set to 0 to disable reminder emails. Reminders are sent for prayers with status "Current" or "Ongoing".
        </p>
        <button
          onClick={runReminderCheck}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors text-sm"
        >
          <RefreshCw size={16} />
          Send Reminders Now
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Manually trigger reminder emails. This will send reminders to all eligible prayer requesters.
        </p>
      </div>

      {/* Add Email Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Add Admin Email
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="admin@example.com"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addEmail}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Email List */}
      {emails.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Admin Email List ({emails.length})
          </label>
          <div className="space-y-2">
            {emails.map((email, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-md border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-800 dark:text-gray-200">{email}</span>
                </div>
                <button
                  onClick={() => removeEmail(email)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 focus:outline-none"
                  title="Remove email"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {emails.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            No email addresses configured. Add at least one admin email to receive notifications.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            Email settings saved successfully!
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveEmails}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};
