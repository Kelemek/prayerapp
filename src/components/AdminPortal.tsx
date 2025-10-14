import React, { useState, useEffect } from 'react';
import { Shield, Users, MessageSquare, CheckCircle, XCircle, Clock, AlertTriangle, ArrowLeft, Trash2, RefreshCw, Settings } from 'lucide-react';
import { PendingPrayerCard } from './PendingPrayerCard';
import { PendingUpdateCard } from './PendingUpdateCard';
import { PendingDeletionCard } from './PendingDeletionCard';
import { PendingStatusChangeCard } from './PendingStatusChangeCard';
import { PasswordChange } from './PasswordChange';
import { EmailSettings } from './EmailSettings';
import { useAdminData } from '../hooks/useAdminData';
import { useAdminAuth } from '../hooks/useAdminAuth';

type AdminTab = 'prayers' | 'updates' | 'deletions' | 'status-changes' | 'approved' | 'denied' | 'settings';

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('prayers');
  const {
    pendingPrayers,
    pendingUpdates,
    pendingDeletionRequests,
    pendingStatusChangeRequests,
    pendingUpdateDeletionRequests,
    approvedPrayers,
    approvedUpdates,
    deniedPrayers,
    deniedUpdates,
  deniedStatusChangeRequests,
    approvedPrayersCount,
    approvedUpdatesCount,
    deniedPrayersCount,
    deniedUpdatesCount,
    loading,
    approvePrayer,
    denyPrayer,
    approveUpdate,
    denyUpdate,
    approveDeletionRequest,
    denyDeletionRequest,
    approveStatusChangeRequest,
    denyStatusChangeRequest,
    approveUpdateDeletionRequest,
    denyUpdateDeletionRequest,
    editPrayer
  } = useAdminData();

  const { changePassword } = useAdminAuth();

  // Automatically select the first tab with pending items
  useEffect(() => {
    if (!loading) {
      if (pendingPrayers.length > 0) {
        setActiveTab('prayers');
      } else if (pendingUpdates.length > 0) {
        setActiveTab('updates');
      } else if (pendingDeletionRequests.length > 0 || pendingUpdateDeletionRequests.length > 0) {
        setActiveTab('deletions');
      } else if (pendingStatusChangeRequests.length > 0) {
        setActiveTab('status-changes');
      }
      // If no pending items, keep default 'prayers' tab
    }
  }, [loading, pendingPrayers.length, pendingUpdates.length, pendingDeletionRequests.length, pendingUpdateDeletionRequests.length, pendingStatusChangeRequests.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading admin portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="text-red-600 dark:text-red-400" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Admin Portal</h1>
                <p className="text-gray-600 dark:text-gray-300">Manage prayer requests and updates</p>
              </div>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  window.location.hash = '';
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Main Page
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Grid - Clickable Filter Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
          <button
            onClick={() => setActiveTab('prayers')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'prayers' ? 'ring-2 ring-orange-500 border-orange-500' : 'hover:border-orange-300 dark:hover:border-orange-600'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Clock className="text-orange-500" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {pendingPrayers.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Prayers</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('updates')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'updates' ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <MessageSquare className="text-blue-500" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {pendingUpdates.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Updates</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('deletions')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'deletions' ? 'ring-2 ring-red-500 border-red-500' : 'hover:border-red-300 dark:hover:border-red-600'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Trash2 className="text-red-500" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {pendingDeletionRequests.length + pendingUpdateDeletionRequests.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Deletions</div>
              </div>
            </div>
          </button>
          
          
          <button
            onClick={() => setActiveTab('status-changes')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'status-changes' ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <RefreshCw className="text-blue-500" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {pendingStatusChangeRequests.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Status</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('approved')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'approved' ? 'ring-2 ring-green-500 border-green-500' : 'hover:border-green-300 dark:hover:border-green-600'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <CheckCircle className="text-green-500" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {approvedPrayersCount + approvedUpdatesCount}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Approved</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('denied')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'denied' ? 'ring-2 ring-red-500 border-red-500' : 'hover:border-red-300 dark:hover:border-red-600'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <XCircle className="text-red-500" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {deniedPrayersCount + deniedUpdatesCount + (deniedStatusChangeRequests?.length || 0)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Denied</div>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'settings' ? 'ring-2 ring-purple-500 border-purple-500' : 'hover:border-purple-300 dark:hover:border-purple-600'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Settings className="text-purple-500" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  Settings
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Config</div>
              </div>
            </div>
          </button>
        </div>

        {/* Alerts */}
        {(pendingPrayers.length > 0 || pendingUpdates.length > 0 || pendingDeletionRequests.length > 0 || pendingUpdateDeletionRequests.length > 0 || pendingStatusChangeRequests.length > 0) && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
              <p className="text-yellow-800 dark:text-yellow-200">
                You have {pendingPrayers.length + pendingUpdates.length + pendingDeletionRequests.length + pendingUpdateDeletionRequests.length + pendingStatusChangeRequests.length} items pending approval.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'prayers' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Prayer Requests ({pendingPrayers.length})
            </h2>
            
            {pendingPrayers.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <CheckCircle className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No pending prayer requests
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All prayer requests have been reviewed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPrayers.map((prayer) => (
                  <PendingPrayerCard
                    key={prayer.id}
                    prayer={prayer}
                    onApprove={(id) => approvePrayer(id)}
                    onDeny={(id, reason) => denyPrayer(id, reason)}
                    onEdit={(id, updates) => editPrayer(id, updates)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'updates' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Prayer Updates ({pendingUpdates.length})
            </h2>
            
            {pendingUpdates.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <CheckCircle className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No pending prayer updates
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All prayer updates have been reviewed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUpdates.map((update) => (
                  <PendingUpdateCard
                    key={update.id}
                    update={update}
                    onApprove={(id) => approveUpdate(id)}
                    onDeny={(id, reason) => denyUpdate(id, reason)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'deletions' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Deletion Requests ({pendingDeletionRequests.length + pendingUpdateDeletionRequests.length})
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Prayer Deletions ({pendingDeletionRequests.length})</h3>
                {pendingDeletionRequests.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No pending prayer deletions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingDeletionRequests.map((request) => (
                      <PendingDeletionCard
                        key={request.id}
                        deletionRequest={request}
                        onApprove={(id: string) => approveDeletionRequest(id)}
                        onDeny={(id: string, reason: string) => denyDeletionRequest(id, reason)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">Update Deletions ({pendingUpdateDeletionRequests.length})</h3>
                {pendingUpdateDeletionRequests.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center border border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">No pending update deletions</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingUpdateDeletionRequests.map((request) => (
                      <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <MessageSquare size={14} />
                              <span>Update for: {request.prayer_updates?.prayers?.title ?? 'Unknown Prayer'}</span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 mb-2">
                              {request.prayer_updates?.content}
                            </p>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <p>By: {request.prayer_updates?.author}</p>
                              <p>Requested by: {request.requested_by}</p>
                              <p>Reason: {request.reason}</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                            Pending
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => approveUpdateDeletionRequest(request.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for denial (required):');
                              if (reason && reason.trim()) denyUpdateDeletionRequest(request.id, reason);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'status-changes' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Status Change Requests ({pendingStatusChangeRequests.length})
            </h2>
            
            {pendingStatusChangeRequests.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <CheckCircle className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No pending status change requests
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All status change requests have been reviewed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingStatusChangeRequests.map((request) => (
                  <PendingStatusChangeCard
                    key={request.id}
                    statusChangeRequest={request}
                    onApprove={(id: string) => approveStatusChangeRequest(id)}
                    onDeny={(id: string, reason: string) => denyStatusChangeRequest(id, reason)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approved' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Approved Items ({approvedPrayers.length + approvedUpdates.length})
            </h2>
            
            {approvedPrayers.length === 0 && approvedUpdates.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <CheckCircle className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No approved items yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Approved prayers and updates will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Approved Prayers */}
                {approvedPrayers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                      Approved Prayers ({approvedPrayers.length})
                    </h3>
                    <div className="space-y-4">
                      {approvedPrayers.map((prayer) => (
                        <div key={prayer.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                Prayer for {prayer.prayer_for}
                              </h4>
                              <p className="text-gray-600 dark:text-gray-300 mb-2">
                                {prayer.description}
                              </p>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                <p>Requested by: {prayer.requester}</p>
                                <p>Status: {prayer.status}</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Approved
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Approved Updates */}
                {approvedUpdates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                      Approved Updates ({approvedUpdates.length})
                    </h3>
                    <div className="space-y-4">
                      {approvedUpdates.map((update) => (
                        <div key={update.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <MessageSquare size={14} />
                                <span>Update for: {update.prayer_title}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 mb-2">
                                {update.content}
                              </p>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                <p>By: {update.author}</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Approved
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'denied' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Denied Items ({deniedPrayers.length + deniedUpdates.length + (deniedStatusChangeRequests?.length || 0)})
            </h2>
            
            {deniedPrayers.length === 0 && deniedUpdates.length === 0 && (!deniedStatusChangeRequests || deniedStatusChangeRequests.length === 0) ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <XCircle className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No denied items yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Denied prayers and updates will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Denied Prayers */}
                {deniedPrayers.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                      Denied Prayers ({deniedPrayers.length})
                    </h3>
                    <div className="space-y-4">
                      {deniedPrayers.map((prayer) => (
                        <div key={prayer.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                                Prayer for {prayer.prayer_for}
                              </h4>
                              <p className="text-gray-600 dark:text-gray-300 mb-2">
                                {prayer.description}
                              </p>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                <p>Requested by: {prayer.requester}</p>
                                {prayer.denial_reason && (
                                  <p className="text-red-600 dark:text-red-400 mt-2">
                                    Denial reason: {prayer.denial_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              Denied
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Denied Updates */}
                {deniedUpdates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                      Denied Updates ({deniedUpdates.length})
                    </h3>
                    <div className="space-y-4">
                      {deniedUpdates.map((update) => (
                        <div key={update.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <MessageSquare size={14} />
                                <span>Update for: {update.prayer_title}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 mb-2">
                                {update.content}
                              </p>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                <p>By: {update.author}</p>
                                {update.denial_reason && (
                                  <p className="text-red-600 dark:text-red-400 mt-2">
                                    Denial reason: {update.denial_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              Denied
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Denied Status Change Requests */}
                {deniedStatusChangeRequests && deniedStatusChangeRequests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                      Denied Status Change Requests ({deniedStatusChangeRequests.length})
                    </h3>
                    <div className="space-y-4">
                      {deniedStatusChangeRequests.map((req) => (
                        <div key={req.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <RefreshCw size={14} />
                                <span>Status change for: {req.prayer_title}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 mb-2">
                                Requested status: {req.requested_status}
                              </p>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                <p>Requested by: {req.requested_by}</p>
                                {req.denial_reason && (
                                  <p className="text-red-600 dark:text-red-400 mt-2">Denial reason: {req.denial_reason}</p>
                                )}
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              Denied
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Admin Settings
            </h2>
            
            <div className="max-w-2xl space-y-6">
              <EmailSettings />
              <PasswordChange onPasswordChange={changePassword} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};