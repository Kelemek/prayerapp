import React, { useState, useEffect } from 'react';
import { Save, Settings, Upload, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AppBrandingProps {
  onSave?: () => void;
}

export const AppBranding: React.FC<AppBrandingProps> = ({ onSave }) => {
  const [appTitle, setAppTitle] = useState<string>('Church Prayer Manager');
  const [appSubtitle, setAppSubtitle] = useState<string>('Keeping our community connected in prayer');
  const [useLogo, setUseLogo] = useState<boolean>(false);
  const [lightModeLogoUrl, setLightModeLogoUrl] = useState<string>('');
  const [darkModeLogoUrl, setDarkModeLogoUrl] = useState<string>('');
  const [allowUserDeletions, setAllowUserDeletions] = useState<boolean>(true);
  const [allowUserUpdates, setAllowUserUpdates] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadBrandingSettings();
  }, []);

  const loadBrandingSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_settings')
        .select('app_title, app_subtitle, use_logo, light_mode_logo_blob, dark_mode_logo_blob, allow_user_deletions, allow_user_updates')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error loading branding settings:', error);
        throw error;
      }

      if (data?.app_title) {
        setAppTitle(data.app_title);
      }

      if (data?.app_subtitle) {
        setAppSubtitle(data.app_subtitle);
      }

      if (data?.use_logo !== null && data?.use_logo !== undefined) {
        setUseLogo(data.use_logo);
      }

      if (data?.light_mode_logo_blob) {
        setLightModeLogoUrl(data.light_mode_logo_blob);
      }

      if (data?.dark_mode_logo_blob) {
        setDarkModeLogoUrl(data.dark_mode_logo_blob);
      }

      if (data?.allow_user_deletions !== null && data?.allow_user_deletions !== undefined) {
        setAllowUserDeletions(data.allow_user_deletions);
      }

      if (data?.allow_user_updates !== null && data?.allow_user_updates !== undefined) {
        setAllowUserUpdates(data.allow_user_updates);
      }
    } catch (err: unknown) {
      console.error('Error loading branding settings:', err);
      setError('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File, mode: 'light' | 'dark') => {
    try {
      setUploading(true);
      setError(null);

      // Convert file to base64 data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        if (mode === 'light') {
          setLightModeLogoUrl(base64String);
        } else {
          setDarkModeLogoUrl(base64String);
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setError('Failed to read image file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      console.error('Error processing logo:', err);
      setError('Failed to process logo');
      setUploading(false);
    }
  };

  const saveBrandingSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          id: 1,
          app_title: appTitle,
          app_subtitle: appSubtitle,
          use_logo: useLogo,
          light_mode_logo_blob: lightModeLogoUrl || null,
          dark_mode_logo_blob: darkModeLogoUrl || null,
          allow_user_deletions: allowUserDeletions,
          allow_user_updates: allowUserUpdates,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      if (onSave) onSave();
    } catch (err: unknown) {
      console.error('Error saving branding settings:', err);
      setError('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLogo = (mode: 'light' | 'dark') => {
    if (mode === 'light') {
      setLightModeLogoUrl('');
    } else {
      setDarkModeLogoUrl('');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="text-purple-600 dark:text-purple-400" size={24} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          App Branding
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Customize the title and tagline displayed at the top of your app.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

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

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useLogo}
              onChange={(e) => setUseLogo(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Use logo instead of title/subtitle
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-6">
            When enabled, displays custom logo images instead of the app title and subtitle. Upload separate images for light and dark modes.
          </p>
        </div>

        {useLogo && (
          <>
            {/* Light Mode Logo Upload */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Light Mode Logo
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleLogoUpload(e.target.files[0], 'light');
                      }
                    }}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Recommended size: 200-300px width, transparent background
                  </p>
                </div>
                {lightModeLogoUrl && (
                  <button
                    onClick={() => handleDeleteLogo('light')}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>
              {lightModeLogoUrl && (
                <div className="mt-3 p-3 bg-white dark:bg-white rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">Preview (Light Mode):</p>
                  <img 
                    src={lightModeLogoUrl} 
                    alt="Light Mode Logo Preview" 
                    className="h-16 w-auto max-w-xs"
                  />
                </div>
              )}
            </div>

            {/* Dark Mode Logo Upload */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Dark Mode Logo
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleLogoUpload(e.target.files[0], 'dark');
                      }
                    }}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Recommended size: 200-300px width, transparent background
                  </p>
                </div>
                {darkModeLogoUrl && (
                  <button
                    onClick={() => handleDeleteLogo('dark')}
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                )}
              </div>
              {darkModeLogoUrl && (
                <div className="mt-3 p-3 bg-gray-800 dark:bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-xs font-medium text-gray-300 mb-2">Preview (Dark Mode):</p>
                  <img 
                    src={darkModeLogoUrl} 
                    alt="Dark Mode Logo Preview" 
                    className="h-16 w-auto max-w-xs"
                  />
                </div>
              )}
            </div>
          </>
        )}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowUserDeletions}
              onChange={(e) => setAllowUserDeletions(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Allow users to delete prayers and updates
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-6">
            When enabled, users can request to delete prayer requests and updates from the front-end interface. Deletions require admin approval before taking effect. When disabled, all delete (trash can) icons are hidden from users (admins can still delete).
          </p>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowUserUpdates}
              onChange={(e) => setAllowUserUpdates(e.target.checked)}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Allow users to add updates to prayers
            </span>
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-6">
            When enabled, users can submit updates to existing prayer requests. Updates require admin approval before being displayed. When disabled, "Add Update" buttons are hidden from users (admins can still add updates).
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={saveBrandingSettings}
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
              Save Branding Settings
            </>
          )}
        </button>
      </div>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 mt-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            Branding settings saved successfully!
          </p>
        </div>
      )}
    </div>
  );
};
