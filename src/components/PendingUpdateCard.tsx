import React, { useState } from 'react';
import { Calendar, User, CheckCircle, XCircle, MessageCircle, ArrowRight } from 'lucide-react';
import type { PrayerUpdate } from '../types/prayer';

interface PendingUpdateCardProps {
  update: PrayerUpdate & { prayer_title?: string };
  onApprove: (id: string) => Promise<void>;
  onDeny: (id: string, reason: string) => Promise<void>;
}

export const PendingUpdateCard: React.FC<PendingUpdateCardProps> = ({ 
  update, 
  onApprove, 
  onDeny 
}) => {
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [loading, setLoading] = useState<'approve' | 'deny' | null>(null);

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
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {update.prayer_title && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
              <MessageCircle size={14} />
              <span>Update for: </span>
              <ArrowRight size={14} />
              <span className="font-medium text-gray-800 dark:text-gray-200">{update.prayer_title}</span>
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Prayer Update
          </h3>
        </div>
      </div>

      {/* Update Content */}
      <div className="mb-4">
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-gray-700 dark:text-gray-300">{update.content}</p>
        </div>
      </div>

      {/* Meta Information */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <User size={14} />
          <span>By {update.author}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          <span>Submitted {formatDate(update.created_at)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle size={16} />
          {loading === 'approve' ? 'Approving...' : 'Approve'}
        </button>
        
        <button
          onClick={() => setShowDenyForm(!showDenyForm)}
          disabled={loading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <XCircle size={16} />
          Deny
        </button>
      </div>

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
    </div>
  );
};