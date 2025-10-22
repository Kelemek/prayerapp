import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Prayer {
  id: string;
  title: string;
  requester: string;
  email: string | null;
  status: string;
  created_at: string;
  denial_reason?: string | null;
  description?: string | null;
  approval_status?: string;
  prayer_for?: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    denial_reason?: string | null;
    approval_status?: string;
  }>;
}

export const PrayerSearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [searchResults, setSearchResults] = useState<Prayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrayers, setSelectedPrayers] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(async () => {
    // Check if we have any actual search criteria (not just "all" selections)
    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasStatusFilter = statusFilter && statusFilter !== 'all';
    const hasApprovalFilter = approvalFilter && approvalFilter !== 'all';
    const hasAllStatusFilter = statusFilter === 'all';
    const hasAllApprovalFilter = approvalFilter === 'all';
    
    // Need at least one real criterion or at least one "all" filter to proceed
    if (!hasSearchTerm && !hasStatusFilter && !hasApprovalFilter && !hasAllStatusFilter && !hasAllApprovalFilter) {
      setError('Please enter a search term or select a filter');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      setSelectedPrayers(new Set());

      let query = supabase
        .from('prayers')
        .select('id, title, requester, email, status, created_at, denial_reason, description, approval_status, prayer_for, prayer_updates(id, content, author, created_at, denial_reason, approval_status)');

      // Add search filters if there's a search term
      if (searchTerm.trim()) {
        query = query.or(`requester.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,denial_reason.ilike.%${searchTerm}%`);
      }

      // Add status filter
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Add approval status filter
      if (approvalFilter && approvalFilter !== 'all') {
        if (approvalFilter === 'denied') {
          // For denied, we need to find:
          // 1. Prayers with denial_reason OR
          // 2. Prayers that have updates with denial_reason
          // We'll filter the updates client-side since Supabase nested queries are complex
          // Just get all prayers and we'll filter based on prayer_updates after
        } else {
          query = query.eq('approval_status', approvalFilter);
        }
      }

      query = query.order('created_at', { ascending: false }).limit(100);

      const { data, error } = await query;

      if (error) throw error;

      let results = data || [];
      
      // If filtering by denied, include prayers with denied updates
      if (approvalFilter === 'denied') {
        results = results.filter(prayer => {
          // Include if prayer itself has denial_reason
          if (prayer.denial_reason) return true;
          
          // Include if any of its updates have denial_reason
          if (prayer.prayer_updates && prayer.prayer_updates.length > 0) {
            return prayer.prayer_updates.some(update => 
              update.denial_reason !== null && 
              update.denial_reason !== undefined && 
              update.denial_reason !== ''
            );
          }
          
          return false;
        });
      }

      setSearchResults(results);
    } catch (err: unknown) {
      console.error('Error searching prayers:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to search prayers';
      setError(errorMessage);
    } finally {
      setSearching(false);
    }
  }, [searchTerm, statusFilter, approvalFilter]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Auto-fetch when filters change
  useEffect(() => {
    if (statusFilter === 'all' || approvalFilter === 'all' || statusFilter || approvalFilter) {
      handleSearch();
    }
  }, [statusFilter, approvalFilter, handleSearch]);

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

  const toggleExpandCard = (id: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
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
          Prayer Search & Log
        </h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Search and filter prayers by title, requester, email, description, or denial reasons. Use dropdown filters to automatically load results. Delete individually or in bulk.
      </p>

      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
                        placeholder="Search by title, requester, email, description, or denial reasons..."
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
          disabled={searching || (!searchTerm.trim() && statusFilter === 'all' && approvalFilter === 'all')}
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

      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Prayer Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prayer Status
          </label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
            >
              <option value="">Select status...</option>
              <option value="all">All Statuses</option>
              <option value="current">Current</option>
              <option value="ongoing">Ongoing</option>
              <option value="answered">Answered</option>
              <option value="closed">Closed</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" size={18} />
          </div>
        </div>

        {/* Approval Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Approval Status
          </label>
          <div className="relative">
            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              className="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
            >
              <option value="">Select approval...</option>
              <option value="all">All Approvals</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="denied">Denied</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" size={18} />
          </div>
        </div>
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
        <div className="space-y-1">
          {searchResults.map((prayer) => {
            const isExpanded = expandedCards.has(prayer.id);
            const isSelected = selectedPrayers.has(prayer.id);
            
            return (
              <div
                key={prayer.id}
                className={`border rounded-lg transition-all duration-200 ${
                  isSelected
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {/* Compact Header - Always Visible */}
                <div className="flex items-center gap-3 p-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectPrayer(prayer.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <button
                    onClick={() => toggleExpandCard(prayer.id)}
                    className="flex-1 flex flex-col gap-1.5 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {prayer.title}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full capitalize flex-shrink-0 ${getStatusColor(prayer.status)}`}>
                        {prayer.status}
                      </span>
                      {prayer.approval_status && (
                        <span className={`px-2 py-0.5 text-xs rounded-full capitalize flex-shrink-0 ${
                          prayer.approval_status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          prayer.approval_status === 'denied' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {prayer.approval_status}
                        </span>
                      )}
                      {prayer.denial_reason && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 flex-shrink-0">
                          Has Denial
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Requester:</span> {prayer.requester}
                      </div>
                      {prayer.email && (
                        <div className="truncate">
                          <span className="font-medium">Email:</span> {prayer.email}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Created:</span> {new Date(prayer.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePrayer(prayer.id, prayer.title);
                      }}
                      disabled={deleting}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete this prayer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details - Only Visible When Expanded */}
                {isExpanded && (
                  <div className="px-6 pb-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="pt-4 space-y-3">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Complete Prayer Details
                      </h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Basic Information */}
                        <div className="space-y-3">
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                            <h6 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                              Basic Information
                            </h6>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Title:</span>
                                <span className="ml-2 text-gray-600 dark:text-gray-400">{prayer.title}</span>
                              </div>
                              
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Requester:</span>
                                <span className="ml-2 text-gray-600 dark:text-gray-400">{prayer.requester}</span>
                              </div>
                              
                              {prayer.email && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                                  <span className="ml-2 text-gray-600 dark:text-gray-400">{prayer.email}</span>
                                </div>
                              )}
                              
                              {prayer.prayer_for && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Praying For:</span>
                                  <span className="ml-2 text-gray-600 dark:text-gray-400">{prayer.prayer_for}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Status Information */}
                        <div className="space-y-3">
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                            <h6 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                              Status Information
                            </h6>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Prayer Status:</span>
                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full capitalize ${getStatusColor(prayer.status)}`}>
                                  {prayer.status}
                                </span>
                              </div>
                              
                              {prayer.approval_status && (
                                <div>
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Approval Status:</span>
                                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full capitalize ${
                                    prayer.approval_status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                    prayer.approval_status === 'denied' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  }`}>
                                    {prayer.approval_status}
                                  </span>
                                </div>
                              )}
                              
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                                <div className="ml-2 text-gray-600 dark:text-gray-400">
                                  <div>{new Date(prayer.created_at).toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                  })}</div>
                                  <div className="text-xs">{new Date(prayer.created_at).toLocaleTimeString('en-US')}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Description */}
                      {prayer.description && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                          <h6 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
                            Prayer Description
                          </h6>
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                            {prayer.description}
                          </p>
                        </div>
                      )}
                      
                      {/* Denial Reason - Highlighted if present */}
                      {prayer.denial_reason && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                          <h6 className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase mb-2 flex items-center gap-2">
                            <AlertTriangle size={14} />
                            Denial Reason
                          </h6>
                          <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap leading-relaxed">
                            {prayer.denial_reason}
                          </p>
                        </div>
                      )}
                      
                      {/* Prayer Updates Section */}
                      {prayer.prayer_updates && prayer.prayer_updates.length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                          <h6 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">
                            Prayer Updates ({prayer.prayer_updates.length})
                          </h6>
                          <div className="space-y-3">
                            {[...prayer.prayer_updates]
                              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                              .map((update, index) => (
                                <div 
                                  key={update.id}
                                  className={`p-3 rounded border ${
                                    update.denial_reason 
                                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' 
                                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Update #{prayer.prayer_updates!.length - index}
                                      </span>
                                      {update.approval_status && (
                                        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                                          update.approval_status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                          update.approval_status === 'denied' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                        }`}>
                                          {update.approval_status}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-gray-500 dark:text-gray-500">
                                      {new Date(update.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mb-2">
                                    {update.content}
                                  </p>
                                  {update.denial_reason && (
                                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded border-l-2 border-red-500">
                                      <div className="flex items-start gap-2">
                                        <AlertTriangle size={12} className="text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                                            Denial Reason:
                                          </p>
                                          <p className="text-xs text-red-600 dark:text-red-400">
                                            {update.denial_reason}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                    <span className="font-medium">By:</span> {update.author}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : searchTerm && !searching ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertTriangle size={48} className="mx-auto mb-2 opacity-50" />
          <p>No prayers found</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      ) : !searchTerm && !statusFilter && !approvalFilter ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Search size={48} className="mx-auto mb-2 opacity-50" />
          <p>Search Prayers & Audit Log</p>
          <div className="text-sm mt-2 space-y-1">
            <p>• Select a filter from the dropdowns to automatically load results</p>
            <p>• Or search by title, requester, email, description, or denial reasons</p>
            <p>• Select "Denied" to see all denied prayers and activities</p>
          </div>
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
