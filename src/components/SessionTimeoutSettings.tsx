import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Cache timeout settings outside component to persist across re-mounts
interface CachedSettings {
  inactivityTimeout: number;
  maxSessionDuration: number;
  dbHeartbeatInterval: number;
}
let cachedTimeoutSettings: CachedSettings | null = null;

export const SessionTimeoutSettings: React.FC = () => {
  const [inactivityTimeout, setInactivityTimeout] = useState(cachedTimeoutSettings?.inactivityTimeout ?? 30);
  const [maxSessionDuration, setMaxSessionDuration] = useState(cachedTimeoutSettings?.maxSessionDuration ?? 480);
  const [dbHeartbeatInterval, setDbHeartbeatInterval] = useState(cachedTimeoutSettings?.dbHeartbeatInterval ?? 1);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(cachedTimeoutSettings === null);
  const hasLoadedRef = useRef(cachedTimeoutSettings !== null);

  const loadSettings = useCallback(async () => {
    // Only load once
    if (hasLoadedRef.current) return;

    try {
      setLoading(true);
      
      // Try loading from localStorage first
      const cached = localStorage.getItem('adminTimeoutSettings');
      if (cached) {
        try {
          const settings = JSON.parse(cached);
          const inactivity = settings.inactivityTimeoutMinutes || 30;
          const maxSession = settings.maxSessionDurationMinutes || 480;
          const heartbeat = settings.dbHeartbeatIntervalMinutes || 1;
          
          setInactivityTimeout(inactivity);
          setMaxSessionDuration(maxSession);
          setDbHeartbeatInterval(heartbeat);
          
          // Cache in memory for next mount
          cachedTimeoutSettings = { inactivityTimeout: inactivity, maxSessionDuration: maxSession, dbHeartbeatInterval: heartbeat };
          
          console.log('[SessionTimeoutSettings] Loaded settings from localStorage');
          hasLoadedRef.current = true;
          setLoading(false);
          return;
        } catch (parseError) {
          console.error('Error parsing cached settings:', parseError);
          localStorage.removeItem('adminTimeoutSettings');
        }
      }
      
      // Fall back to database
      const { data, error: fetchError } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error('Error loading settings:', fetchError);
        setError('Failed to load settings from database');
        hasLoadedRef.current = true;
        return;
      }

      if (data) {
        const inactivity = data.inactivity_timeout_minutes || 30;
        const maxSession = data.max_session_duration_minutes || 480;
        const heartbeat = data.db_heartbeat_interval_minutes || 1;
        
        setInactivityTimeout(inactivity);
        setMaxSessionDuration(maxSession);
        setDbHeartbeatInterval(heartbeat);
        
        // Cache in memory for next mount
        cachedTimeoutSettings = { inactivityTimeout: inactivity, maxSessionDuration: maxSession, dbHeartbeatInterval: heartbeat };
      }
      
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
      hasLoadedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      if (inactivityTimeout < 5) {
        setError('Inactivity timeout must be at least 5 minutes');
        return;
      }
      if (maxSessionDuration < 30) {
        setError('Max session duration must be at least 30 minutes');
        return;
      }
      if (dbHeartbeatInterval < 1) {
        setError('Database heartbeat interval must be at least 1 minute');
        return;
      }
      if (dbHeartbeatInterval >= inactivityTimeout) {
        setError('Database heartbeat must be less frequent than inactivity timeout');
        return;
      }

      setLoading(true);

      const { error: upsertError } = await supabase
        .from('admin_settings')
        .upsert(
          {
            id: 1, // Always use id 1 for single settings row
            inactivity_timeout_minutes: inactivityTimeout,
            max_session_duration_minutes: maxSessionDuration,
            db_heartbeat_interval_minutes: dbHeartbeatInterval,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        setError('Failed to save settings to database');
        console.error('Save error:', upsertError);
        return;
      }

      // Also cache settings in localStorage for instant load on next visit
      try {
        const cachedSettings = {
          inactivityTimeoutMinutes: inactivityTimeout,
          maxSessionDurationMinutes: maxSessionDuration,
          dbHeartbeatIntervalMinutes: dbHeartbeatInterval,
        };
        localStorage.setItem('adminTimeoutSettings', JSON.stringify(cachedSettings));
        
        // Also update in-memory cache
        cachedTimeoutSettings = {
          inactivityTimeout,
          maxSessionDuration,
          dbHeartbeatInterval,
        };
        
        console.log('[SessionTimeoutSettings] Cached updated timeout settings in localStorage');
      } catch (storageError) {
        console.error('Error caching timeout settings in localStorage:', storageError);
      }

      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading settings...</span>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Session Timeout Configuration</p>
                <p>These settings control how long admin sessions remain active and how frequently the database connection is kept alive. Changes take effect for new sessions and existing active sessions.</p>
              </div>
            </div>
          </div>

          {/* Inactivity Timeout */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-orange-600 dark:text-orange-400" size={24} />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
                Inactivity Timeout
              </h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How long an admin session can remain inactive before automatic logout. No interaction includes: mouse movement, clicks, keyboard input, scrolling, or touch events. Switching tabs does not count toward inactivity.
              </p>
              
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="5"
                  value={inactivityTimeout}
                  onChange={(e) => setInactivityTimeout(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-gray-600 dark:text-gray-400">minutes</span>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-3 border border-orange-200 dark:border-orange-700">
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  Current setting: <strong>{formatTime(inactivityTimeout)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Max Session Duration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-purple-600 dark:text-purple-400" size={24} />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
                Maximum Session Duration
              </h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Maximum time an admin session can remain active, regardless of user activity. This provides an additional security layer by forcing re-authentication after a long session.
              </p>
              
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="30"
                  value={maxSessionDuration}
                  onChange={(e) => setMaxSessionDuration(Math.max(30, parseInt(e.target.value) || 30))}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-gray-600 dark:text-gray-400">minutes</span>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3 border border-purple-200 dark:border-purple-700">
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  Current setting: <strong>{formatTime(maxSessionDuration)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Database Heartbeat */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="text-green-600 dark:text-green-400" size={24} />
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
                Database Heartbeat Interval
              </h3>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How frequently a lightweight query is sent to keep the Supabase database awake. Supabase free tier pauses after ~5 minutes of inactivity. Keep this interval less than 5 minutes and less frequent than the inactivity timeout.
              </p>
              
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  value={dbHeartbeatInterval}
                  onChange={(e) => setDbHeartbeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <span className="text-gray-600 dark:text-gray-400">minutes</span>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 border border-green-200 dark:border-green-700">
                <p className="text-xs text-green-800 dark:text-green-200">
                  Current setting: <strong>{formatTime(dbHeartbeatInterval)}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 flex gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {saved && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 flex gap-3">
              <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
              <p className="text-sm text-green-800 dark:text-green-200">Settings saved successfully! Changes will apply to new admin sessions.</p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Save Settings
            </button>
          </div>
        </>
      )}
    </div>
  );
};
