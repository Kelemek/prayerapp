import React, { useState } from 'react';
import { AlertTriangle, Check, X, User, Calendar, MessageSquare } from 'lucide-react';
import type { DeletionRequest } from '../types/prayer';

interface PendingDeletionCardProps {
  deletionRequest: DeletionRequest & { prayer_title?: string };
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string, reason: string) => void;
}

export const PendingDeletionCard: React.FC<PendingDeletionCardProps> = ({
  deletionRequest,
  onApprove,
  onDeny
}) => {
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [denialReason, setDenialReason] = useState('');

  const handleApprove = () => {
    onApprove(deletionRequest.id);
  };

  const handleDeny = (e: React.FormEvent) => {
    e.preventDefault();
    if (denialReason.trim()) {
      onDeny(deletionRequest.id, denialReason.trim());
      setDenialReason('');
      setShowDenyForm(false);
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

  return (
    <div className="border border-red-200 dark:border-red-800 rounded-lg p-6 bg-red-50 dark:bg-red-950/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h3 className="text-lg font-medium text-red-900 dark:text-red-100">
            Prayer Deletion Request
          </h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleApprove}
            className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve & Delete
          </button>
          <button
            onClick={() => setShowDenyForm(!showDenyForm)}
            className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Deny
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">
            Prayer Title:
          </h4>
          <p className="text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/50 p-2 rounded">
            {deletionRequest.prayer_title || 'Unknown Prayer'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
            <User className="h-4 w-4" />
            <span className="text-sm">
              <strong>Requested by:</strong> {deletionRequest.requested_by}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              <strong>Requested:</strong> {formatDate(deletionRequest.created_at)}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-2">
            <MessageSquare className="h-4 w-4 text-red-700 dark:text-red-300" />
            <span className="text-sm font-medium text-red-900 dark:text-red-100">
              Reason for deletion:
            </span>
          </div>
          <p className="text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/50 p-2 rounded text-sm">
            {deletionRequest.reason}
          </p>
        </div>
      </div>

      {showDenyForm && (
        <form onSubmit={handleDeny} className="mt-4 p-4 bg-red-100 dark:bg-red-900/50 rounded-lg border border-red-300 dark:border-red-700">
          <label htmlFor={`denial-reason-${deletionRequest.id}`} className="block text-sm font-medium text-red-900 dark:text-red-100 mb-2">
            Reason for denial:
          </label>
          <textarea
            id={`denial-reason-${deletionRequest.id}`}
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
            className="w-full px-3 py-2 border border-red-300 dark:border-red-600 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-red-950 dark:text-red-100"
            rows={3}
            placeholder="Explain why this deletion request is being denied..."
            required
          />
          <div className="flex space-x-2 mt-2">
            <button
              type="submit"
              className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Confirm Denial
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDenyForm(false);
                setDenialReason('');
              }}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};