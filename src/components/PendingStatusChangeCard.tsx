import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, User, Calendar, MessageSquare, ArrowRight, Check } from 'lucide-react';
import type { StatusChangeRequest } from '../types/prayer';
import { lookupPersonByEmail, formatPersonName, type PlanningCenterPerson } from '../lib/planningcenter';

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
  const [pcPerson, setPcPerson] = useState<PlanningCenterPerson | null>(null);
  const [pcLoading, setPcLoading] = useState(false);
  const [pcError, setPcError] = useState(false);

  // Lookup email in Planning Center when component mounts
  useEffect(() => {
    const lookupEmail = async () => {
      if (!statusChangeRequest.requested_email) return;

      setPcLoading(true);
      setPcError(false);
      
      try {
        const result = await lookupPersonByEmail(statusChangeRequest.requested_email);
        if (result.people && result.people.length > 0) {
          setPcPerson(result.people[0]);
        } else {
          setPcPerson(null);
        }
      } catch (error) {
        console.error('Error looking up Planning Center person:', error);
        setPcError(true);
      } finally {
        setPcLoading(false);
      }
    };

    lookupEmail();
  }, [statusChangeRequest.requested_email]);

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
      case 'current':
        return 'text-blue-600 dark:text-blue-400';
      case 'answered':
        return 'text-green-600 dark:text-green-400';
      case 'archived':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Status Change Request
          </h3>

          {/* Prayer Info */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Prayer: {statusChangeRequest.prayer_title || 'Untitled'}
            </h4>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <ArrowRight className="h-4 w-4" />
              <span>
                Change status to: <span className={`font-semibold capitalize ${getStatusColor(statusChangeRequest.requested_status)}`}>
                  {statusChangeRequest.requested_status}
                </span>
              </span>
            </div>
          </div>

          {/* Reason */}
          {statusChangeRequest.reason && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{statusChangeRequest.reason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Meta Information */}
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>Requested by: {statusChangeRequest.requested_by}</span>
            </div>
            {statusChangeRequest.requested_email && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <MessageSquare size={14} />
                  <span className="break-words">Email: {statusChangeRequest.requested_email}</span>
                </div>
                {pcLoading && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                    Checking Planning Center...
                  </span>
                )}
                {!pcLoading && pcPerson && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                    <Check size={12} />
                    <span>Planning Center: {formatPersonName(pcPerson)}</span>
                  </div>
                )}
                {!pcLoading && !pcPerson && !pcError && statusChangeRequest.requested_email && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
                    <XCircle size={12} />
                    <span>Not in Planning Center</span>
                  </div>
                )}
                {pcError && (
                  <span className="text-xs text-red-500 dark:text-red-400 italic">
                    (PC lookup failed)
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>Submitted {formatDate(statusChangeRequest.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleApprove}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <CheckCircle size={16} />
          Approve
        </button>
        <button
          onClick={() => setShowDenyForm(!showDenyForm)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
            value={denialReason}
            onChange={(e) => setDenialReason(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-red-900/30 text-gray-900 dark:text-red-100 placeholder-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows={3}
            placeholder="Explain why this status change request is being denied..."
            required
          />
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              disabled={!denialReason.trim()}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Denial
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