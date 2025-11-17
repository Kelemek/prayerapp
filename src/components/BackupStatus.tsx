import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, CheckCircle, XCircle, Database, AlertCircle, Download, Upload, Loader } from 'lucide-react';

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
  const [expandedBackupId, setExpandedBackupId] = useState<string | null>(null);
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
        .limit(100);

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

  async function handleManualBackup() {
    if (!confirm('Create a manual backup now? This will back up all current data.')) {
      return;
    }

    setBackingUp(true);
    try {
      // Auto-discover tables from the database
      const { data: tableList, error: tableError } = await supabase
        .from('backup_tables')
        .select('table_name')
        .order('table_name');

      let tables: string[];
      
      if (tableError) {
        console.warn('Could not fetch table list, using fallback:', tableError);
        // Fallback to hardcoded list if view doesn't exist
        tables = [
          'admin_settings',
          'analytics',
          'backup_logs',
          'email_subscribers',
          'prayer_prompts',
          'prayer_types',
          'prayer_updates',
          'prayers',
          'status_change_requests',
          'update_deletion_requests',
          'user_preferences'
        ];
      } else {
        tables = tableList?.map((t: Record<string, unknown>) => t.table_name as string) || [];
      }

      console.log(`Backing up ${tables.length} tables:`, tables);

      const startTime = Date.now();
      const backup: {
        timestamp: string;
        version: string;
        tables: Record<string, { count?: number; error?: string; data: unknown[] }>;
      } = {
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
        } catch (err: unknown) {
          console.error(`Exception backing up ${table}:`, err);
          const errorMessage = err && typeof err === 'object' && 'message' in err 
            ? String(err.message)
            : String(err);
          backup.tables[table] = { error: errorMessage, data: [] };
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
    } catch (error: unknown) {
      console.error('Backup failed:', error);
      
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message)
        : String(error);
      
      // Log failure
      await supabase.from('backup_logs').insert({
        backup_date: new Date().toISOString(),
        status: 'failed',
        error_message: errorMessage,
        total_records: 0
      });

      alert('❌ Backup failed: ' + errorMessage);
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

      // Get list of tables to restore (use what's in the backup file)
      // This ensures we can restore old backups even if table structure changes
      const tablesInBackup = Object.keys(backup.tables);
      
      // Tables to skip during restore (operational data that shouldn't be restored)
      const skipTables = ['analytics', 'backup_logs'];
      
      // Define dependency order for known tables (for proper foreign key handling)
      const knownOrder = [
        'prayer_types',
        'prayers',
        'prayer_updates',
        'prayer_prompts',
        'email_subscribers',
        'user_preferences',
        'status_change_requests',
        'update_deletion_requests',
        'admin_settings'
      ];
      
      // Sort tables: known tables in dependency order first, then any unknown tables
      // Exclude tables that should be skipped
      const tables = [
        ...knownOrder.filter(t => tablesInBackup.includes(t) && !skipTables.includes(t)),
        ...tablesInBackup.filter(t => !knownOrder.includes(t) && !skipTables.includes(t))
      ];

      let totalRestored = 0;
      const errors: string[] = [];

      for (const tableName of tables) {
        if (!backup.tables[tableName]) continue;

        const tableData = backup.tables[tableName];
        const records = tableData.data || [];

        if (records.length === 0) continue;

        try {
          // Get all existing records to delete them by their actual IDs
          const { data: existingRecords, error: fetchError } = await supabase
            .from(tableName)
            .select('id');

          if (fetchError) {
            errors.push(`Error fetching ${tableName}: ${fetchError.message}`);
            continue;
          }

          // Delete all existing records in batches (Supabase has limits on .in() clause)
          if (existingRecords && existingRecords.length > 0) {
            const ids = existingRecords.map(r => r.id);
            const deleteBatchSize = 100;
            
            for (let i = 0; i < ids.length; i += deleteBatchSize) {
              const idBatch = ids.slice(i, i + deleteBatchSize);
              const { error: deleteError } = await supabase
                .from(tableName)
                .delete()
                .in('id', idBatch);

              if (deleteError) {
                errors.push(`Error deleting from ${tableName}: ${deleteError.message}`);
                // Don't continue - try to restore anyway with upsert
                break;
              }
            }
          }

          // Use upsert to handle any remaining conflicts
          const batchSize = 100;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            const { error: insertError } = await supabase
              .from(tableName)
              .upsert(batch, { onConflict: 'id' });

            if (insertError) {
              errors.push(`Error inserting into ${tableName}: ${insertError.message}`);
              continue;
            }

            totalRestored += batch.length;
          }
        } catch (err: unknown) {
          const errorMessage = err && typeof err === 'object' && 'message' in err 
            ? String(err.message)
            : String(err);
          errors.push(`Exception restoring ${tableName}: ${errorMessage}`);
        }
      }

      // Log skipped tables info
      if (skipTables.length > 0) {
        console.log(`Skipped tables (operational data): ${skipTables.join(', ')}`);
      }

      if (errors.length > 0) {
        console.error('Restore errors:', errors);
        alert(`⚠️ Restore completed with ${errors.length} error(s). Restored ${totalRestored.toLocaleString()} records.\n\nCheck console for details.`);
      } else {
        const skipMsg = skipTables.length > 0 
          ? `\n\nSkipped: ${skipTables.join(', ')} (operational data)`
          : '';
        alert(`✅ Restore complete! Restored ${totalRestored.toLocaleString()} records.${skipMsg}`);
      }

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error: unknown) {
      console.error('Restore failed:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message)
        : String(error);
      alert('❌ Restore failed: ' + errorMessage);
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
        </div>
      </div>

      {/* Recent Backups (Last 5) */}
      <div className="space-y-4 mb-6">
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

        {/* Backup List */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Recent Backups
          </h4>
          <div className="space-y-2">
            {(showFullLog ? allBackups : allBackups.slice(0, 5)).map((backup) => (
              <div key={backup.id}>
                <div
                  onClick={() => setExpandedBackupId(expandedBackupId === backup.id ? null : backup.id)}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
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
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {expandedBackupId === backup.id ? '▼' : '▶'}
                    </span>
                  </div>
                </div>

                {/* Expanded Detail View */}
                {expandedBackupId === backup.id && (
                  <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Backup ID</div>
                        <div className="text-sm font-mono text-gray-900 dark:text-white truncate">
                          {backup.id}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                        <div className="text-sm">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            backup.status === 'success'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : backup.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}>
                            {backup.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Backup Date</div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(backup.backup_date)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Created At</div>
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(backup.created_at)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total Records</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {backup.total_records.toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatDuration(backup.duration_seconds)}
                        </div>
                      </div>
                    </div>

                    {backup.error_message && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <div className="text-xs font-semibold text-red-800 dark:text-red-300 mb-1">Error Message</div>
                        <div className="text-sm text-red-700 dark:text-red-400 font-mono">
                          {backup.error_message}
                        </div>
                      </div>
                    )}

                    {backup.tables_backed_up && Object.keys(backup.tables_backed_up).length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Tables Backed Up ({Object.keys(backup.tables_backed_up).length})
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(backup.tables_backed_up)
                            .sort(([a], [b]) => a.localeCompare(b))
                            .map(([table, count]) => (
                              <div
                                key={table}
                                className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded text-xs"
                              >
                                <span className="text-gray-700 dark:text-gray-300 truncate mr-2">
                                  {table}
                                </span>
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                  {count}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Show More Button */}
          {!showFullLog && allBackups.length > 5 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowFullLog(true)}
                className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              >
                Show More ({allBackups.length - 5} older backups)
              </button>
            </div>
          )}

          {/* Show Less Button */}
          {showFullLog && allBackups.length > 5 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setShowFullLog(false);
                  setExpandedBackupId(null); // Collapse any expanded details
                }}
                className="px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              >
                Show Less
              </button>
            </div>
          )}
        </div>
      </div>

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
              <label htmlFor="backup-file-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select backup file (.json)
              </label>
              <input
                id="backup-file-input"
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
