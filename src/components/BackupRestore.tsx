import React, { useState } from 'react';
import { Download, Upload, Database, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const BackupRestore: React.FC = () => {
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createBackup = async () => {
    try {
      setBacking(true);
      setError(null);
      setSuccess(null);

      // Fetch all prayers with their updates
      const { data: prayers, error: prayersError } = await supabase
        .from('prayers')
        .select('*')
        .order('created_at', { ascending: true });

      if (prayersError) throw prayersError;

      const { data: updates, error: updatesError } = await supabase
        .from('prayer_updates')
        .select('*')
        .order('created_at', { ascending: true });

      if (updatesError) throw updatesError;

      // Create backup object
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        prayers: prayers || [],
        prayer_updates: updates || [],
      };

      // Convert to JSON and download
      const jsonString = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prayer-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(`Backup created successfully! Downloaded ${prayers?.length || 0} prayers and ${updates?.length || 0} updates.`);
    } catch (err: any) {
      console.error('Error creating backup:', err);
      setError(err.message);
    } finally {
      setBacking(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);

        // Validate backup structure
        if (!backup.prayers || !Array.isArray(backup.prayers)) {
          throw new Error('Invalid backup file format: missing prayers array');
        }

        await restoreBackup(backup);
      } catch (err: any) {
        console.error('Error reading backup file:', err);
        setError(err.message);
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  const restoreBackup = async (backup: any) => {
    if (!confirm(
      `Are you sure you want to restore this backup?\n\n` +
      `This will DELETE ALL current prayers and updates and replace them with:\n` +
      `• ${backup.prayers?.length || 0} prayers\n` +
      `• ${backup.prayer_updates?.length || 0} updates\n\n` +
      `THIS CANNOT BE UNDONE!`
    )) {
      return;
    }

    try {
      setRestoring(true);
      setError(null);
      setSuccess(null);

      // Delete all existing prayer_updates first (due to foreign key constraints)
      const { error: deleteUpdatesError } = await supabase
        .from('prayer_updates')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteUpdatesError) throw deleteUpdatesError;

      // Delete all existing prayers
      const { error: deletePrayersError } = await supabase
        .from('prayers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deletePrayersError) throw deletePrayersError;

      // Insert prayers from backup
      if (backup.prayers && backup.prayers.length > 0) {
        const { error: insertPrayersError } = await supabase
          .from('prayers')
          .insert(backup.prayers);

        if (insertPrayersError) throw insertPrayersError;
      }

      // Insert prayer updates from backup
      if (backup.prayer_updates && backup.prayer_updates.length > 0) {
        const { error: insertUpdatesError } = await supabase
          .from('prayer_updates')
          .insert(backup.prayer_updates);

        if (insertUpdatesError) throw insertUpdatesError;
      }

      setSuccess(
        `Backup restored successfully!\n` +
        `Restored ${backup.prayers?.length || 0} prayers and ${backup.prayer_updates?.length || 0} updates.`
      );

      // Reload the page to refresh data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      setError(err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Database className="text-indigo-600 dark:text-indigo-400" size={24} />
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
          Backup & Restore
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Create backups of all prayers and updates, or restore from a previous backup file.
      </p>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <CheckCircle size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-line">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Backup Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h4 className="font-medium text-gray-800 dark:text-gray-100">Create Backup</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Download a JSON file containing all prayers and updates. This file can be used to restore your data later.
          </p>
          <button
            onClick={createBackup}
            disabled={backing || restoring}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
          >
            {backing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Creating Backup...
              </>
            ) : (
              <>
                <Download size={18} />
                Download Backup
              </>
            )}
          </button>
        </div>

        {/* Restore Section */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="text-orange-600 dark:text-orange-400" size={20} />
            <h4 className="font-medium text-gray-800 dark:text-gray-100">Restore Backup</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload a backup JSON file to restore prayers and updates. <strong>Warning:</strong> This will replace all current data.
          </p>
          <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-colors cursor-pointer">
            {restoring ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Restoring...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload Backup File
              </>
            )}
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={backing || restoring}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Warning Notice */}
      <div className="mt-6 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <p className="font-semibold mb-1">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Backups include all prayers and their updates</li>
            <li>Restoring a backup will DELETE all current data</li>
            <li>Create regular backups to prevent data loss</li>
            <li>Store backup files in a safe location</li>
            <li>Pending approvals are NOT included in backups</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
