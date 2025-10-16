import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, MessageSquare, CheckCircle, XCircle, Clock, AlertTriangle, ArrowLeft, Trash2, RefreshCw, Settings, User, Calendar, X, TrendingUp, Eye, Mail } from 'lucide-react';
import { DeletionStyleCard } from './DeletionStyleCard';
import { PendingPrayerCard } from './PendingPrayerCard';
import { PendingUpdateCard } from './PendingUpdateCard';
import { PendingDeletionCard } from './PendingDeletionCard';
import { PendingStatusChangeCard } from './PendingStatusChangeCard';
import { PendingPreferenceChangeCard } from './PendingPreferenceChangeCard';
import { PasswordChange } from './PasswordChange';
import { EmailSettings } from './EmailSettings';
import { EmailSubscribers } from './EmailSubscribers';
import { PrayerSearch } from './PrayerSearch';
import { BackupRestore } from './BackupRestore';
import { useAdminData } from '../hooks/useAdminData';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { seedDummyPrayers, cleanupDummyPrayers } from '../lib/devSeed';
import { supabase } from '../lib/supabase';
import { sendApprovedPreferenceChangeNotification, sendDeniedPreferenceChangeNotification } from '../lib/emailNotifications';

type AdminTab = 'prayers' | 'updates' | 'deletions' | 'status-changes' | 'preferences' | 'approved' | 'denied' | 'settings';

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
  editUpdate,
    approveDeletionRequest,
    denyDeletionRequest,
    approveStatusChangeRequest,
    denyStatusChangeRequest,
    approveUpdateDeletionRequest,
    denyUpdateDeletionRequest,
    editPrayer
  } = useAdminData();

  const { changePassword } = useAdminAuth();

  // Dev seed loading states
  const [seedLoading, setSeedLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Analytics stats
  const [stats, setStats] = useState({
    totalPageViews: 0,
    todayPageViews: 0,
    weekPageViews: 0,
    monthPageViews: 0,
    loading: true
  });

  // Pending preference changes
  const [pendingPreferenceChanges, setPendingPreferenceChanges] = useState<any[]>([]);
  const [loadingPreferenceChanges, setLoadingPreferenceChanges] = useState(true);

  // Fetch analytics stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Total page views
        const { count: total } = await supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view');

        // Today's page views
        const { count: today } = await supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', todayStart.toISOString());

        // This week's page views
        const { count: week } = await supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', weekStart.toISOString());

        // This month's page views
        const { count: month } = await supabase
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', monthStart.toISOString());

        setStats({
          totalPageViews: total || 0,
          todayPageViews: today || 0,
          weekPageViews: week || 0,
          monthPageViews: month || 0,
          loading: false
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();
  }, []);

  // Fetch pending preference changes
  useEffect(() => {
    const fetchPendingPreferenceChanges = async () => {
      try {
        setLoadingPreferenceChanges(true);
        const { data, error } = await supabase
          .from('pending_preference_changes')
          .select('*')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPendingPreferenceChanges(data || []);
      } catch (error) {
        console.error('Error fetching pending preference changes:', error);
      } finally {
        setLoadingPreferenceChanges(false);
      }
    };

    fetchPendingPreferenceChanges();
  }, []);

  const approvePreferenceChange = async (id: string) => {
    try {
      // Get the preference change
      const { data: change, error: fetchError } = await supabase
        .from('pending_preference_changes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching preference change:', fetchError);
        throw fetchError;
      }

      // Check if email_subscribers record already exists
      const { data: existing, error: existingError } = await supabase
        .from('email_subscribers')
        .select('*')
        .eq('email', change.email)
        .maybeSingle();

      if (existingError) {
        console.error('❌ Error checking existing subscriber:', existingError);
        throw existingError;
      }

      if (existing) {
        // Update existing subscriber
        const { error: updateError } = await supabase
          .from('email_subscribers')
          .update({
            name: change.name,
            is_active: change.receive_new_prayer_notifications,
            is_admin: false // Ensure marked as regular user, not admin
          })
          .eq('email', change.email);

        if (updateError) {
          console.error('❌ Error updating subscriber:', updateError);
          throw updateError;
        }
      } else {
        // Insert new subscriber
        const { error: insertError } = await supabase
          .from('email_subscribers')
          .insert({
            email: change.email,
            name: change.name,
            is_active: change.receive_new_prayer_notifications,
            is_admin: false // Regular user, not admin
          });

        if (insertError) {
          console.error('❌ Error inserting subscriber:', insertError);
          throw insertError;
        }
      }

      // Mark as approved
      const { error: approveError } = await supabase
        .from('pending_preference_changes')
        .update({
          approval_status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (approveError) throw approveError;

      // Send approval email to user
      await sendApprovedPreferenceChangeNotification({
        name: change.name,
        email: change.email,
        receiveNotifications: change.receive_new_prayer_notifications
      });
      
      // Remove from pending list
      setPendingPreferenceChanges(prev => prev.filter(p => p.id !== id));
      
      alert(`✅ Preference approved for ${change.email}. Check the Email Settings tab to see the subscriber.`);
    } catch (error) {
      console.error('❌ Error approving preference change:', error);
      alert('Failed to approve preference change: ' + (error as Error).message);
    }
  };

  const denyPreferenceChange = async (id: string, reason: string) => {
    try {
      // Get the preference change details
      const { data: change, error: fetchError } = await supabase
        .from('pending_preference_changes')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('pending_preference_changes')
        .update({
          approval_status: 'denied',
          denial_reason: reason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Send denial email to user
      await sendDeniedPreferenceChangeNotification({
        name: change.name,
        email: change.email,
        receiveNotifications: change.receive_new_prayer_notifications,
        denialReason: reason
      });

      // Remove from pending list
      setPendingPreferenceChanges(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error denying preference change:', error);
      alert('Failed to deny preference change');
    }
  };

  // Automatically select the first tab with pending items on initial load only
  const initialAutoSelectRef = useRef(false);
  useEffect(() => {
    if (!loading && !initialAutoSelectRef.current) {
      if (pendingPrayers.length > 0) {
        setActiveTab('prayers');
      } else if (pendingUpdates.length > 0) {
        setActiveTab('updates');
      } else if (pendingDeletionRequests.length > 0 || pendingUpdateDeletionRequests.length > 0) {
        setActiveTab('deletions');
      } else if (pendingStatusChangeRequests.length > 0) {
        setActiveTab('status-changes');
      } else if (pendingPreferenceChanges.length > 0) {
        setActiveTab('preferences');
      }
      // Mark that we've auto-selected once so we don't override user's tab after refreshes
      initialAutoSelectRef.current = true;
    }
    // Intentionally only run once when loading becomes false the first time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-8">
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
            onClick={() => setActiveTab('preferences')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'preferences' ? 'ring-2 ring-purple-500 border-purple-500' : 'hover:border-purple-300 dark:hover:border-purple-600'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Mail className="text-purple-500" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {pendingPreferenceChanges.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Preferences</div>
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
                    onEdit={(id, updates) => editUpdate(id, updates)}
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
                    {pendingUpdateDeletionRequests.map((request) => {
                      const metaLeft = (
                        <div>
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            <span>Requested by: {request.requested_by}</span>
                          </div>
                          {request.requested_email && (
                            <div className="flex items-center gap-1 mt-2">
                              <MessageSquare size={14} />
                              <span className="break-words">Email: {request.requested_email}</span>
                            </div>
                          )}
                        </div>
                      );

                      const metaRight = (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>{new Date(request.created_at).toLocaleString()}</span>
                        </div>
                      );

                      const contentNode = (
                        <>
                          <p className="font-medium">{request.prayer_updates?.prayers?.title ?? 'Unknown Prayer'}</p>
                          <p className="mt-3">{request.prayer_updates?.content}</p>
                          {request.prayer_updates?.author && (
                            <p className="text-sm mt-2">By: {request.prayer_updates?.author}{request.prayer_updates?.author_email ? ` — ${request.prayer_updates?.author_email}` : ''}</p>
                          )}
                        </>
                      );

                      const actions = (
                        <div className="flex flex-col items-end">
                          <div className="flex gap-2">
                            <button onClick={() => approveUpdateDeletionRequest(request.id)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"><CheckCircle size={16} />Approve & Delete</button>
                            <button onClick={() => { const reason = prompt('Reason for denial (required):'); if (reason && reason.trim()) denyUpdateDeletionRequest(request.id, reason); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"><X size={16} />Deny</button>
                          </div>
                        </div>
                      );

                      return (
                        <DeletionStyleCard
                          key={request.id}
                          title="Update Deletion Request"
                          subtitle="Update for:"
                          content={contentNode}
                          metaLeft={metaLeft}
                          metaRight={metaRight}
                          reason={request.reason}
                          actions={actions}
                        />
                      );
                    })}
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

        {activeTab === 'preferences' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Notification Preference Changes ({pendingPreferenceChanges.length})
            </h2>
            
            {loadingPreferenceChanges ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Loading preference changes...</p>
              </div>
            ) : pendingPreferenceChanges.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <Mail className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No pending preference changes
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  All notification preference requests have been reviewed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPreferenceChanges.map((change) => (
                  <PendingPreferenceChangeCard
                    key={change.id}
                    change={change}
                    onApprove={approvePreferenceChange}
                    onDeny={denyPreferenceChange}
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
                                <p>Requested by: {prayer.requester} {prayer.is_anonymous && <span className="text-orange-600 dark:text-orange-400 font-medium">(Anonymous)</span>}</p>
                                {prayer.email && !prayer.is_anonymous && (
                                  <p className="break-words">Email: {prayer.email}</p>
                                )}
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
                                <p>Requested by: {prayer.requester} {prayer.is_anonymous && <span className="text-orange-600 dark:text-orange-400 font-medium">(Anonymous)</span>}</p>
                                {prayer.email && !prayer.is_anonymous && (
                                  <p className="break-words">Email: {prayer.email}</p>
                                )}
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
            
            <div className="space-y-6">
              {/* Site Analytics Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="text-blue-600 dark:text-blue-400" size={24} />
                  <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100">
                    Site Analytics
                  </h3>
                </div>
                
                {stats.loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="text-blue-600 dark:text-blue-400" size={20} />
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Today</div>
                      </div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.todayPageViews.toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">page views</div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="text-purple-600 dark:text-purple-400" size={20} />
                        <div className="text-sm font-medium text-purple-900 dark:text-purple-100">This Week</div>
                      </div>
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {stats.weekPageViews.toLocaleString()}
                      </div>
                      <div className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">page views</div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                        <div className="text-sm font-medium text-green-900 dark:text-green-100">This Month</div>
                      </div>
                      <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {stats.monthPageViews.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">page views</div>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="text-orange-600 dark:text-orange-400" size={20} />
                        <div className="text-sm font-medium text-orange-900 dark:text-orange-100">All Time</div>
                      </div>
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {stats.totalPageViews.toLocaleString()}
                      </div>
                      <div className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">total page views</div>
                    </div>
                  </div>
                )}
              </div>

              <EmailSubscribers />
              <EmailSettings />
              <PasswordChange onPasswordChange={changePassword} />
              <PrayerSearch />

              {/* Dev seed controls */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">
                  Development Seed Data
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Insert or remove a set of 50 dummy prayers spanning 2 months for testing the printable prayer list feature. Use with caution.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={async () => {
                      if (!confirm('Insert 50 dummy prayers with dates spanning 2 months? This will add test data to your database.')) {
                        return;
                      }
                      try {
                        setSeedLoading(true);
                        const result = await seedDummyPrayers();
                        alert(`Successfully inserted:\n• Prayers: ${result.prayersCount}\n• Updates: ${result.updatesCount}`);
                        // Reload to show new data
                        window.location.reload();
                      } catch (err: any) {
                        console.error('Seed error:', err);
                        alert(`Error seeding data: ${err?.message || err}`);
                      } finally {
                        setSeedLoading(false);
                      }
                    }}
                    disabled={seedLoading || cleanupLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {seedLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {seedLoading ? 'Inserting...' : 'Add Dummy Test Data'}
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm('Delete all dummy prayers? This will remove all seeded test data.')) {
                        return;
                      }
                      try {
                        setCleanupLoading(true);
                        const result = await cleanupDummyPrayers();
                        alert(`Successfully deleted:\n• Prayers: ${result.prayersCount}\n• Updates: ${result.updatesCount}`);
                        // Reload to show changes
                        window.location.reload();
                      } catch (err: any) {
                        console.error('Cleanup error:', err);
                        alert(`Error cleaning up data: ${err?.message || err}`);
                      } finally {
                        setCleanupLoading(false);
                      }
                    }}
                    disabled={seedLoading || cleanupLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {cleanupLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    {cleanupLoading ? 'Cleaning up...' : 'Clean Up Dummy Data'}
                  </button>
                </div>
              </div>

              <BackupRestore />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};