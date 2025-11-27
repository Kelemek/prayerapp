import React, { useState, useEffect, memo } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { PrayerStatus, type AllowanceLevel } from '../types/prayer';
import type { PrayerRequest } from '../types/prayer';
import { getUserInfo, saveUserInfo } from '../utils/userInfoStorage';
import { useVerification } from '../hooks/useVerification';
import { VerificationDialog } from './VerificationDialog';

interface PrayerCardProps {
  prayer: PrayerRequest;
  onUpdateStatus: (id: string, status: PrayerStatus) => void;
  onAddUpdate: (id: string, content: string, author: string, authorEmail: string, isAnonymous: boolean, markAsAnswered?: boolean) => void;
  onDelete: (id: string) => void;
  onRequestDelete: (prayerId: string, reason: string, requesterName: string, requesterEmail: string) => Promise<void>;
  onRequestStatusChange: (prayerId: string, newStatus: PrayerStatus, reason: string, requesterName: string, requesterEmail: string) => Promise<void>;
  onDeleteUpdate: (updateId: string) => Promise<void>;
  onRequestUpdateDelete: (updateId: string, reason: string, requesterName: string, requesterEmail: string) => Promise<unknown>;
  registerCloseCallback: (callback: () => void) => () => void;
  onFormOpen: () => void;
  isAdmin: boolean;
  deletionsAllowed?: AllowanceLevel;
  updatesAllowed?: AllowanceLevel;
}

