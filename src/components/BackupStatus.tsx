import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, CheckCircle, XCircle, Clock, Database, AlertCircle, Download, Upload, Loader } from 'lucide-react';

interface BackupLog {
  id: string;
  backup_date: string;
  status: 'success' | 'failed' | 'in_progress';
  tables_backed_up: Record<string, number>;
  total_records: number;
  error_message?: string;
  duration_seconds?: number;
  created_at: string;
}

export default function BackupStatus() {
  const [latestBackup, setLatestBackup] = useState<BackupLog | null>(null);
  const [allBackups, setAllBackups] = useState<BackupLog[]>([]);
  const [showFullLog, setShowFullLog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  useEffect(() => {
    fetchBackupLogs();
  }, []);

  async function fetchBackupLogs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('backup_date', { ascending: false })
        .limit(30);

      if (error) throw error;

      if (data && data.length > 0) {
        setLatestBackup(data[0]);
        setAllBackups(data);
      }
    } catch (error) {
      console.error('Error fetching backup logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  function formatDuration(seconds?: number): string {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }

  function getTimeSince(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Less than 1 hour ago';
  }

  async function handleManualBackup() {
    if (!confirm('Create a manual backup now? This will back up all current data.')) {
      return;
    }

    setBackingUp(true);
    try {
      const tables = [
        'prayers',
        'prayer_updates',
        'prayer_prompts',
        'prayer_types',
        'email_subscribers',
        'user_preferences',
        'status_change_requests',
        'update_deletion_requests',
        'admin_settings',
        'analytics'
      ];

      const startTime = Date.now();
      const backup: any = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: {}
      };

      // Fetch all tables
      for (const table of tables) {
        try {
          const { data, error } = await supabase.from(table).select('*');
          
          if (error && error.code !== 'PGRST116') {
            console.error(`Error backing up ${table}:`, error);
            backup.tables[table] = { error: error.message, data: [] };
          } else {
            backup.tables[table] = { count: data?.length || 0, data: data || [] };
          }
        } catch (err: any) {
          console.error(`Exception backing up ${table}:`, err);
          backup.tables[table] = { error: err.message, data: [] };
        }
      }

      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTime) / 1000);

      // Create summary
      const summary: Record<string, number> = {};
      let totalRecords = 0;
      for (const table in backup.tables) {
        const count = backup.tables[table].count || 0;
        summary[table] = count;
        totalRecords += count;
      }

      // Download backup as JSON
      const backupJson = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manual_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log to database
      await supabase.from('backup_logs').insert({
        backup_date: new Date().toISOString(),
        status: 'success',
        tables_backed_up: summary,
        total_records: totalRecords,
        duration_seconds: durationSeconds
      });

      alert(`✅ Backup complete! Downloaded ${totalRecords.toLocaleString()} records in ${durationSeconds}s`);
      fetchBackupLogs(); // Refresh the log
    } catch (error: any) {
      console.error('Backup failed:', error);
      
      // Log failure
      await supabase.from('backup_logs').insert({
        backup_date: new Date().toISOString(),
        status: 'failed',
        error_message: error.message || String(error),
        total_records: 0
      });

      alert('❌ Backup failed: ' + (error.message || String(error)));
    } finally {
      setBackingUp(false);
    }
  }

  async function handleManualRestore(file: File) {
    setRestoring(true);
    setShowRestoreDialog(false);

    try {
      // Read the file
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.tables || typeof backup.tables !== 'object') {
        throw new Error('Invalid backup file format');
      }

      // Tables in order (respecting foreign key dependencies)
      const tables = [
        'prayer_types',
        'prayers',
        'prayer_updates',
        'prayer_prompts',
        'email_subscribers',
        'user_preferences',
        'status_change_requests',
        'update_deletion_requests',
        'admin_settings',
        'analytics'
      ];

      let totalRestored = 0;
      const errors: string[] = [];

      for (const tableName of tables) {
        if (!backup.tables[tableName]) continue;

        const tableData = backup.tables[tableName];
        const records = tableData.data || [];

        if (records.length === 0) continue;

        try {
          // Delete existing data
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (deleteError) {
            errors.push(`Error deleting from ${tableName}: ${deleteError.message}`);
            continue;
          }

          // Insert in batches of 100
          const batchSize = 100;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            const { error: insertError } = await supabase
              .from(tableName)
              .insert(batch);

            if (insertError) {
              errors.push(`Error inserting into ${tableName}: ${insertError.message}`);
              continue;
            }

            totalRestored += batch.length;
          }
        } catch (err: any) {
          errors.push(`Exception restoring ${tableName}: ${err.message}`);
        }
      }

      if (errors.length > 0) {
        console.error('Restore errors:', errors);
        alert(`⚠️ Restore completed with ${errors.length} error(s). Restored ${totalRestored.toLocaleString()} records.\n\nCheck console for details.`);
      } else {
        alert(`✅ Restore complete! Restored ${totalRestored.toLocaleString()} records.`);
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error: any) {
      console.error('Restore failed:', error);
      alert('❌ Restore failed: ' + (error.message || String(error)));
    } finally {
      setRestoring(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!latestBackup) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Database Backup Status
          </h3>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No backup logs found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Backups will appear here once the first automated backup runs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Database Backup Status
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManualBackup}
            disabled={backingUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {backingUp ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Backing up...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Manual Backup
              </>
            )}
          </button>
          <button
            onClick={() => setShowRestoreDialog(true)}
            disabled={restoring}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {restoring ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Restore
              </>
            )}
          </button>
          <button
            onClick={() => setShowFullLog(!showFullLog)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            {showFullLog ? 'Hide Full Log' : 'Show Full Log'}
          </button>
        </div>
      </div>

      {/* Latest Backup Status */}
      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex-shrink-0 mt-1">
            {latestBackup.status === 'success' ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : latestBackup.status === 'failed' ? (
              <XCircle className="h-8 w-8 text-red-500" />
            ) : (
              <Clock className="h-8 w-8 text-yellow-500 animate-pulse" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                latestBackup.status === 'success'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : latestBackup.status === 'failed'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                {latestBackup.status.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {getTimeSince(latestBackup.backup_date)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Date</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(latestBackup.backup_date)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Records</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {latestBackup.total_records.toLocaleString()}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDuration(latestBackup.duration_seconds)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Tables</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {Object.keys(latestBackup.tables_backed_up || {}).length}
                </div>
              </div>
            </div>

            {latestBackup.error_message && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                <strong>Error:</strong> {latestBackup.error_message}
              </div>
            )}

            {latestBackup.tables_backed_up && (
              <details className="mt-3">
                <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-300">
                  View table breakdown
                </summary>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {Object.entries(latestBackup.tables_backed_up).map(([table, count]) => (
                    <div key={table} className="flex justify-between p-1.5 bg-white dark:bg-gray-800 rounded">
                      <span className="text-gray-600 dark:text-gray-400">{table}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex gap-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Automated backups run daily at 2:00 AM CST.</strong>
              <br />
              Backups are stored as GitHub Actions artifacts for 30 days and keep your database active.
            </div>
          </div>
        </div>
      </div>

      {/* Full Log */}
      {showFullLog && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Backup History (Last 30)
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {allBackups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {backup.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 dark:text-white truncate">
                      {formatDate(backup.backup_date)}
                    </div>
                    {backup.error_message && (
                      <div className="text-xs text-red-600 dark:text-red-400 truncate">
                        {backup.error_message}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>{backup.total_records.toLocaleString()} records</span>
                  <span>{formatDuration(backup.duration_seconds)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restore Dialog */}
      {showRestoreDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Restore Database from Backup
            </h3>
            
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 dark:text-red-300">
                  <strong>Warning:</strong> This will DELETE all current data and replace it with the backup file. This action cannot be undone!
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select backup file (.json)
              </label>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (!confirm(`Are you absolutely sure you want to restore from "${file.name}"?\n\nThis will ERASE ALL current data!`)) {
                      e.target.value = '';
                      return;
                    }
                    handleManualRestore(file);
                  }
                }}
                className="block w-full text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer focus:outline-none"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Use a backup file downloaded from the "Manual Backup" button or from GitHub Actions artifacts.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRestoreDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
