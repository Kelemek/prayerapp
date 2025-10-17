import React, { useState } from 'react';
import { CheckCircle, XCircle, Mail, User, Clock } from 'lucide-react';

interface PendingPreferenceChange {
  id: string;
  name: string;
  email: string;
  receive_new_prayer_notifications: boolean;
  created_at: string;
}

interface PendingPreferenceChangeCardProps {
  change: PendingPreferenceChange;
  onApprove: (id: string) => Promise<void>;
  onDeny: (id: string, reason: string) => Promise<void>;
}

export const PendingPreferenceChangeCard: React.FC<PendingPreferenceChangeCardProps> = ({
  change,
  onApprove,
  onDeny,
}) => {
  const [showDenyForm, setShowDenyForm] = useState(false);
  const [denialReason, setDenialReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await onApprove(change.id);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!denialReason.trim()) {
      alert('Please provide a reason for denial');
      return;
    }

    setProcessing(true);
    try {
      await onDeny(change.id, denialReason);
      setShowDenyForm(false);
      setDenialReason('');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            Preference Change Request
          </h3>

          {/* User Info */}
          <div className="mb-4">
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <User size={14} />
                <span>{change.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail size={14} />
                <span className="break-words">{change.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Submitted {new Date(change.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>

          {/* Preference Change */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Preference:
            </p>
            <div className="flex items-center gap-2">
              {change.receive_new_prayer_notifications ? (
                <>
                  <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Wants to receive new prayer notifications
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="text-red-600 dark:text-red-400" size={16} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Wants to opt out of new prayer notifications
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleApprove}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCircle size={16} />
          {processing ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={() => setShowDenyForm(!showDenyForm)}
          disabled={processing}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <XCircle size={16} />
          Deny
        </button>
      </div>

      {/* Deny Form */}
      {showDenyForm && (
        <form onSubmit={(e) => { e.preventDefault(); handleDeny(); }} className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <label className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">
            Reason for denial (required):
          </label>
          <textarea
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
            placeholder="Explain why this preference change request is being denied..."
            className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-red-900/30 text-gray-900 dark:text-red-100 placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows={3}
            required
          />
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={!denialReason.trim() || processing}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Denying...' : 'Confirm Denial'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowDenyForm(false);
                setDenialReason('');
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