export const PrayerCard: React.FC<PrayerCardProps> = memo(({ 
  prayer, 
  onUpdateStatus, 
  onAddUpdate, 
  onDelete,
  onRequestDelete,
  onRequestStatusChange,
  onDeleteUpdate,
  onRequestUpdateDelete,
  registerCloseCallback,
  onFormOpen,
  isAdmin,
  deletionsAllowed = 'everyone',
  updatesAllowed = 'everyone'
}) => {
  const displayedRequester = prayer.is_anonymous ? 'Anonymous' : prayer.requester;
  const [showAddUpdate, setShowAddUpdate] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [updateFirstName, setUpdateFirstName] = useState('');
  const [updateLastName, setUpdateLastName] = useState('');
  const [updateAuthorEmail, setUpdateAuthorEmail] = useState('');
  const [updateIsAnonymous, setUpdateIsAnonymous] = useState(false);
  const [updateMarkAsAnswered, setUpdateMarkAsAnswered] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteRequesterFirstName, setDeleteRequesterFirstName] = useState('');
  const [deleteRequesterLastName, setDeleteRequesterLastName] = useState('');
  const [deleteRequesterEmail, setDeleteRequesterEmail] = useState('');
  // State for update deletion request UI
  const [isSubmittingUpdateDelete, setIsSubmittingUpdateDelete] = useState(false);
  const [updateDeleteError, setUpdateDeleteError] = useState<string | null>(null);
  const [showUpdateDeleteRequest, setShowUpdateDeleteRequest] = useState<string | null>(null);
  const [updateDeleteReason, setUpdateDeleteReason] = useState('');
  const [updateDeleteRequesterFirstName, setUpdateDeleteRequesterFirstName] = useState('');
  const [updateDeleteRequesterLastName, setUpdateDeleteRequesterLastName] = useState('');
  const [updateDeleteRequesterEmail, setUpdateDeleteRequesterEmail] = useState('');
  const [showAllUpdates, setShowAllUpdates] = useState(false);
  const { showToast } = useToast();

  // Email verification
  const { isEnabled, requestCode } = useVerification();
  const [verificationState, setVerificationState] = useState<{
    isOpen: boolean;
    codeId: string | null;
    expiresAt: string | null;
    email: string;
    actionType: 'prayer_update' | 'prayer_deletion' | 'status_change' | 'update_deletion';
    codeActionType: 'prayer_update' | 'deletion_request' | 'status_change_request' | 'update_deletion_request';
    actionData: any;
  }>({
    isOpen: false,
    codeId: null,
    expiresAt: null,
    email: '',
    actionType: 'prayer_update',
    codeActionType: 'prayer_update',
    actionData: null
  });

  // Load saved user info when component mounts
  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo.firstName) {
      setUpdateFirstName(userInfo.firstName);
      setDeleteRequesterFirstName(userInfo.firstName);
      setUpdateDeleteRequesterFirstName(userInfo.firstName);
    }
    if (userInfo.lastName) {
      setUpdateLastName(userInfo.lastName);
      setDeleteRequesterLastName(userInfo.lastName);
      setUpdateDeleteRequesterLastName(userInfo.lastName);
    }
    if (userInfo.email) {
      setUpdateAuthorEmail(userInfo.email);
      setDeleteRequesterEmail(userInfo.email);
      setUpdateDeleteRequesterEmail(userInfo.email);
    }
  }, []);

  // Register callback to close all forms in this card
  useEffect(() => {
    const closeAllForms = () => {
      setShowAddUpdate(false);
      setShowDeleteRequest(false);
      setShowUpdateDeleteRequest(null);
    };
    
    return registerCloseCallback(closeAllForms);
  }, [registerCloseCallback]);

  // Helper functions to check permissions based on allowance level
  const canPerformAction = (allowanceLevel: AllowanceLevel, userEmail: string): boolean => {
    if (allowanceLevel === 'everyone') {
      return true;
    } else if (allowanceLevel === 'admin-only') {
      return false;
    } else if (allowanceLevel === 'original-requestor') {
      return userEmail.toLowerCase() === prayer.email.toLowerCase();
    }
    return false;
  };

  const shouldShowActionButton = (allowanceLevel: AllowanceLevel, userEmail?: string): boolean => {
    if (allowanceLevel === 'everyone') {
      return true;
    } else if (allowanceLevel === 'admin-only') {
      return false;
    } else if (allowanceLevel === 'original-requestor' && userEmail) {
      return true; // Show button, but validation happens on submit
    }
    return false;
  };

  const getPermissionMessage = (actionType: 'delete' | 'update'): string => {
    const allowanceLevel = actionType === 'delete' ? deletionsAllowed : updatesAllowed;
    if (allowanceLevel === 'original-requestor') {
      return `Only the person who originally requested this prayer can submit ${actionType} requests.`;
    }
    return '';
  };

  // Helper to open a form (closes all other forms first)
  const openForm = (formSetter: () => void) => {
    onFormOpen(); // Close all forms in all cards
    formSetter(); // Then open the desired form
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim() || !updateFirstName.trim() || !updateLastName.trim() || !updateAuthorEmail.trim()) return;
    
    // Check permissions based on allowance level
    if (!isAdmin && updatesAllowed === 'original-requestor') {
      if (updateAuthorEmail.toLowerCase() !== prayer.email.toLowerCase()) {
        showToast(
          'Only the person who originally requested this prayer can submit updates.',
          'error'
        );
        return;
      }
    }
    
    // Concatenate first and last name
    const fullName = `${updateFirstName.trim()} ${updateLastName.trim()}`;
    
    // Save user info to localStorage for future use
    saveUserInfo(updateFirstName, updateLastName, updateAuthorEmail);
    
    const updateData = {
      prayerId: prayer.id,
      content: updateText,
      author: fullName,
      authorEmail: updateAuthorEmail,
      isAnonymous: updateIsAnonymous,
      markAsAnswered: updateMarkAsAnswered
    };

    // Check if email verification is required
    if (isEnabled) {
      try {
        // Request verification code
        const verificationResult = await requestCode(
          updateAuthorEmail,
          'prayer_update',
          updateData
        );
        
        // If null, user was recently verified - skip verification dialog
        if (verificationResult === null) {
          await submitUpdate(updateData);
          return;
        }
        
        // Show verification dialog
        setVerificationState({
          isOpen: true,
          codeId: verificationResult.codeId,
          expiresAt: verificationResult.expiresAt,
          email: updateAuthorEmail,
          actionType: 'prayer_update',
          codeActionType: 'prayer_update',
          actionData: updateData
        });
      } catch (error) {
        console.error('Failed to request verification code:', error);
        try { showToast('Failed to request verification code. Please try again.', 'error'); } catch (err) { console.warn('Toast not available:', err); }
      }
    } else {
      // No verification required, submit directly
      await submitUpdate(updateData);
    }
  };

  const submitUpdate = async (updateData: any) => {
    try {
      // include author email, anonymous flag, and mark as answered when adding an update
      await onAddUpdate(updateData.prayerId, updateData.content, updateData.author, updateData.authorEmail, updateData.isAnonymous, updateData.markAsAnswered);
      setUpdateText('');
      // Don't reset name and email - keep them for next time
      // setUpdateFirstName('');
      // setUpdateLastName('');
      // setUpdateAuthorEmail('');
      setUpdateIsAnonymous(false);
      setUpdateMarkAsAnswered(false);
      setShowAddUpdate(false);
      try { showToast('Update submitted for admin approval', 'info'); } catch (err) { console.warn('Toast not available:', err); }
    } catch (error) {
      console.error('Failed to submit update:', error);
      try { showToast('Failed to submit update. Please try again.', 'error'); } catch (err) { console.warn('Toast not available:', err); }
    }
  };

  const handleDeleteRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteReason.trim() || !deleteRequesterFirstName.trim() || !deleteRequesterLastName.trim() || !deleteRequesterEmail.trim()) return;
    
    // Check permissions based on allowance level
    if (!isAdmin && deletionsAllowed === 'original-requestor') {
      if (deleteRequesterEmail.toLowerCase() !== prayer.email.toLowerCase()) {
        showToast(
          'Only the person who originally requested this prayer can submit deletion requests.',
          'error'
        );
        return;
      }
    }
    
    // Concatenate first and last name
    const fullName = `${deleteRequesterFirstName.trim()} ${deleteRequesterLastName.trim()}`;
    
    // Save user info to localStorage for future use
    saveUserInfo(deleteRequesterFirstName, deleteRequesterLastName, deleteRequesterEmail);
    
    const deleteData = {
      prayerId: prayer.id,
      reason: deleteReason,
      requesterName: fullName,
      requesterEmail: deleteRequesterEmail
    };

    // Check if email verification is required
    if (isEnabled) {
      try {
        // Request verification code
        const verificationResult = await requestCode(
          deleteRequesterEmail,
          'deletion_request',
          deleteData
        );
        
        // If null, user was recently verified - skip verification dialog
        if (verificationResult === null) {
          await submitDeleteRequest(deleteData);
          return;
        }
        
        // Show verification dialog
        setVerificationState({
          isOpen: true,
          codeId: verificationResult.codeId,
          expiresAt: verificationResult.expiresAt,
          email: deleteRequesterEmail,
          actionType: 'prayer_deletion',
          codeActionType: 'deletion_request',
          actionData: deleteData
        });
      } catch (error) {
        console.error('Failed to request verification code:', error);
        try { showToast('Failed to request verification code. Please try again.', 'error'); } catch (err) { console.warn('Toast not available:', err); }
      }
    } else {
      // No verification required, submit directly
      await submitDeleteRequest(deleteData);
    }
  };

  const submitDeleteRequest = async (deleteData: any) => {
    try {
      await onRequestDelete(deleteData.prayerId, deleteData.reason, deleteData.requesterName, deleteData.requesterEmail);
      setDeleteReason('');
      // Don't reset name and email - keep them for next time
      // setDeleteRequesterFirstName('');
      // setDeleteRequesterLastName('');
      // setDeleteRequesterEmail('');
      setShowDeleteRequest(false);
      try { showToast('Deletion request submitted for admin approval', 'info'); } catch (err) { console.warn('Toast not available:', err); }
    } catch (error) {
      console.error('Error in handleDeleteRequest:', error);
      // Don't reset the form on error so user can try again
      throw error;
    }
  };

  const handleDirectDelete = () => {
    if (confirm('Are you sure you want to delete this prayer? This action cannot be undone.')) {
      onDelete(prayer.id);
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

  const handleVerified = async (actionData: any) => {
    try {
      // Route to the correct submission function based on action type
      switch (verificationState.actionType) {
        case 'prayer_update':
          submitUpdate(actionData);
          break;
        case 'prayer_deletion':
          await submitDeleteRequest(actionData);
          break;
        case 'update_deletion':
          await submitUpdateDeletion(actionData);
          break;
      }
      
      // Close verification dialog
      setVerificationState({
        isOpen: false,
        codeId: null,
        expiresAt: null,
        email: '',
        actionType: 'prayer_update',
        codeActionType: 'prayer_update',
        actionData: null
      });
    } catch (error) {
      console.error('Failed to submit verified action:', error);
      throw error;
    }
  };

  const handleVerificationCancel = () => {
    setVerificationState({
      isOpen: false,
      codeId: null,
      expiresAt: null,
      email: '',
      actionType: 'prayer_update',
      codeActionType: 'prayer_update',
      actionData: null
    });
  };

  const handleResendCode = async () => {
    try {
      if (!verificationState.email || !verificationState.actionData) return;

      const actionKey = verificationState.codeActionType ?? verificationState.actionType;

      // Request new verification code
      const verificationResult = await requestCode(
        verificationState.email,
        actionKey,
        verificationState.actionData
      );
      
      // If null, user was recently verified - this shouldn't happen in resend case
      // but handle it anyway
      if (verificationResult === null) {
        console.warn('User was recently verified, no need to resend code');
        return;
      }
      
      // Update verification state with new code
      setVerificationState(prev => ({
        ...prev,
        codeId: verificationResult.codeId,
        expiresAt: verificationResult.expiresAt
      }));
    } catch (error) {
      console.error('Failed to resend verification code:', error);
      throw error;
    }
  };

  const handleUpdateDeletionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateDeleteReason.trim() || !updateDeleteRequesterFirstName.trim() || !updateDeleteRequesterLastName.trim() || !updateDeleteRequesterEmail.trim() || !showUpdateDeleteRequest) return;
    
    // Check permissions based on allowance level
    if (!isAdmin && deletionsAllowed === 'original-requestor') {
      if (updateDeleteRequesterEmail.toLowerCase() !== prayer.email.toLowerCase()) {
        showToast(
          'Only the person who originally requested this prayer can submit deletion requests for its updates.',
          'error'
        );
        return;
      }
    }
    
    // Concatenate first and last name
    const fullName = `${updateDeleteRequesterFirstName.trim()} ${updateDeleteRequesterLastName.trim()}`;
    
    // Save user info to localStorage for future use
    saveUserInfo(updateDeleteRequesterFirstName, updateDeleteRequesterLastName, updateDeleteRequesterEmail);
    
    const updateDeleteData = {
      updateId: showUpdateDeleteRequest,
      reason: updateDeleteReason,
      requesterName: fullName,
      requesterEmail: updateDeleteRequesterEmail
    };

    // Check if email verification is required
    if (isEnabled) {
      try {
        // Request verification code
        const verificationResult = await requestCode(
          updateDeleteRequesterEmail,
          'update_deletion_request',
          updateDeleteData
        );
        
        // If null, user was recently verified - skip verification dialog
        if (verificationResult === null) {
          await submitUpdateDeletion(updateDeleteData);
          return;
        }
        
        // Show verification dialog
        setVerificationState({
          isOpen: true,
          codeId: verificationResult.codeId,
          expiresAt: verificationResult.expiresAt,
          email: updateDeleteRequesterEmail,
          actionType: 'update_deletion',
          codeActionType: 'update_deletion_request',
          actionData: updateDeleteData
        });
      } catch (error) {
        console.error('Failed to request verification code:', error);
        setIsSubmittingUpdateDelete(false);
        try { showToast('Failed to request verification code. Please try again.', 'error'); } catch (err) { console.warn('Toast not available:', err); }
      }
    } else {
      // No verification required, submit directly
      await submitUpdateDeletion(updateDeleteData);
    }
  };

  const submitUpdateDeletion = async (updateDeleteData: any) => {
    try {
      setIsSubmittingUpdateDelete(true);
      setUpdateDeleteError(null);
      const res = await onRequestUpdateDelete(updateDeleteData.updateId, updateDeleteData.reason, updateDeleteData.requesterName, updateDeleteData.requesterEmail);
      if (!res || (res as { ok?: boolean }).ok === false) {
        // Handle common Supabase errors more gracefully
        let errMsg = (res && (res as { error?: unknown }).error) ? (res as { error?: unknown }).error : 'Failed to submit update deletion request';
        if (typeof errMsg === 'object' && errMsg !== null && 'message' in errMsg) errMsg = (errMsg as { message: string }).message;
        // Detect missing table error message patterns
        if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('relation') && errMsg.toLowerCase().includes('does not exist')) {
          errMsg = 'Server schema missing: update_deletion_requests table not found. Please run the migration.';
        }
        setUpdateDeleteError(errMsg as string);
        console.error('Failed to submit update deletion request', errMsg);
        setIsSubmittingUpdateDelete(false);
        return;
      }
      setUpdateDeleteReason('');
      // Don't reset name and email - keep them for next time
      // setUpdateDeleteRequesterName('');
      // setUpdateDeleteRequesterEmail('');
      setShowUpdateDeleteRequest(null);
      // show a toast to match other successful actions
      try { showToast('Update deletion request submitted for admin approval', 'info'); } catch (err) { console.warn('Toast not available:', err); }
    } finally {
      setIsSubmittingUpdateDelete(false);
    }
  };

  return (
  <div className={`prayer-card bg-white dark:bg-gray-800 rounded-lg shadow-md border-[2px] p-6 mb-4 transition-colors relative ${
    prayer.status === 'current' 
      ? '!border-[#0047AB] dark:!border-[#0047AB]' 
      : prayer.status === 'answered' 
        ? '!border-[#39704D] dark:!border-[#39704D]' 
        : '!border-[#C9A961] dark:!border-[#C9A961]'
  }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="relative flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-0 inline">Prayer for {prayer.prayer_for}</h3>
            {/* Status Badge */}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              prayer.status === 'current' 
                ? 'bg-[#0047AB] bg-opacity-20 text-[#0047AB] dark:bg-[#0047AB] dark:bg-opacity-30 dark:text-[#4A90E2]'
                : prayer.status === 'answered'
                ? 'bg-[#39704D] bg-opacity-20 text-[#39704D] dark:bg-[#39704D] dark:bg-opacity-30 dark:text-[#5FB876]'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
            }`}>
              {prayer.status === 'current' ? 'Current' : prayer.status === 'answered' ? 'Answered' : 'Archived'}
            </span>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Requested by <span className="font-medium text-gray-800 dark:text-gray-100">{displayedRequester}</span></span>
          </div>
        </div>
        {(isAdmin || shouldShowActionButton(deletionsAllowed, deleteRequesterEmail)) && (
          <button
            onClick={() => {
              if (isAdmin) {
                handleDirectDelete();
              } else {
                openForm(() => setShowDeleteRequest(!showDeleteRequest));
              }
            }}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
            title={isAdmin ? "Delete prayer" : "Request deletion"}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

  {/* Centered timestamp for the prayer (positioned relative to the whole card) */}
  <span className="absolute left-1/2 top-4 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-300">{formatDate(prayer.created_at)}</span>

  {/* Prayer Details */}
  <p className="text-gray-600 dark:text-gray-300 mb-4">{prayer.description}</p>
        {/* Action buttons */}
        {isAdmin ? (
          <div className="flex flex-wrap gap-1">
              {/* Add Update for admins (same behavior as non-admin add update) */}
              <button
                onClick={() => {
                  openForm(() => setShowAddUpdate(!showAddUpdate));
                }}
                className="px-3 py-1 text-xs bg-[#39704D] bg-opacity-10 dark:bg-opacity-20 text-[#39704D] dark:text-[#5FB876] rounded-md border border-[#39704D] hover:bg-opacity-20 dark:hover:bg-opacity-30"
              >
                Add Update
              </button>
          </div>
        ) : (
          shouldShowActionButton(updatesAllowed, updateAuthorEmail) && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  openForm(() => setShowAddUpdate(!showAddUpdate));
                }}
                className="px-3 py-1 text-xs bg-[#39704D] bg-opacity-10 dark:bg-opacity-20 text-[#39704D] dark:text-[#5FB876] rounded-md border border-[#39704D] hover:bg-opacity-20 dark:hover:bg-opacity-30"
              >
                Add Update
              </button>
            </div>
          )
        )}
        
        {/* Updates exist; list is shown below */}

      {/* Add Update Form */}
      {showAddUpdate && (
        <form onSubmit={handleAddUpdate} className="mb-4 p-4 bg-[#39704D] bg-opacity-10 dark:bg-[#39704D] dark:bg-opacity-20 border border-[#39704D] dark:border-[#39704D] rounded-lg">
          <h4 className="text-sm font-medium text-[#39704D] dark:text-[#5FB876] mb-3">Add Prayer Update</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First name"
                value={updateFirstName}
                onChange={(e) => setUpdateFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D]"
                required
              />
              <input
                type="text"
                placeholder="Last name"
                value={updateLastName}
                onChange={(e) => setUpdateLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D]"
                required
              />
            </div>
            <input
              type="email"
              placeholder="Your email"
              value={updateAuthorEmail}
              onChange={(e) => setUpdateAuthorEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D]"
              required
            />
            <textarea
              placeholder="Prayer update..."
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#39704D] dark:border-[#39704D] rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39704D] h-20"
              required
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={updateIsAnonymous}
                onChange={(e) => setUpdateIsAnonymous(e.target.checked)}
                className="rounded border-gray-900 dark:border-white bg-white dark:bg-gray-800 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span>Post update anonymously</span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={updateMarkAsAnswered}
                onChange={(e) => setUpdateMarkAsAnswered(e.target.checked)}
                className="rounded border-gray-900 dark:border-white bg-white dark:bg-gray-800 text-[#39704D] focus:ring-2 focus:ring-[#39704D]"
              />
              <span>Mark this prayer as answered</span>
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-[#39704D] text-white rounded-md hover:bg-[#2d5a3f]"
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

      {/* Delete Request Form */}
      {showDeleteRequest && !isAdmin && (
        <form onSubmit={handleDeleteRequest} className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-3">Request Prayer Deletion</h4>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="First name"
                value={deleteRequesterFirstName}
                onChange={(e) => setDeleteRequesterFirstName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
              <input
                type="text"
                placeholder="Last name"
                value={deleteRequesterLastName}
                onChange={(e) => setDeleteRequesterLastName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            <input
              type="email"
              placeholder="Your email"
              value={deleteRequesterEmail}
              onChange={(e) => setDeleteRequesterEmail(e.target.value)}
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

      {/* Recent Updates */}
      {prayer.updates && prayer.updates.length > 0 && (
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Recent Updates {prayer.updates.length > 2 && `(${showAllUpdates ? prayer.updates.length : 2} of ${prayer.updates.length})`}
            </h4>
            {prayer.updates.length > 2 && (
              <button
                onClick={() => setShowAllUpdates(!showAllUpdates)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
              >
                {showAllUpdates ? 'Show less' : 'Show all'}
                <ChevronDown size={14} className={`transform transition-transform ${showAllUpdates ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
          <div className="space-y-3">
            {/* Show first 2 updates (newest) by default, or all if showAllUpdates is true */}
            {(showAllUpdates ? prayer.updates : prayer.updates.slice(0, 2)).map((update) => (
              <div key={update.id} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <div className="relative mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {update.is_anonymous ? 'Anonymous' : update.author}
                    </span>
                    {(isAdmin || shouldShowActionButton(deletionsAllowed, prayer.email)) && (
                      <button
                        onClick={async () => {
                          if (isAdmin) {
                            if (confirm('Are you sure you want to delete this update? This action cannot be undone.')) {
                              try {
                                await onDeleteUpdate(update.id);
                                // show a toast confirmation
                                showToast('Update deleted', 'success');
                              } catch (err) {
                                console.error('Failed to delete update:', err);
                                showToast('Failed to delete update', 'error');
                              }
                            }
                          } else {
                            // Toggle the form - close if already open, open if closed
                            if (showUpdateDeleteRequest === update.id) {
                              setShowUpdateDeleteRequest(null);
                            } else {
                              openForm(() => setShowUpdateDeleteRequest(update.id));
                            }
                          }
                        }}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 ml-2"
                        title={isAdmin ? 'Delete update' : 'Request update deletion'}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <span className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">{formatDate(update.created_at)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{update.content}</p>
                
                {/* Inline Update Deletion Request Form */}
                {showUpdateDeleteRequest === update.id && !isAdmin && (
                  <form onSubmit={handleUpdateDeletionRequest} className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">Request Update Deletion</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="First name"
                          value={updateDeleteRequesterFirstName}
                          onChange={(e) => setUpdateDeleteRequesterFirstName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Last name"
                          value={updateDeleteRequesterLastName}
                          onChange={(e) => setUpdateDeleteRequesterLastName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                          required
                        />
                      </div>
                      <input
                        type="email"
                        placeholder="Your email"
                        value={updateDeleteRequesterEmail}
                        onChange={(e) => setUpdateDeleteRequesterEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                      <textarea
                        placeholder="Reason for update deletion request..."
                        value={updateDeleteReason}
                        onChange={(e) => setUpdateDeleteReason(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-red-300 dark:border-red-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 h-20"
                        required
                      />
                      {updateDeleteError && (
                        <div className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded">
                          {updateDeleteError}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button 
                          type="submit" 
                          disabled={isSubmittingUpdateDelete} 
                          className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                          {isSubmittingUpdateDelete ? 'Submitting...' : 'Submit Request'}
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setShowUpdateDeleteRequest(null)} 
                          className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Verification Dialog */}
      {verificationState.isOpen && verificationState.codeId && verificationState.expiresAt && (
        <VerificationDialog
          isOpen={verificationState.isOpen}
          codeId={verificationState.codeId}
          expiresAt={verificationState.expiresAt}
          email={verificationState.email}
          onVerified={handleVerified}
          onClose={handleVerificationCancel}
          onResend={handleResendCode}
        />
      )}
    </div>
  );
});