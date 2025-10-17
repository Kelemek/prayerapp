import React, { useState, useEffect } from 'react';
import { Calendar, User, CheckCircle, Trash2, ChevronDown } from 'lucide-react';
import { useToast } from './Toast';
import { PrayerStatus } from '../types/prayer';
import type { PrayerRequest } from '../types/prayer';
import { getUserInfo, saveUserInfo } from '../utils/userInfoStorage';

interface PrayerCardProps {
  prayer: PrayerRequest;
  onUpdateStatus: (id: string, status: PrayerStatus) => void;
  onAddUpdate: (id: string, content: string, author: string, authorEmail: string, isAnonymous: boolean) => void;
  onDelete: (id: string) => void;
  onRequestDelete: (prayerId: string, reason: string, requesterName: string, requesterEmail: string) => Promise<void>;
  onRequestStatusChange: (prayerId: string, newStatus: PrayerStatus, reason: string, requesterName: string, requesterEmail: string) => Promise<void>;
  onDeleteUpdate: (updateId: string) => Promise<void>;
  onRequestUpdateDelete: (updateId: string, reason: string, requesterName: string, requesterEmail: string) => Promise<any>;
  registerCloseCallback: (callback: () => void) => () => void;
  onFormOpen: () => void;
  isAdmin: boolean;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({ 
  prayer, 
  onUpdateStatus, 
  onAddUpdate, 
  onDelete,
  onRequestDelete,
  onRequestStatusChange,
  onDeleteUpdate,
  onRequestUpdateDelete,
  registerCloseCallback,
  onFormOpen,
  isAdmin 
}) => {
  const displayedRequester = prayer.is_anonymous ? 'Anonymous' : prayer.requester;
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updateFirstName, setUpdateFirstName] = useState('');
  const [updateLastName, setUpdateLastName] = useState('');
  const [updateAuthorEmail, setUpdateAuthorEmail] = useState('');
  const [updateIsAnonymous, setUpdateIsAnonymous] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteRequesterFirstName, setDeleteRequesterFirstName] = useState('');
  const [deleteRequesterLastName, setDeleteRequesterLastName] = useState('');
  const [deleteRequesterEmail, setDeleteRequesterEmail] = useState('');
  const [showStatusChangeRequest, setShowStatusChangeRequest] = useState(false);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [statusChangeRequesterFirstName, setStatusChangeRequesterFirstName] = useState('');
  const [statusChangeRequesterLastName, setStatusChangeRequesterLastName] = useState('');
  const [statusChangeRequesterEmail, setStatusChangeRequesterEmail] = useState('');
  const [requestedStatus, setRequestedStatus] = useState<PrayerStatus>(prayer.status);
  // State for update deletion request UI
  const [isSubmittingUpdateDelete, setIsSubmittingUpdateDelete] = useState(false);
  const [updateDeleteError, setUpdateDeleteError] = useState<string | null>(null);
  const [showUpdateDeleteRequest, setShowUpdateDeleteRequest] = useState<string | null>(null);
  const [updateDeleteReason, setUpdateDeleteReason] = useState('');
  const [updateDeleteRequesterFirstName, setUpdateDeleteRequesterFirstName] = useState('');
  const [updateDeleteRequesterLastName, setUpdateDeleteRequesterLastName] = useState('');
  const [updateDeleteRequesterEmail, setUpdateDeleteRequesterEmail] = useState('');
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const { showToast } = useToast();

  // Load saved user info when component mounts
  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo.firstName) {
      setUpdateFirstName(userInfo.firstName);
      setDeleteRequesterFirstName(userInfo.firstName);
      setStatusChangeRequesterFirstName(userInfo.firstName);
      setUpdateDeleteRequesterFirstName(userInfo.firstName);
    }
    if (userInfo.lastName) {
      setUpdateLastName(userInfo.lastName);
      setDeleteRequesterLastName(userInfo.lastName);
      setStatusChangeRequesterLastName(userInfo.lastName);
      setUpdateDeleteRequesterLastName(userInfo.lastName);
    }
    if (userInfo.email) {
      setUpdateAuthorEmail(userInfo.email);
      setDeleteRequesterEmail(userInfo.email);
      setStatusChangeRequesterEmail(userInfo.email);
      setUpdateDeleteRequesterEmail(userInfo.email);
    }
  }, []);

  // Register callback to close all forms in this card
  useEffect(() => {
    const closeAllForms = () => {
      setShowAddUpdate(false);
      setShowDeleteRequest(false);
      setShowStatusChangeRequest(false);
      setShowUpdateDeleteRequest(null);
    };
    
    return registerCloseCallback(closeAllForms);
  }, [registerCloseCallback]);

  // Helper to open a form (closes all other forms first)
  const openForm = (formSetter: () => void) => {
    onFormOpen(); // Close all forms in all cards
    formSetter(); // Then open the desired form
  };

  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim() || !updateFirstName.trim() || !updateLastName.trim() || !updateAuthorEmail.trim()) return;
    
    // Concatenate first and last name
    const fullName = `${updateFirstName.trim()} ${updateLastName.trim()}`;
    
    // Save user info to localStorage for future use
    saveUserInfo(updateFirstName, updateLastName, updateAuthorEmail);
    
    // include author email and anonymous flag when adding an update
    onAddUpdate(prayer.id, updateText, fullName, updateAuthorEmail, updateIsAnonymous);
    setUpdateText('');
    // Don't reset name and email - keep them for next time
    // setUpdateFirstName('');
    // setUpdateLastName('');
    // setUpdateAuthorEmail('');
    setUpdateIsAnonymous(false);
    setShowAddUpdate(false);
    try { showToast('Update submitted for admin approval', 'info'); } catch (err) { console.warn('Toast not available:', err); }
  };

  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim() || !deleteRequesterFirstName.trim() || !deleteRequesterLastName.trim() || !deleteRequesterEmail.trim()) return;
    
    // Concatenate first and last name
    const fullName = `${deleteRequesterFirstName.trim()} ${deleteRequesterLastName.trim()}`;
    
    // Save user info to localStorage for future use
    saveUserInfo(deleteRequesterFirstName, deleteRequesterLastName, deleteRequesterEmail);
    
    try {
      await onRequestDelete(prayer.id, deleteReason, fullName, deleteRequesterEmail);
      setDeleteReason('');
      // Don't reset name and email - keep them for next time
      // setDeleteRequesterFirstName('');
      // setDeleteRequesterLastName('');
      // setDeleteRequesterEmail('');
      setShowDeleteRequest(false);
      try { showToast('Deletion request submitted for admin approval', 'info'); } catch (err) { console.warn('Toast not available:', err); }
    } catch (error) {
      console.error('Error in handleDeleteRequest:', error);
      // Don't reset the form on error so user can try again
    }
  };

  const handleDirectDelete = () => {
    if (confirm('Are you sure you want to delete this prayer? This action cannot be undone.')) {
      onDelete(prayer.id);
    }
  };

  const handleStatusChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeReason.trim() || !statusChangeRequesterFirstName.trim() || !statusChangeRequesterLastName.trim() || !statusChangeRequesterEmail.trim()) return;
    
    // Concatenate first and last name
    const fullName = `${statusChangeRequesterFirstName.trim()} ${statusChangeRequesterLastName.trim()}`;
    
    // Save user info to localStorage for future use
    saveUserInfo(statusChangeRequesterFirstName, statusChangeRequesterLastName, statusChangeRequesterEmail);
    
    try {
      await onRequestStatusChange(prayer.id, requestedStatus, statusChangeReason, fullName, statusChangeRequesterEmail);
      setStatusChangeReason('');
      // Don't reset name and email - keep them for next time
      // setStatusChangeRequesterFirstName('');
      // setStatusChangeRequesterLastName('');
      // setStatusChangeRequesterEmail('');
      setShowStatusChangeRequest(false);
      try { showToast('Status change request submitted for admin approval', 'info'); } catch (err) { console.warn('Toast not available:', err); }
    } catch (error) {
      console.error('Error in handleStatusChangeRequest:', error);
      // Don't reset the form on error so user can try again
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleUpdateDeletionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateDeleteReason.trim() || !updateDeleteRequesterFirstName.trim() || !updateDeleteRequesterLastName.trim() || !updateDeleteRequesterEmail.trim() || !showUpdateDeleteRequest) return;
    
    // Concatenate first and last name
    const fullName = `${updateDeleteRequesterFirstName.trim()} ${updateDeleteRequesterLastName.trim()}`;
    
    // Save user info to localStorage for future use
    saveUserInfo(updateDeleteRequesterFirstName, updateDeleteRequesterLastName, updateDeleteRequesterEmail);
    
    try {
      setIsSubmittingUpdateDelete(true);
      setUpdateDeleteError(null);
      const res: any = await onRequestUpdateDelete(showUpdateDeleteRequest, updateDeleteReason, fullName, updateDeleteRequesterEmail);
      if (!res || res.ok === false) {
        // Handle common Supabase errors more gracefully
        let errMsg = (res && res.error) ? res.error : 'Failed to submit update deletion request';
        if (typeof errMsg === 'object' && errMsg.message) errMsg = errMsg.message;
        // Detect missing table error message patterns
        if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('relation') && errMsg.toLowerCase().includes('does not exist')) {
          errMsg = 'Server schema missing: update_deletion_requests table not found. Please run the migration.';
        }
        setUpdateDeleteError(errMsg);
        console.error('Failed to submit update deletion request', errMsg);
        setIsSubmittingUpdateDelete(false);
        return;
      }
      setUpdateDeleteReason('');
      // Don't reset name and email - keep them for next time
      // setUpdateDeleteRequesterName('');
      // setUpdateDeleteRequesterEmail('');
      setShowUpdateDeleteRequest(null);
      // show a toast to match other successful actions
      try { showToast('Update deletion request submitted for admin approval', 'info'); } catch (err) { console.warn('Toast not available:', err); }
    } finally {
      setIsSubmittingUpdateDelete(false);
    }
  };

  return (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4 transition-colors relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="relative">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-0 inline">Prayer for {prayer.prayer_for}</h3>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Requested by <span className="font-medium text-gray-800 dark:text-gray-100">{displayedRequester}</span></span>
          </div>
        </div>
        <button
          onClick={() => {
            if (isAdmin) {
              handleDirectDelete();
            } else {
              openForm(() => setShowDeleteRequest(!showDeleteRequest));
            }
          }}
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
          title={isAdmin ? "Delete prayer" : "Request deletion"}
        >
          <Trash2 size={16} />
        </button>
      </div>

  {/* Centered timestamp for the prayer (positioned relative to the whole card) */}
  <span className="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-300">{formatDate(prayer.created_at)}</span>

  {/* Prayer Details */}
  <p className="text-gray-600 dark:text-gray-300 mb-4">{prayer.description}</p>
        {/* Status change buttons and info */}
        {isAdmin ? (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => onUpdateStatus(prayer.id, PrayerStatus.CURRENT)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                prayer.status === PrayerStatus.CURRENT
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => onUpdateStatus(prayer.id, PrayerStatus.ONGOING)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                prayer.status === PrayerStatus.ONGOING
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
              }`}
            >
              Ongoing
            </button>
            <button
              onClick={() => onUpdateStatus(prayer.id, PrayerStatus.ANSWERED)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                prayer.status === PrayerStatus.ANSWERED
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20'
              }`}
            >
              Answered
            </button>
            <button
              onClick={() => onUpdateStatus(prayer.id, PrayerStatus.CLOSED)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                prayer.status === PrayerStatus.CLOSED
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              Closed
            </button>
              {/* Add Update for admins (same behavior as non-admin add update) */}
              <button
                onClick={() => {
                  openForm(() => setShowAddUpdate(!showAddUpdate));
                }}
                className="px-3 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                Add Update
              </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Status: <span className="font-medium capitalize">{prayer.status}</span>
            </span>
            <button
              onClick={() => {
                openForm(() => setShowStatusChangeRequest(!showStatusChangeRequest));
              }}
              className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              Request Status Change
            </button>
            <button
              onClick={() => {
                openForm(() => setShowAddUpdate(!showAddUpdate));
              }}
              className="px-3 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              Add Update
            </button>
          </div>
        )}
        
        {/* Updates exist; list is shown below */}

      {/* Add Update Form */}
      {showAddUpdate && (
        <form onSubmit={handleAddUpdate} className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-3">Add Prayer Update</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First name"
                value={updateFirstName}
                onChange={(e) => setUpdateFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <input
                type="text"
                placeholder="Last name"
                value={updateLastName}
                onChange={(e) => setUpdateLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <input
              type="email"
              placeholder="Your email"
              value={updateAuthorEmail}
              onChange={(e) => setUpdateAuthorEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <textarea
              placeholder="Prayer update..."
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-green-300 dark:border-green-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 h-20"
              required
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={updateIsAnonymous}
                onChange={(e) => setUpdateIsAnonymous(e.target.checked)}
                className="rounded border-gray-900 dark:border-white bg-white dark:bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span>Post update anonymously</span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Update
              </button>
              <button
                type="button"
                onClick={() => setShowAddUpdate(false)}
                className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Delete Request Form */}
      {showDeleteRequest && !isAdmin && (
        <form onSubmit={handleDeleteRequest} className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">Request Prayer Deletion</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First name"
                value={deleteRequesterFirstName}
                onChange={(e) => setDeleteRequesterFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="text"
                placeholder="Last name"
                value={deleteRequesterLastName}
                onChange={(e) => setDeleteRequesterLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <input
              type="email"
              placeholder="Your email"
              value={deleteRequesterEmail}
              onChange={(e) => setDeleteRequesterEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              required
            />
            <textarea
              placeholder="Reason for deletion request..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteRequest(false)}
                className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Status Change Request Form */}
      {showStatusChangeRequest && !isAdmin && (
        <form onSubmit={handleStatusChangeRequest} className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">Request Status Change</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First name"
                value={statusChangeRequesterFirstName}
                onChange={(e) => setStatusChangeRequesterFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Last name"
                value={statusChangeRequesterLastName}
                onChange={(e) => setStatusChangeRequesterLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <input
              type="email"
              placeholder="Your email"
              value={statusChangeRequesterEmail}
              onChange={(e) => setStatusChangeRequesterEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="relative">
              <select
                value={requestedStatus}
                onChange={(e) => setRequestedStatus(e.target.value as PrayerStatus)}
                className="w-full appearance-none px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                required
              >
                <option value={PrayerStatus.CURRENT}>Current</option>
                <option value={PrayerStatus.ONGOING}>Ongoing</option>
                <option value={PrayerStatus.ANSWERED}>Answered</option>
                <option value={PrayerStatus.CLOSED}>Closed</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <textarea
              placeholder="Reason for status change request..."
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => setShowStatusChangeRequest(false)}
                className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Recent Updates */}
      {prayer.updates && prayer.updates.length > 0 && (
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recent Updates {prayer.updates.length > 2 && `(${showAllUpdates ? prayer.updates.length : 2} of ${prayer.updates.length})`}
            </h4>
            {prayer.updates.length > 2 && (
              <button
                onClick={() => setShowAllUpdates(!showAllUpdates)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
              >
                {showAllUpdates ? 'Show less' : 'Show all'}
                <ChevronDown size={14} className={`transform transition-transform ${showAllUpdates ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {/* Show last 2 updates by default, or all if showAllUpdates is true */}
            {(showAllUpdates ? prayer.updates : prayer.updates.slice(-2)).map((update) => (
              <div key={update.id} className="bg-gray-100 dark:bg-gray-600 rounded-lg p-3">
                <div className="relative mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {update.is_anonymous ? 'Anonymous' : update.author}
                    </span>
                    <button
                      onClick={async () => {
                        if (isAdmin) {
                          if (confirm('Are you sure you want to delete this update? This action cannot be undone.')) {
                            try {
                              await onDeleteUpdate(update.id);
                              // show a toast confirmation
                              showToast('Update deleted', 'success');
                            } catch (err) {
                              console.error('Failed to delete update:', err);
                              showToast('Failed to delete update', 'error');
                            }
                          }
                        } else {
                          // Toggle the form - close if already open, open if closed
                          if (showUpdateDeleteRequest === update.id) {
                            setShowUpdateDeleteRequest(null);
                          } else {
                            openForm(() => setShowUpdateDeleteRequest(update.id));
                          }
                        }
                      }}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 ml-2"
                      title={isAdmin ? 'Delete update' : 'Request update deletion'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">{formatDate(update.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{update.content}</p>
                
                {/* Inline Update Deletion Request Form */}
                {showUpdateDeleteRequest === update.id && !isAdmin && (
                  <form onSubmit={handleUpdateDeletionRequest} className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Request Update Deletion</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="First name"
                          value={updateDeleteRequesterFirstName}
                          onChange={(e) => setUpdateDeleteRequesterFirstName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Last name"
                          value={updateDeleteRequesterLastName}
                          onChange={(e) => setUpdateDeleteRequesterLastName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        />
                      </div>
                      <input
                        type="email"
                        placeholder="Your email"
                        value={updateDeleteRequesterEmail}
                        onChange={(e) => setUpdateDeleteRequesterEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                      <textarea
                        placeholder="Reason for update deletion request..."
                        value={updateDeleteReason}
                        onChange={(e) => setUpdateDeleteReason(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
                        required
                      />
                      {updateDeleteError && (
                        <div className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                          {updateDeleteError}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button 
                          type="submit" 
                          disabled={isSubmittingUpdateDelete} 
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                          {isSubmittingUpdateDelete ? 'Submitting...' : 'Submit Request'}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setShowUpdateDeleteRequest(null)} 
                          className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
          
          {/* (removed 'Show more' button) */}
          { /* Removed top-level form - now inline under each update */ }
          {false && showUpdateDeleteRequest && !isAdmin && (
            <form onSubmit={handleUpdateDeletionRequest} className="mt-4 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">Request Update Deletion</h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="First name"
                    value={updateDeleteRequesterFirstName}
                    onChange={(e) => setUpdateDeleteRequesterFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={updateDeleteRequesterLastName}
                    onChange={(e) => setUpdateDeleteRequesterLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                  <input
                    type="email"
                    placeholder="Your email"
                    value={updateDeleteRequesterEmail}
                    onChange={(e) => setUpdateDeleteRequesterEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                <textarea
                  placeholder="Reason for update deletion request..."
                  value={updateDeleteReason}
                  onChange={(e) => setUpdateDeleteReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={isSubmittingUpdateDelete} className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">{isSubmittingUpdateDelete ? 'Submitting...' : 'Submit Request'}</button>
                  <button type="button" onClick={() => setShowUpdateDeleteRequest(null)} className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500">Cancel</button>
                </div>
                {updateDeleteError && (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-300">{updateDeleteError}</p>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};