import React, { useState } from 'react';
import { CheckCircle, XCircle, User, Calendar, MessageSquare } from 'lucide-react';
import type { DeletionRequest } from '../types/prayer';
import { DeletionStyleCard } from './DeletionStyleCard';

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

  const handleApprove = () => onApprove(deletionRequest.id);
  const handleDeny = (e: React.FormEvent) => {
    e.preventDefault();
    if (denialReason.trim()) {
      onDeny(deletionRequest.id, denialReason.trim());
      setDenialReason('');
      setShowDenyForm(false);
    }
  };

  const metaLeft = (
    <div className="flex items-center gap-1">
      <User size={14} />
      <span>Requested by: {deletionRequest.requested_by}</span>
    </div>
  );

  const metaRight = (
    <div className="flex items-center gap-1">
      <Calendar size={14} />
      <span>{new Date(deletionRequest.created_at).toLocaleString()}</span>
    </div>
  );

  const actions = (
    <>
      <div className="flex gap-2">
        <button onClick={handleApprove} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><CheckCircle size={16} />Approve & Delete</button>
        <button onClick={() => setShowDenyForm(!showDenyForm)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"><XCircle size={16} />Deny</button>
      </div>
      {showDenyForm && (
        <form onSubmit={handleDeny} className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
          <label htmlFor={`denial-reason-${deletionRequest.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Reason for denial:</label>
          <textarea id={`denial-reason-${deletionRequest.id}`} value={denialReason} onChange={(e) => setDenialReason(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Explain why this deletion request is being denied..." required />
          <div className="flex gap-2 mt-3">
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Confirm Denial</button>
            <button type="button" onClick={() => { setShowDenyForm(false); setDenialReason(''); }} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors">Cancel</button>
          </div>
        </form>
      )}
    </>
  );

  return (
    <DeletionStyleCard
      title="Prayer Deletion Request"
      subtitle="Prayer Title:"
      content={<span>{deletionRequest.prayer_title || 'Unknown Prayer'}</span>}
      metaLeft={metaLeft}
      metaRight={metaRight}
      reason={deletionRequest.reason}
      actions={actions}
    />
  );
};