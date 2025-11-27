import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, User, Calendar, MessageSquare, Check } from 'lucide-react';
import type { UpdateDeletionRequest } from '../types/prayer';
import { DeletionStyleCard } from './DeletionStyleCard';
import { lookupPersonByEmail, formatPersonName, type PlanningCenterPerson } from '../lib/planningcenter';

// Extended type with joined prayer_updates data (partial fields from database join)
interface UpdateDeletionRequestWithUpdate extends UpdateDeletionRequest {
  prayer_updates?: {
    id?: string;
    prayer_id?: string;
    content?: string;
    author?: string;
    author_email?: string;
    created_at?: string;
    prayers?: {
      title?: string;
      prayer_for?: string;
    };
  };
}

interface PendingUpdateDeletionCardProps {
  deletionRequest: UpdateDeletionRequestWithUpdate;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string, reason: string) => void;
}

export const PendingUpdateDeletionCard: React.FC<PendingUpdateDeletionCardProps> = ({
  deletionRequest,
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
      const email = deletionRequest.prayer_updates?.author_email;
      if (!email) return;

      setPcLoading(true);
      setPcError(false);
      
      try {
        const result = await lookupPersonByEmail(email);
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
  }, [deletionRequest.prayer_updates?.author_email]);

  const handleApprove = () => onApprove(deletionRequest.id);
  const handleDeny = (e: React.FormEvent) => {
    e.preventDefault();
    if (denialReason.trim()) {
      onDeny(deletionRequest.id, denialReason.trim());
      setDenialReason('');
      setShowDenyForm(false);
    }
  };

  const contentNode = (
    <>
      <p className="font-medium">{deletionRequest.prayer_updates?.prayers?.title ?? 'Unknown Prayer'}</p>
      {deletionRequest.prayer_updates && (
        <>
          <p className="mt-3 text-sm whitespace-pre-wrap">{deletionRequest.prayer_updates.content}</p>
          <p className="text-sm mt-2">By: {deletionRequest.prayer_updates.author}{deletionRequest.prayer_updates.author_email ? ` — ${deletionRequest.prayer_updates.author_email}` : ''}</p>
        </>
      )}
    </>
  );

  const metaLeft = (
    <>
      <div className="flex items-center gap-1">
        <User size={14} />
        <span>Requested by: {deletionRequest.requested_by}</span>
      </div>
      {deletionRequest.requested_email && (
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <MessageSquare size={14} />
            <span className="break-words">Email: {deletionRequest.requested_email}</span>
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
          {!pcLoading && !pcPerson && !pcError && deletionRequest.requested_email && (
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
    </>
  );

  const metaRight = (
    <div className="flex items-center gap-1">
      <Calendar size={14} />
      <span>{new Date(deletionRequest.created_at).toLocaleString()}</span>
    </div>
  );

  const actions = (
    <>
      <button onClick={handleApprove} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><CheckCircle size={16} />Approve & Delete</button>
      <button onClick={() => setShowDenyForm(!showDenyForm)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"><XCircle size={16} />Deny</button>
      {showDenyForm && (
        <form onSubmit={handleDeny} className="w-full mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <label htmlFor={`denial-reason-${deletionRequest.id}`} className="block text-sm font-medium text-red-800 dark:text-red-200 mb-2">Reason for denial (required):</label>
          <textarea id={`denial-reason-${deletionRequest.id}`} value={denialReason} onChange={(e) => setDenialReason(e.target.value)} className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-red-900/40 text-gray-900 dark:!text-white placeholder-red-400 dark:placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" rows={3} placeholder="Explain why this deletion request is being denied..." required />
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={!denialReason.trim()} className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">Confirm Denial</button>
            <button type="button" onClick={() => { setShowDenyForm(false); setDenialReason(''); }} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-md hover:bg-gray-400 dark:hover:bg-gray-500">Cancel</button>
          </div>
        </form>
      )}
    </>
  );

  return (
    <DeletionStyleCard
      title="Update Deletion Request"
      subtitle="Update for:"
      content={contentNode}
      metaLeft={metaLeft}
      metaRight={metaRight}
      reason={deletionRequest.reason}
      actions={actions}
    />
  );
};
