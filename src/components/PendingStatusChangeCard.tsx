import React, { useState } from 'react';
import { RefreshCw, Check, X, User, Calendar, MessageSquare, ArrowRight } from 'lucide-react';
import type { StatusChangeRequest } from '../types/prayer';

interface PendingStatusChangeCardProps {
  statusChangeRequest: StatusChangeRequest & { prayer_title?: string };
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string, reason: string) => void;
}

export const PendingStatusChangeCard: React.FC<PendingStatusChangeCardProps> = ({
  statusChangeRequest,
  onApprove,
  onDeny
}) => {
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [denialReason, setDenialReason] = useState('');

  const handleApprove = () => {
    onApprove(statusChangeRequest.id);
  };

  const handleDeny = (e: React.FormEvent) => {
    e.preventDefault();
    if (denialReason.trim()) {
      onDeny(statusChangeRequest.id, denialReason.trim());
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-blue-600 dark:text-blue-400';
      case 'ongoing':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'answered':
        return 'text-green-600 dark:text-green-400';
      case 'closed':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-6 bg-blue-50 dark:bg-blue-950/50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
            Status Change Request
          </h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleApprove}
            className="flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </button>
          <button
            onClick={() => setShowDenyForm(true)}
            className="flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            <X className="h-4 w-4 mr-1" />
            Deny
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-white dark:bg-gray-800 rounded-md p-3 border border-blue-100 dark:border-blue-900">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            Prayer: {statusChangeRequest.prayer_title || 'Untitled'}
          </h4>
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center space-x-1">
              <ArrowRight className="h-4 w-4" />
              <span>
                Change status to: <span className={`font-medium capitalize ${getStatusColor(statusChangeRequest.requested_status)}`}>
                  {statusChangeRequest.requested_status}
                </span>
              </span>
            </div>
          </div>
        </div>

        {statusChangeRequest.reason && (
          <div className="flex items-start space-x-2">
            <MessageSquare className="h-4 w-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Reason:</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">{statusChangeRequest.reason}</p>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4 text-xs text-blue-600 dark:text-blue-400">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3" />
            <span>Requested by: {statusChangeRequest.requested_by}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(statusChangeRequest.created_at)}</span>
          </div>
        </div>
      </div>

      {showDenyForm && (
        <form onSubmit={handleDeny} className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Reason for denial:
          </label>
          <textarea
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            rows={3}
            placeholder="Explain why this status change request is being denied..."
            required
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              type="button"
              onClick={() => setShowDenyForm(false)}
              className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Submit Denial
            </button>
          </div>
        </form>
      )}
    </div>
  );
};