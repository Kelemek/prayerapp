import React, { useState } from 'react';
import { Search, Trash2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Prayer {
  id: string;
  title: string;
  requester: string;
  email: string | null;
  status: string;
  created_at: string;
}

export const PrayerSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Prayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrayers, setSelectedPrayers] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      setSelectedPrayers(new Set());

      const { data, error } = await supabase
        .from('prayers')
        .select('id, title, requester, email, status, created_at')
        .or(`requester.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSearchResults(data || []);
    } catch (err: unknown) {
      console.error('Error searching prayers:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to search prayers';
      setError(errorMessage);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleSelectPrayer = (prayerId: string) => {
    const newSelected = new Set(selectedPrayers);
    if (newSelected.has(prayerId)) {
      newSelected.delete(prayerId);
    } else {
      newSelected.add(prayerId);
    }
    setSelectedPrayers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPrayers.size === searchResults.length) {
      setSelectedPrayers(new Set());
    } else {
      setSelectedPrayers(new Set(searchResults.map(p => p.id)));
    }
  };

  const deletePrayer = async (prayerId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the prayer "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const { error } = await supabase
        .from('prayers')
        .delete()
        .eq('id', prayerId);

      if (error) throw error;

      // Remove from results
      setSearchResults(searchResults.filter(p => p.id !== prayerId));
      setSelectedPrayers(prev => {
        const newSet = new Set(prev);
        newSet.delete(prayerId);
        return newSet;
      });
    } catch (err: unknown) {
      console.error('Error deleting prayer:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to delete prayer';
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedPrayers.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedPrayers.size} prayer(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const { error } = await supabase
        .from('prayers')
        .delete()
        .in('id', Array.from(selectedPrayers));

      if (error) throw error;

      // Remove deleted prayers from results
      setSearchResults(searchResults.filter(p => !selectedPrayers.has(p.id)));
      setSelectedPrayers(new Set());
    } catch (err: unknown) {
      console.error('Error deleting prayers:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to delete selected prayers';
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedPrayers(new Set());
    setError(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'ongoing': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'answered': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'closed': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Search className="text-red-600 dark:text-red-400" size={24} />
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
          Search & Delete Prayers
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Search for prayers by requester name or email address, then delete them individually or in bulk.
      </p>

      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search by name or email..."
            className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !searchTerm.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
        >
          {searching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </>
          ) : (
            <>
              <Search size={18} />
              Search
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Bulk Actions */}
      {searchResults.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPrayers.size === searchResults.length && searchResults.length > 0}
                onChange={toggleSelectAll}
                className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
              />
              Select All ({searchResults.length})
            </label>
            {selectedPrayers.size > 0 && (
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                {selectedPrayers.size} selected
              </span>
            )}
          </div>
          {selectedPrayers.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm"
            >
              {deleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Selected ({selectedPrayers.size})
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 ? (
        <div className="space-y-2">
          {searchResults.map((prayer) => (
            <div
              key={prayer.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                selectedPrayers.has(prayer.id)
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedPrayers.has(prayer.id)}
                onChange={() => toggleSelectPrayer(prayer.id)}
                className="mt-1 rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {prayer.title}
                  </h4>
                  <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${getStatusColor(prayer.status)}`}>
                    {prayer.status}
                  </span>
                </div>
                <div className="text-sm space-y-0.5">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Requester:</span> {prayer.requester}
                  </p>
                  {prayer.email && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Email:</span> {prayer.email}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Created: {new Date(prayer.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deletePrayer(prayer.id, prayer.title)}
                disabled={deleting}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                title="Delete this prayer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : searchTerm && !searching ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertTriangle size={48} className="mx-auto mb-2 opacity-50" />
          <p>No prayers found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : !searchTerm ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Search size={48} className="mx-auto mb-2 opacity-50" />
          <p>Enter a name or email to search</p>
          <p className="text-sm mt-1">Results will appear here</p>
        </div>
      ) : null}

      {searchResults.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Found: <span className="font-semibold">{searchResults.length}</span> prayer(s)
            </span>
            {selectedPrayers.size > 0 && (
              <span className="text-red-600 dark:text-red-400">
                Selected: <span className="font-semibold">{selectedPrayers.size}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Warning Notice */}
      <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Warning:</strong> Deleting prayers is permanent and cannot be undone. All associated updates will also be deleted.
        </p>
      </div>
    </div>
  );
};
