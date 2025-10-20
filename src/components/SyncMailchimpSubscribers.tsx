import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Upload } from 'lucide-react';

export default function SyncMailchimpSubscribers() {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const syncSubscribers = async () => {
    setSyncing(true);
    setResults(null);

    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    try {
      // Get all active subscribers from database
      const { data: subscribers, error: fetchError } = await supabase
        .from('email_subscribers')
        .select('name, email')
        .eq('is_active', true);

      if (fetchError) {
        throw new Error(`Failed to fetch subscribers: ${fetchError.message}`);
      }

      if (!subscribers || subscribers.length === 0) {
        setResults({
          total: 0,
          successful: 0,
          failed: 0,
          errors: ['No active subscribers found to sync']
        });
        setSyncing(false);
        return;
      }

      // Sync each subscriber to Mailchimp
      for (const subscriber of subscribers) {
        try {
          const { error: syncError } = await supabase.functions.invoke('send-mass-prayer-email', {
            body: {
              action: 'add_subscriber',
              email: subscriber.email,
              name: subscriber.name
            }
          });

          if (syncError) {
            throw syncError;
          }

          successful++;
        } catch (error) {
          failed++;
          errors.push(`${subscriber.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setResults({
        total: subscribers.length,
        successful,
        failed,
        errors
      });
    } catch (error) {
      setResults({
        total: 0,
        successful: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sync Subscribers to Mailchimp
        </h2>
        <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This will sync all active subscribers from your database to your Mailchimp audience.
          Run this once after setting up Mailchimp integration.
        </p>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Make sure you've deployed the Mailchimp Edge Function and set the environment variables before running this.
          </p>
        </div>

        <button
          onClick={syncSubscribers}
          disabled={syncing}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            syncing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {syncing ? 'Syncing...' : 'Sync Subscribers Now'}
        </button>
      </div>

      {/* Results */}
      {results && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sync Results
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Total */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                Total Subscribers
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {results.total}
              </div>
            </div>

            {/* Successful */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Successful
                </div>
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {results.successful}
              </div>
            </div>

            {/* Failed */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <div className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Failed
                </div>
              </div>
              <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                {results.failed}
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {results.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                Errors:
              </h4>
              <ul className="space-y-1">
                {results.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700 dark:text-red-300">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Message */}
          {results.failed === 0 && results.successful > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-green-800 dark:text-green-200">
                ✅ All {results.successful} subscribers have been successfully synced to Mailchimp!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
