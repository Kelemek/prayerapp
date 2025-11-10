import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, AlertTriangle, X, ChevronDown, ChevronUp, Edit2, Save, XCircle, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PrayerStatus } from '../types/prayer';

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
  const [editingPrayer, setEditingPrayer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    requester: string;
    email: string;
    prayer_for: string;
    status: string;
  }>({
    title: '',
    description: '',
    requester: '',
    email: '',
    prayer_for: '',
    status: ''
  });
  const [saving, setSaving] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingUpdate, setAddingUpdate] = useState<string | null>(null);
  const [newUpdate, setNewUpdate] = useState({ content: '', author: '', author_email: '' });
  const [savingUpdate, setSavingUpdate] = useState(false);

  const handleSearch = useCallback(async () => {
    // Check if we have any actual search criteria (not just "all" selections)
    const hasSearchTerm = searchTerm.trim().length > 0;
    const hasStatusFilter = statusFilter && statusFilter !== 'all';
    const hasApprovalFilter = approvalFilter && approvalFilter !== 'all';
    const hasAllStatusFilter = statusFilter === 'all';
    const hasAllApprovalFilter = approvalFilter === 'all';
    
    // If no search term, treat as wildcard search (show all)
    // Need at least one real criterion or at least one "all" filter to proceed
    if (!hasSearchTerm && !hasStatusFilter && !hasApprovalFilter && !hasAllStatusFilter && !hasAllApprovalFilter) {
      // Allow empty search to show all prayers
      // Don't return, continue with the search
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
      // If no search term, we're doing a wildcard search (show all)

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

      // First delete related prayer_updates
      const { error: updatesError } = await supabase
        .from('prayer_updates')
        .delete()
        .eq('prayer_id', prayerId);

      if (updatesError) {
        console.error('Error deleting prayer updates:', updatesError);
        throw new Error(`Failed to delete prayer updates: ${updatesError.message}`);
      }

      // Then delete the prayer
      const { error: prayerError } = await supabase
        .from('prayers')
        .delete()
        .eq('id', prayerId);

      if (prayerError) {
        console.error('Error deleting prayer:', prayerError);
        throw new Error(`Failed to delete prayer: ${prayerError.message}`);
      }

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
        : 'Failed to delete prayer. Please try again.';
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const startEditPrayer = (prayer: Prayer) => {
    setEditForm({
      title: prayer.title,
      description: prayer.description || '',
      requester: prayer.requester,
      email: prayer.email || '',
      prayer_for: prayer.prayer_for || '',
      status: prayer.status
    });
    setEditingPrayer(prayer.id);
    // Expand the card when editing starts
    setExpandedCards(new Set([...expandedCards, prayer.id]));
  };

  const cancelEdit = () => {
    setEditingPrayer(null);
    setEditForm({
      title: '',
      description: '',
      requester: '',
      email: '',
      prayer_for: '',
      status: ''
    });
  };

  const savePrayer = async (prayerId: string) => {
    if (!editForm.title.trim() || !editForm.description.trim() || !editForm.requester.trim()) {
      setError('Title, description, and requester are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('prayers')
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          requester: editForm.requester.trim(),
          email: editForm.email.trim() || null,
          prayer_for: editForm.prayer_for.trim() || null,
          status: editForm.status
        })
        .eq('id', prayerId);

      if (updateError) {
        throw new Error(`Failed to update prayer: ${updateError.message}`);
      }

      // Update local state
      setSearchResults(searchResults.map(p => 
        p.id === prayerId 
          ? { 
              ...p, 
              title: editForm.title.trim(),
              description: editForm.description.trim(),
              requester: editForm.requester.trim(),
              email: editForm.email.trim() || null,
              prayer_for: editForm.prayer_for.trim() || null,
              status: editForm.status
            }
          : p
      ));

      // Exit edit mode
      cancelEdit();
    } catch (err: unknown) {
      console.error('Error updating prayer:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to update prayer. Please try again.';
      setError(errorMessage);
    } finally {
      setSaving(false);
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

      const prayerIds = Array.from(selectedPrayers);

      // First delete related prayer_updates
      const { error: updatesError } = await supabase
        .from('prayer_updates')
        .delete()
        .in('prayer_id', prayerIds);

      if (updatesError) {
        console.error('Error deleting prayer updates:', updatesError);
        throw new Error(`Failed to delete prayer updates: ${updatesError.message}`);
      }

      // Then delete the prayers
      const { error: prayersError } = await supabase
        .from('prayers')
        .delete()
        .in('id', prayerIds);

      if (prayersError) {
        console.error('Error deleting prayers:', prayersError);
        throw new Error(`Failed to delete prayers: ${prayersError.message}`);
      }

      // Remove deleted prayers from results
      setSearchResults(searchResults.filter(p => !selectedPrayers.has(p.id)));
      setSelectedPrayers(new Set());
    } catch (err: unknown) {
      console.error('Error deleting prayers:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to delete selected prayers. Please try again.';
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const updateSelectedStatus = async () => {
    if (selectedPrayers.size === 0 || !bulkStatus) return;

    const statusLabel = bulkStatus === PrayerStatus.CURRENT ? 'Current' 
      : bulkStatus === PrayerStatus.ANSWERED ? 'Answered' 
      : 'Archived';

    if (!confirm(`Are you sure you want to change ${selectedPrayers.size} prayer(s) to "${statusLabel}" status?`)) {
      return;
    }

    try {
      setUpdatingStatus(true);
      setError(null);

      const prayerIds = Array.from(selectedPrayers);

      const { error: updateError } = await supabase
        .from('prayers')
        .update({ status: bulkStatus })
        .in('id', prayerIds);

      if (updateError) {
        console.error('Error updating prayer statuses:', updateError);
        throw new Error(`Failed to update prayer statuses: ${updateError.message}`);
      }

      // Update local state
      setSearchResults(searchResults.map(p => 
        selectedPrayers.has(p.id) ? { ...p, status: bulkStatus } : p
      ));
      
      setSelectedPrayers(new Set());
      setBulkStatus('');
    } catch (err: unknown) {
      console.error('Error updating prayer statuses:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to update prayer statuses. Please try again.';
      setError(errorMessage);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const saveNewUpdate = async (prayerId: string) => {
    if (!newUpdate.content.trim() || !newUpdate.author.trim() || !newUpdate.author_email.trim()) {
      setError('Please provide update content, author name, and author email');
      return;
    }

    try {
      setSavingUpdate(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('prayer_updates')
        .insert({
          prayer_id: prayerId,
          content: newUpdate.content.trim(),
          author: newUpdate.author.trim(),
          author_email: newUpdate.author_email.trim(),
          approval_status: 'approved' // Auto-approve admin-created updates
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating prayer update:', insertError);
        throw new Error(`Failed to create update: ${insertError.message}`);
      }

      // Update local state to show the new update
      setSearchResults(searchResults.map(p => {
        if (p.id === prayerId) {
          return {
            ...p,
            prayer_updates: [...(p.prayer_updates || []), data]
          };
        }
        return p;
      }));

      // Reset form and close
      setNewUpdate({ content: '', author: '', author_email: '' });
      setAddingUpdate(null);
    } catch (err: unknown) {
      console.error('Error saving update:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to save update. Please try again.';
      setError(errorMessage);
    } finally {
      setSavingUpdate(false);
    }
  };

  const cancelAddUpdate = () => {
    setAddingUpdate(null);
    setNewUpdate({ content: '', author: '', author_email: '' });
  };

  const deleteUpdate = async (prayerId: string, updateId: string, updateContent: string) => {
    if (!confirm(`Are you sure you want to delete this update? "${updateContent.substring(0, 50)}${updateContent.length > 50 ? '...' : ''}"\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('prayer_updates')
        .delete()
        .eq('id', updateId);

      if (deleteError) {
        console.error('Error deleting prayer update:', deleteError);
        throw new Error(`Failed to delete update: ${deleteError.message}`);
      }

      // Update local state to remove the deleted update
      setSearchResults(searchResults.map(p => {
        if (p.id === prayerId && p.prayer_updates) {
          return {
            ...p,
            prayer_updates: p.prayer_updates.filter(u => u.id !== updateId)
          };
        }
        return p;
      }));
    } catch (err: unknown) {
      console.error('Error deleting update:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Failed to delete update. Please try again.';
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
      case 'answered': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'archived': return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <Search className="text-red-600 dark:text-red-400" size={24} />
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
          Prayer Editor
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
          disabled={searching}
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
              <option value="answered">Answered</option>
              <option value="archived">Archived</option>
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
            <div className="flex items-center gap-3">
              {/* Bulk Status Change */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">
                  Change Status:
                </label>
                <div className="relative">
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="appearance-none px-3 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer"
                  >
                    <option value="">Select...</option>
                    <option value={PrayerStatus.CURRENT}>Current</option>
                    <option value={PrayerStatus.ANSWERED}>Answered</option>
                    <option value={PrayerStatus.ARCHIVED}>Archived</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" size={14} />
                </div>
                <button
                  onClick={updateSelectedStatus}
                  disabled={!bulkStatus || updatingStatus}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {updatingStatus ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Update ({selectedPrayers.size})
                    </>
                  )}
                </button>
              </div>

              {/* Delete Button */}
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
                    Delete ({selectedPrayers.size})
                  </>
                )}
              </button>
            </div>
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
                        startEditPrayer(prayer);
                      }}
                      disabled={saving}
                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Edit this prayer"
                    >
                      <Edit2 size={16} />
                    </button>
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
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {editingPrayer === prayer.id ? 'Edit Prayer Details' : 'Complete Prayer Details'}
                        </h5>
                        {editingPrayer === prayer.id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => savePrayer(prayer.id)}
                              disabled={saving}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
                            >
                              <Save size={14} />
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={saving}
                              className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50"
                            >
                              <XCircle size={14} />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {editingPrayer === prayer.id ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Title *
                            </label>
                            <input
                              type="text"
                              value={editForm.title}
                              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                              placeholder="Prayer title"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description *
                            </label>
                            <textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                              placeholder="Prayer description"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Requester *
                              </label>
                              <input
                                type="text"
                                value={editForm.requester}
                                onChange={(e) => setEditForm({ ...editForm, requester: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                placeholder="Requester name"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email
                              </label>
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                placeholder="Email address"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Praying For
                            </label>
                            <input
                              type="text"
                              value={editForm.prayer_for}
                              onChange={(e) => setEditForm({ ...editForm, prayer_for: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                              placeholder="Person being prayed for"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Status *
                            </label>
                            <div className="relative">
                              <select
                                value={editForm.status}
                                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                              >
                                <option value={PrayerStatus.CURRENT}>Current</option>
                                <option value={PrayerStatus.ANSWERED}>Answered</option>
                                <option value={PrayerStatus.ARCHIVED}>Archived</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" size={18} />
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* View Mode */
                        <>
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
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-500">
                                        {new Date(update.created_at).toLocaleDateString()}
                                      </span>
                                      <button
                                        onClick={() => deleteUpdate(prayer.id, update.id, update.content)}
                                        disabled={deleting}
                                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                                        title="Delete this update"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
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

                      {/* Add Update Section */}
                      {!editingPrayer && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                          {addingUpdate === prayer.id ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between mb-2">
                                <h6 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                  Add New Update
                                </h6>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => saveNewUpdate(prayer.id)}
                                    disabled={savingUpdate}
                                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
                                  >
                                    <Save size={14} />
                                    {savingUpdate ? 'Saving...' : 'Save Update'}
                                  </button>
                                  <button
                                    onClick={cancelAddUpdate}
                                    disabled={savingUpdate}
                                    className="flex items-center gap-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50"
                                  >
                                    <XCircle size={14} />
                                    Cancel
                                  </button>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Update Content *
                                </label>
                                <textarea
                                  value={newUpdate.content}
                                  onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter the update content..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Author Name *
                                </label>
                                <input
                                  type="text"
                                  value={newUpdate.author}
                                  onChange={(e) => setNewUpdate({ ...newUpdate, author: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                  placeholder="Your name"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Author Email *
                                </label>
                                <input
                                  type="email"
                                  value={newUpdate.author_email}
                                  onChange={(e) => setNewUpdate({ ...newUpdate, author_email: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                                  placeholder="your.email@example.com"
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingUpdate(prayer.id)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              <Plus size={16} />
                              Add Update
                            </button>
                          )}
                        </div>
                      )}
                      </>
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
