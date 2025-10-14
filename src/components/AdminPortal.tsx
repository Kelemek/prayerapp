import React, { useState } from 'react';
import { Shield, Users, MessageSquare, CheckCircle, XCircle, Clock, AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import { PendingPrayerCard } from './PendingPrayerCard';
import { PendingUpdateCard } from './PendingUpdateCard';
import { PendingDeletionCard } from './PendingDeletionCard';
import { useAdminData } from '../hooks/useAdminData';

type AdminTab = 'prayers' | 'updates' | 'deletions' | 'overview';

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const {
    pendingPrayers,
    pendingUpdates,
    pendingDeletionRequests,
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
    editPrayer
  } = useAdminData();

  const tabs = [
    { id: 'overview' as AdminTab, label: 'Overview', icon: Shield },
    { id: 'prayers' as AdminTab, label: `Pending Prayers (${pendingPrayers.length})`, icon: Users },
    { id: 'updates' as AdminTab, label: `Pending Updates (${pendingUpdates.length})`, icon: MessageSquare },
    { id: 'deletions' as AdminTab, label: `Deletion Requests (${pendingDeletionRequests.length})`, icon: Trash2 }
  ];

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

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Admin Overview</h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Clock className="text-orange-500" size={24} />
                  <div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {pendingPrayers.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Pending Prayers</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <MessageSquare className="text-blue-500" size={24} />
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {pendingUpdates.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Pending Updates</div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Trash2 className="text-red-500" size={24} />
                  <div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {pendingDeletionRequests.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Deletion Requests</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={24} />
                  <div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {approvedPrayersCount + approvedUpdatesCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total Approved</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <XCircle className="text-red-500" size={24} />
                  <div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {deniedPrayersCount + deniedUpdatesCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Total Denied</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {(pendingPrayers.length > 0 || pendingUpdates.length > 0 || pendingDeletionRequests.length > 0) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
                  <p className="text-yellow-800 dark:text-yellow-200">
                    You have {pendingPrayers.length + pendingUpdates.length + pendingDeletionRequests.length} items pending approval.
                  </p>
                </div>
              </div>
            )}
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
              Pending Deletion Requests ({pendingDeletionRequests.length})
            </h2>
            
            {pendingDeletionRequests.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <CheckCircle className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No pending deletion requests
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All deletion requests have been reviewed.
                </p>
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
        )}
      </main>
    </div>
  );
};