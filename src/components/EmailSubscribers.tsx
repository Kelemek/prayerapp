import React, { useState } from 'react';
import { Mail, Plus, Trash2, CheckCircle, XCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmailSubscriber {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export const EmailSubscribers: React.FC = () => {
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mail className="text-blue-600 dark:text-blue-400" size={24} />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
            Email Notification Subscribers
          </h3>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setError(null);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={18} />
          Add Subscriber
        </button>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Search for subscribers by name or email address.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
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
