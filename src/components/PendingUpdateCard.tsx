import React, { useState } from 'react';
import { Calendar, User, CheckCircle, XCircle, MessageCircle, ArrowRight, Edit2, Save, X } from 'lucide-react';
import type { PrayerUpdate } from '../types/prayer';

interface PendingUpdateCardProps {
  update: PrayerUpdate & { prayer_title?: string };
  onApprove: (id: string) => Promise<void>;
  onDeny: (id: string, reason: string) => Promise<void>;
  onEdit?: (id: string, updates: { content?: string; author?: string }) => Promise<void>;
}

export const PendingUpdateCard: React.FC<PendingUpdateCardProps> = ({ 
  update, 
  onApprove, 
  onDeny,
  onEdit
}) => {
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [loading, setLoading] = useState<'approve' | 'deny' | 'edit' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(update.content);
  const [editAuthor, setEditAuthor] = useState(update.author);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleApprove = async () => {
    setLoading('approve');
    try {
      // If editing mode is active, persist edits before approving
      if (isEditing && onEdit) {
        setLoading('edit');
        await onEdit(update.id, { content: editContent, author: editAuthor });
        setIsEditing(false);
      }
      await onApprove(update.id);
    } catch (error) {
      console.error('Failed to approve update:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleDeny = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!denyReason.trim()) return;
    
    setLoading('deny');
    try {
      await onDeny(update.id, denyReason);
      setDenyReason('');
      setShowDenyForm(false);
    } catch (error) {
      console.error('Failed to deny update:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors">
      {/* Header - hide while editing */}
      {!isEditing && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Prayer Update
            </h3>

            {/* Update Content */}
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-300">{update.content}</p>
            </div>

            {/* Meta Information */}
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              {update.prayer_title && (
                <div className="flex items-center gap-1">
                  <MessageCircle size={14} />
                  <span>Update for: {update.prayer_title}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <User size={14} />
                <span>By {update.author}</span>
              </div>
              {update.author_email && (
                <div className="flex items-center gap-1">
                  <MessageCircle size={14} />
                  <span className="break-words">Email: {update.author_email}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>Submitted {formatDate(update.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - hide while editing to match prayer edit form */}
      {!isEditing && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleApprove}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCircle size={16} />
            {loading === 'approve' ? 'Approving...' : 'Approve'}
          </button>

          {/* Edit button: blue with pencil icon, second in order */}
          {onEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              disabled={loading !== null}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Edit2 size={16} />
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </button>
          )}

          <button
            onClick={() => setShowDenyForm(!showDenyForm)}
            disabled={loading !== null}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <XCircle size={16} />
            Deny
          </button>
        </div>
      )}

          {/* Deny Form */}
          {showDenyForm && (
            <form onSubmit={handleDeny} className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Reason for denial (required):
          </label>
          <textarea
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="Explain why this prayer update cannot be approved..."
            className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-red-900/30 text-gray-900 dark:text-red-100 placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows={3}
            required
          />
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={!denyReason.trim() || loading === 'deny'}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'deny' ? 'Denying...' : 'Confirm Denial'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDenyForm(false);
                setDenyReason('');
              }}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Inline Edit Form */}
      {isEditing && onEdit && (
        <form onSubmit={async (e) => { e.preventDefault(); setLoading('edit'); try { await onEdit(update.id, { content: editContent, author: editAuthor }); setIsEditing(false); } catch (err) { console.error('Failed to save edit:', err); } finally { setLoading(null); } }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Update Details *</label>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Author *</label>
            <input
              type="text"
              value={editAuthor}
              onChange={(e) => setEditAuthor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading === 'edit'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              {loading === 'edit' ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              onClick={() => { setIsEditing(false); setEditContent(update.content); setEditAuthor(update.author); }}
              disabled={loading === 'edit'}
              className="flex items-center gap-2 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};