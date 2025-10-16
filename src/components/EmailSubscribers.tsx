import React, { useState } from 'react';
import { Mail, Plus, Trash2, CheckCircle, XCircle, Search, Upload, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailSubscriber {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface CSVRow {
  name: string;
  email: string;
  valid: boolean;
  error?: string;
}

export const EmailSubscribers: React.FC = () => {
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvSuccess, setCSVSuccess] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a search term (name or email)');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      setHasSearched(true);

      const query = searchQuery.trim().toLowerCase();
      
      const { data, error } = await supabase
        .from('email_subscribers')
        .select('*')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSubscribers(data || []);
    } catch (err: any) {
      console.error('Error searching subscribers:', err);
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim() || !newEmail.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { error } = await supabase
        .from('email_subscribers')
        .insert([{ 
          name: newName.trim(), 
          email: newEmail.trim().toLowerCase(),
          is_active: true 
        }]);

      if (error) throw error;

      // Reset form
      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
      
      // Refresh search results if we have a query
      if (searchQuery.trim()) {
        await handleSearch();
      }
    } catch (err: any) {
      console.error('Error adding subscriber:', err);
      if (err.code === '23505') {
        setError('This email address is already subscribed');
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('email_subscribers')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh search results
      if (searchQuery.trim()) {
        await handleSearch();
      }
    } catch (err: any) {
      console.error('Error toggling subscriber status:', err);
      setError(err.message);
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim());
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const parsedData: CSVRow[] = [];

        // Skip header row if it contains "name" or "email"
        const startIndex = rows[0]?.toLowerCase().includes('name') || rows[0]?.toLowerCase().includes('email') ? 1 : 0;

        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue;

          // Split by comma and handle quoted values
          const parts = row.split(',').map(part => part.trim().replace(/^["']|["']$/g, ''));
          
          if (parts.length >= 2) {
            const name = parts[0];
            const email = parts[1].toLowerCase();
            
            let valid = true;
            let error = undefined;

            if (!name) {
              valid = false;
              error = 'Name is required';
            } else if (!emailRegex.test(email)) {
              valid = false;
              error = 'Invalid email format';
            }

            parsedData.push({ name, email, valid, error });
          }
        }

        setCSVData(parsedData);
        setError(null);
      } catch (err) {
        setError('Error parsing CSV file. Please check the format.');
        console.error('CSV parse error:', err);
      }
    };

    reader.readAsText(file);
  };

  const handleUploadCSV = async () => {
    const validRows = csvData.filter(row => row.valid);
    
    if (validRows.length === 0) {
      setError('No valid entries to upload');
      return;
    }

    try {
      setUploadingCSV(true);
      setError(null);
      setCSVSuccess(null);

      // Insert all valid subscribers
      const { data, error } = await supabase
        .from('email_subscribers')
        .insert(
          validRows.map(row => ({
            name: row.name,
            email: row.email,
            is_active: true
          }))
        );

      if (error) {
        // Handle duplicate emails gracefully
        if (error.code === '23505') {
          setError('Some emails already exist. Try removing duplicates from your CSV.');
        } else {
          throw error;
        }
      } else {
        setCSVSuccess(`Successfully added ${validRows.length} subscriber(s)!`);
        setCSVData([]);
        setShowCSVUpload(false);
        
        // Refresh search if we have a query
        if (searchQuery.trim()) {
          await handleSearch();
        }
      }
    } catch (err: any) {
      console.error('Error uploading CSV:', err);
      setError(err.message);
    } finally {
      setUploadingCSV(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_subscribers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Refresh search results
      if (searchQuery.trim()) {
        await handleSearch();
      }
    } catch (err: any) {
      console.error('Error deleting subscriber:', err);
      setError(err.message);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Mail className="text-blue-600 dark:text-blue-400" size={24} />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
            Email Notification Subscribers
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => {
              setShowCSVUpload(!showCSVUpload);
              setShowAddForm(false);
              setError(null);
              setCSVSuccess(null);
              setCSVData([]);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
          >
            <Upload size={18} />
            Upload CSV
          </button>
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setShowCSVUpload(false);
              setError(null);
            }}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
          >
            <Plus size={18} />
            Add Subscriber
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Search for subscribers by name or email address, or upload a CSV file to add multiple subscribers.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {csvSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-800 dark:text-green-200">{csvSuccess}</p>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* CSV Upload Modal */}
      {showCSVUpload && (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-medium text-gray-800 dark:text-gray-100">Upload CSV File</h4>
            <button
              onClick={() => {
                setShowCSVUpload(false);
                setCSVData([]);
                setError(null);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">CSV Format:</p>
                  <p className="mb-2">Your CSV file should have two columns: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 py-0.5 rounded">name,email</code></p>
                  <p className="font-mono text-xs bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                    John Doe,john@example.com<br />
                    Jane Smith,jane@example.com
                  </p>
                </div>
              </div>
            </div>

            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-800 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300"
            />
          </div>

          {csvData.length > 0 && (
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview ({csvData.length} rows found)
              </h5>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0">
                    <tr>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Name</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Email</th>
                      <th className="text-left p-2 text-gray-700 dark:text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.map((row, index) => (
                      <tr key={index} className={`border-t border-gray-200 dark:border-gray-700 ${!row.valid ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{row.name}</td>
                        <td className="p-2 text-gray-900 dark:text-gray-100">{row.email}</td>
                        <td className="p-2">
                          {row.valid ? (
                            <span className="text-green-600 dark:text-green-400 text-xs">✓ Valid</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-xs">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Valid: {csvData.filter(r => r.valid).length} | Invalid: {csvData.filter(r => !r.valid).length}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleUploadCSV}
              disabled={uploadingCSV || csvData.length === 0 || csvData.filter(r => r.valid).length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {uploadingCSV ? 'Uploading...' : `Upload ${csvData.filter(r => r.valid).length} Subscriber(s)`}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCSVUpload(false);
                setCSVData([]);
                setError(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Subscriber Form */}
      {showAddForm && (
        <form onSubmit={handleAddSubscriber} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm"
            >
              {submitting ? 'Adding...' : 'Add Subscriber'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setNewEmail('');
                setError(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Subscribers List */}
      {searching ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Searching...</p>
        </div>
      ) : !hasSearched ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Search size={48} className="mx-auto mb-2 opacity-50" />
          <p>Enter a name or email to search</p>
          <p className="text-sm mt-1">Search results will appear here</p>
        </div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Mail size={48} className="mx-auto mb-2 opacity-50" />
          <p>No subscribers found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {subscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {subscriber.name}
                    </h4>
                    {subscriber.is_active ? (
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {subscriber.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Added {new Date(subscriber.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleActive(subscriber.id, subscriber.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      subscriber.is_active
                        ? 'text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'text-gray-400 dark:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                    title={subscriber.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {subscriber.is_active ? <CheckCircle size={20} /> : <XCircle size={20} />}
                  </button>
                  <button
                    onClick={() => handleDelete(subscriber.id, subscriber.email)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Found: <span className="font-semibold">{subscribers.length}</span> subscriber(s)
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                Active: <span className="font-semibold text-green-600 dark:text-green-400">
                  {subscribers.filter(s => s.is_active).length}
                </span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
