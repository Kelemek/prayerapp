import React, { useState } from 'react';
import { Calendar, User, CheckCircle, MessageCircle, Trash2 } from 'lucide-react';
import { PrayerStatus } from '../types/prayer';
import type { PrayerRequest } from '../types/prayer';

interface PrayerCardProps {
  prayer: PrayerRequest;
  onUpdateStatus: (id: string, status: PrayerStatus) => void;
  onAddUpdate: (id: string, content: string, author: string) => void;
  onDelete: (id: string) => void;
  onRequestDelete: (prayerId: string, reason: string, requesterName: string) => Promise<void>;
  isAdmin: boolean;
}

export const PrayerCard: React.FC<PrayerCardProps> = ({ 
  prayer, 
  onUpdateStatus, 
  onAddUpdate, 
  onDelete,
  onRequestDelete,
  isAdmin 
}) => {
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updateAuthor, setUpdateAuthor] = useState('');
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteRequesterName, setDeleteRequesterName] = useState('');
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  // Debug logging
  console.log('PrayerCard render:', { 
    prayerId: prayer.id, 
    isAdmin, 
    showDeleteRequest,
    shouldShowDeleteForm: showDeleteRequest && !isAdmin
  });

  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim() || !updateAuthor.trim()) return;
    
    onAddUpdate(prayer.id, updateText, updateAuthor);
    setUpdateText('');
    setUpdateAuthor('');
    setShowAddUpdate(false);
    setShowUpdateSuccess(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowUpdateSuccess(false);
    }, 3000);
  };

  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim() || !deleteRequesterName.trim()) return;
    
    try {
      await onRequestDelete(prayer.id, deleteReason, deleteRequesterName);
      setDeleteReason('');
      setDeleteRequesterName('');
      setShowDeleteRequest(false);
      setShowDeleteSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowDeleteSuccess(false);
      }, 3000);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-4 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{prayer.title}</h3>
        </div>
        <button
          onClick={() => {
            console.log('Delete button clicked, isAdmin:', isAdmin, 'showDeleteRequest:', showDeleteRequest);
            if (isAdmin) {
              handleDirectDelete();
            } else {
              setShowDeleteRequest(!showDeleteRequest);
            }
          }}
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
          title={isAdmin ? "Delete prayer" : "Request deletion"}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Prayer For */}
      {prayer.prayer_for && (
        <div className="mb-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Prayer for: </span>
          <span className="text-gray-800 dark:text-gray-200">{prayer.prayer_for}</span>
        </div>
      )}

      {/* Prayer Details */}
      {prayer.description && (
        <p className="text-gray-600 dark:text-gray-300 mb-4">{prayer.description}</p>
      )}

      {/* Meta Information */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <User size={14} />
          <span>
            {prayer.is_anonymous === true || 
             prayer.requester === 'Anonymous' || 
             prayer.requester?.toLowerCase() === 'anonymous'
              ? 'Anonymous' 
              : prayer.requester}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>{formatDate(prayer.date_requested)}</span>
        </div>
        {prayer.date_answered && (
          <div className="flex items-center gap-1">
            <CheckCircle size={14} />
            <span>Answered {formatDate(prayer.date_answered)}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Status Update Buttons */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => onUpdateStatus(prayer.id, PrayerStatus.ACTIVE)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              prayer.status === PrayerStatus.ACTIVE
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
          >
            Active
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
        </div>
        
        <div className="border-l border-gray-200 dark:border-gray-600 pl-2 ml-2">
          <button
            onClick={() => setShowAllUpdates(!showAllUpdates)}
            className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            <MessageCircle size={14} />
            {showAllUpdates ? 'Hide' : 'Show All'} Updates ({prayer.updates?.length || 0})
          </button>
        </div>
        
        <button
          onClick={() => setShowAddUpdate(!showAddUpdate)}
          className="px-3 py-1 text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
        >
          Add Update
        </button>
      </div>

      {/* Update Success Message */}
      {showUpdateSuccess && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✅ Update submitted for admin approval
          </p>
        </div>
      )}

      {/* Add Update Form */}
      {showAddUpdate && (
        <form onSubmit={handleAddUpdate} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Your name"
              value={updateAuthor}
              onChange={(e) => setUpdateAuthor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <textarea
              placeholder="Prayer update..."
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              required
            />
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

      {/* Delete Request Success Message */}
      {showDeleteSuccess && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            🗑️ Deletion request submitted for admin review
          </p>
        </div>
      )}

      {/* Delete Request Form */}
      {showDeleteRequest && !isAdmin && (
        <form onSubmit={handleDeleteRequest} className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">Request Prayer Deletion</h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Your name"
              value={deleteRequesterName}
              onChange={(e) => setDeleteRequesterName(e.target.value)}
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
                onClick={() => console.log('Submit Request button clicked')}
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

      {/* Recent Updates - Always show last 2 */}
      {prayer.updates && prayer.updates.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Recent Updates
            {prayer.updates.length > 2 && !showAllUpdates && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                (showing last 2 of {prayer.updates.length})
              </span>
            )}
          </h4>
          <div className="space-y-3">
            {/* Show last 2 updates by default, or all if showAllUpdates is true */}
            {(showAllUpdates ? prayer.updates : prayer.updates.slice(-2)).map((update) => (
              <div key={update.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{update.author}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(update.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{update.content}</p>
              </div>
            ))}
          </div>
          
          {/* Show more button if there are more than 2 updates and not showing all */}
          {prayer.updates.length > 2 && !showAllUpdates && (
            <button
              onClick={() => setShowAllUpdates(true)}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              Show {prayer.updates.length - 2} more updates
            </button>
          )}
        </div>
      )}
    </div>
  );
};