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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="text-purple-600 dark:text-purple-400" size={18} />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                {change.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail size={14} />
              <span>{change.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-500">
            <Clock size={12} />
            {new Date(change.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Preference Change */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notification Preference:
          </p>
          <div className="flex items-center gap-2">
            {change.receive_new_prayer_notifications ? (
              <>
                <CheckCircle className="text-green-600 dark:text-green-400" size={16} />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  Wants to receive new prayer notifications
                </span>
              </>
            ) : (
              <>
                <XCircle className="text-red-600 dark:text-red-400" size={16} />
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  Wants to opt out of new prayer notifications
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {!showDenyForm ? (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors text-sm"
            >
              <CheckCircle size={16} />
              Approve
            </button>
            <button
              onClick={() => setShowDenyForm(true)}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm"
            >
              <XCircle size={16} />
              Deny
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Please provide a reason for denying this preference change..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeny}
                disabled={processing}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 transition-colors text-sm"
              >
                Confirm Denial
              </button>
              <button
                onClick={() => {
                  setShowDenyForm(false);
                  setDenialReason('');
                }}
                disabled={processing}
                className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
