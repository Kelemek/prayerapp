import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, MessageSquare, CheckCircle, XCircle, Clock, AlertTriangle, ArrowLeft, Trash2, RefreshCw, Settings, User, Calendar, TrendingUp, Eye, Mail, Heart, UserCheck } from 'lucide-react';
import { PendingPrayerCard } from './PendingPrayerCard';
import { PendingUpdateCard } from './PendingUpdateCard';
import { PendingDeletionCard } from './PendingDeletionCard';
import { PendingUpdateDeletionCard } from './PendingUpdateDeletionCard';
import { PendingPreferenceChangeCard } from './PendingPreferenceChangeCard';
import { EmailSettings } from './EmailSettings';
import { EmailSubscribers } from './EmailSubscribers';
import { AppBranding } from './AppBranding';
import { PrayerSearch } from './PrayerSearch';
import BackupStatus from './BackupStatus';
import { PromptManager } from './PromptManager'; // Prayer prompts management
import { PrayerTypesManager } from './PrayerTypesManager';
import { AdminUserManagement } from './AdminUserManagement';
import { useAdminData, type PendingPreferenceChange } from '../hooks/useAdminData';
import { useAdminAuth } from '../hooks/useAdminAuthHook';
import { seedDummyPrayers, cleanupDummyPrayers } from '../lib/devSeed';
import { supabase } from '../lib/supabase';
import { sendApprovedPreferenceChangeNotification, sendDeniedPreferenceChangeNotification } from '../lib/emailNotifications';

type AdminTab = 'prayers' | 'updates' | 'deletions' | 'preferences' | 'settings';
type SettingsTab = 'analytics' | 'email' | 'users' | 'content' | 'tools';

interface AdminPortalProps {
  allowUserDeletions?: boolean;
  allowUserUpdates?: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ 
  allowUserDeletions = true,
  allowUserUpdates = true 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('prayers');
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('analytics');
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Redirect to valid tab if current tab is disabled
  useEffect(() => {
    if (activeTab === 'updates' && !allowUserUpdates) {
      setActiveTab('prayers');
    }
    if (activeTab === 'deletions' && !allowUserDeletions) {
      setActiveTab('prayers');
    }
  }, [activeTab, allowUserUpdates, allowUserDeletions]);
  
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
    deniedDeletionRequests,
    deniedUpdateDeletionRequests,
    deniedPreferenceChanges,

    loading,
    error,
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
    editPrayer,
    refresh
  } = useAdminData();

  // Dev seed loading states
  const [seedLoading, setSeedLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  // Analytics stats
  const [stats, setStats] = useState({
    totalPageViews: 0,
    todayPageViews: 0,
    weekPageViews: 0,
    monthPageViews: 0,
    totalPrayers: 0,
    totalSubscribers: 0,
    loading: true
  });

  // Pending preference changes (local state only for pending, denied comes from useAdminData)
  const [pendingPreferenceChanges, setPendingPreferenceChanges] = useState<PendingPreferenceChange[]>([]);
  const [loadingPreferenceChanges, setLoadingPreferenceChanges] = useState(true);

  // Calculate total denied count (all 5 types)
  const deniedCount = (deniedPrayers?.length || 0) + 
                      (deniedUpdates?.length || 0) + 
                      (deniedDeletionRequests?.length || 0) + 
                      (deniedUpdateDeletionRequests?.length || 0) + 
                      (deniedPreferenceChanges?.length || 0);

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

        // Total prayers
        const { count: prayers } = await supabase
          .from('prayers')
          .select('*', { count: 'exact', head: true });

        // Total email subscribers
        const { count: subscribers } = await supabase
          .from('email_subscribers')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalPageViews: total || 0,
          todayPageViews: today || 0,
          weekPageViews: week || 0,
          monthPageViews: month || 0,
          totalPrayers: prayers || 0,
          totalSubscribers: subscribers || 0,
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

  // Auto-switch to next tab with pending items when current tab becomes empty
  useEffect(() => {
    // Only auto-switch for approval tabs (not settings, approved, or denied)
    const approvalTabs: AdminTab[] = ['prayers', 'updates', 'deletions', 'preferences'];
    
    if (!approvalTabs.includes(activeTab)) return;

    // Check if current tab is empty
    let isCurrentTabEmpty = false;
    
    switch (activeTab) {
      case 'prayers':
        isCurrentTabEmpty = pendingPrayers.length === 0;
        break;
      case 'updates':
        isCurrentTabEmpty = pendingUpdates.length === 0;
        break;
      case 'deletions':
        isCurrentTabEmpty = pendingDeletionRequests.length === 0 && pendingUpdateDeletionRequests.length === 0;
        break;
      case 'preferences':
        isCurrentTabEmpty = pendingPreferenceChanges.length === 0;
        break;
    }

    // If current tab is empty, find next tab with pending items
    if (isCurrentTabEmpty && !loading && !loadingPreferenceChanges) {
      const tabsWithCounts = [
        { tab: 'prayers' as AdminTab, count: pendingPrayers.length },
        { tab: 'updates' as AdminTab, count: pendingUpdates.length },
        { tab: 'deletions' as AdminTab, count: pendingDeletionRequests.length + pendingUpdateDeletionRequests.length },
        { tab: 'preferences' as AdminTab, count: pendingPreferenceChanges.length }
      ];

      // Find the first tab with pending items
      const nextTab = tabsWithCounts.find(t => t.count > 0);
      
      if (nextTab) {
        setActiveTab(nextTab.tab);
      }
    }
  }, [
    activeTab,
    pendingPrayers.length,
    pendingUpdates.length,
    pendingDeletionRequests.length,
    pendingUpdateDeletionRequests.length,
    pendingPreferenceChanges.length,
    loading,
    loadingPreferenceChanges
  ]);

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
      
      // Denied preferences will automatically refresh via useAdminData hook
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
      } else if (pendingPreferenceChanges.length > 0) {
        setActiveTab('preferences');
      }
      // Mark that we've auto-selected once so we don't override user's tab after refreshes
      initialAutoSelectRef.current = true;
    }
    // Intentionally only run once when loading becomes false the first time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Set timeout for loading to prevent infinite spinner
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 15000); // 15 seconds timeout
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  const handleRefresh = () => {
    setLoadingTimeout(false); // Reset timeout when user clicks retry
    refresh();
  };

  if (loading && !loadingTimeout) {
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading admin portal...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  if (loading && loadingTimeout) {
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-amber-600 dark:text-amber-400 mb-4">
            <Clock size={48} className="mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Loading is taking longer than expected</p>
            <p className="text-sm">This might be due to a slow connection or server issue.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={16} />
              Retry
            </button>
            <button
              onClick={() => window.location.hash = ''}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Main
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <AlertTriangle size={48} className="mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">Failed to Load Admin Portal</p>
            <p className="text-sm">{error}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <button
              onClick={() => window.location.hash = ''}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Main
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      {/* Header */}
      <header className="w-full bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto w-full px-4 py-6">
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
      <main className="w-full max-w-6xl mx-auto px-4 py-6">
        {/* Stats Grid - Clickable Filter Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-8">
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
          
          {allowUserUpdates && (
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
          )}

          {allowUserDeletions && (
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
          )}
          
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
            onClick={() => setActiveTab('settings')}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              activeTab === 'settings' ? 'ring-2 ring-gray-500 border-gray-500' : 'hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <Settings className="text-gray-600 dark:text-gray-400" size={20} />
              <div className="text-center">
                <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                  Settings
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Config</div>
              </div>
            </div>
          </button>
        </div>

        {/* Alerts - Only show on pending tabs */}
        {(activeTab === 'prayers' || activeTab === 'updates' || activeTab === 'deletions' || activeTab === 'preferences') && 
         (pendingPrayers.length > 0 || pendingUpdates.length > 0 || pendingDeletionRequests.length > 0 || pendingUpdateDeletionRequests.length > 0 || pendingPreferenceChanges.length > 0) && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={20} />
              <p className="text-yellow-800 dark:text-yellow-200">
                You have {pendingPrayers.length + pendingUpdates.length + pendingDeletionRequests.length + pendingUpdateDeletionRequests.length + pendingPreferenceChanges.length} items pending approval.
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

        {activeTab === 'updates' && allowUserUpdates && (
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

        {activeTab === 'deletions' && allowUserDeletions && (
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
                      <PendingUpdateDeletionCard
                        key={request.id}
                        deletionRequest={request}
                        onApprove={(id: string) => approveUpdateDeletionRequest(id)}
                        onDeny={(id: string, reason: string) => denyUpdateDeletionRequest(id, reason)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
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

        {/* Removed approved tab - now handled by PrayerSearch audit feature */}
        {false && (
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
                                {prayer.approved_at && (
                                  <p className="text-green-600 dark:text-green-400 font-medium mt-1">
                                    Approved: {new Date(prayer.approved_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
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
                                {update.approved_at && (
                                  <p className="text-green-600 dark:text-green-400 font-medium mt-1">
                                    Approved: {new Date(update.approved_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
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

        {/* Removed denied tab - now handled by PrayerSearch audit feature */}
        {false && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Denied Items ({deniedCount})
            </h2>
            
            {deniedCount === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <XCircle className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No denied items yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Denied prayers, updates, deletions, and preference changes will appear here.
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

                {/* Denied Deletion Requests */}
                {deniedDeletionRequests && deniedDeletionRequests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                      Denied Deletion Requests ({deniedDeletionRequests.length})
                    </h3>
                    <div className="space-y-4">
                      {deniedDeletionRequests.map((req) => (
                        <div key={req.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <Trash2 size={14} />
                                <span>Deletion request for: {req.prayer_title}</span>
                              </div>
                              {req.reason && (
                                <p className="text-gray-700 dark:text-gray-300 mb-2">
                                  Requested reason: {req.reason}
                                </p>
                              )}
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

                {/* Denied Update Deletion Requests */}
                {deniedUpdateDeletionRequests && deniedUpdateDeletionRequests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                      Denied Update Deletion Requests ({deniedUpdateDeletionRequests.length})
                    </h3>
                    <div className="space-y-4">
                      {deniedUpdateDeletionRequests.map((req) => (
                        <div key={req.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <Trash2 size={14} />
                                <span>Update deletion request for: {req.prayer_updates?.prayers?.title || 'Unknown Prayer'}</span>
                              </div>
                              {req.prayer_updates && (
                                <p className="text-gray-700 dark:text-gray-300 mb-2">
                                  Update content: {req.prayer_updates.content}
                                </p>
                              )}
                              {req.reason && (
                                <p className="text-gray-700 dark:text-gray-300 mb-2">
                                  Requested reason: {req.reason}
                                </p>
                              )}
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

                {/* Denied Preference Changes */}
                {deniedPreferenceChanges && deniedPreferenceChanges.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                      Denied Preference Changes ({deniedPreferenceChanges.length})
                    </h3>
                    <div className="space-y-4">
                      {deniedPreferenceChanges.map((change) => (
                        <div key={change.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <User size={14} />
                                <span>{change.name}</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 mb-2">
                                Email: {change.email}
                              </p>
                              <p className="text-gray-700 dark:text-gray-300 mb-2">
                                Requested preference: {change.receive_new_prayer_notifications ? 'Opt-in to notifications' : 'Opt-out of notifications'}
                              </p>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {change.denial_reason && (
                                  <p className="text-red-600 dark:text-red-400 mt-2">Denial reason: {change.denial_reason}</p>
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
            
            {/* Settings Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveSettingsTab('analytics')}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                  activeSettingsTab === 'analytics'
                    ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} />
                  Analytics
                </div>
              </button>
              <button
                onClick={() => setActiveSettingsTab('content')}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                  activeSettingsTab === 'content'
                    ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} />
                  Content
                </div>
              </button>
              <button
                onClick={() => setActiveSettingsTab('email')}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                  activeSettingsTab === 'email'
                    ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Mail size={18} />
                  Email
                </div>
              </button>
              <button
                onClick={() => setActiveSettingsTab('users')}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                  activeSettingsTab === 'users'
                    ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users size={18} />
                  Users
                </div>
              </button>
              <button
                onClick={() => setActiveSettingsTab('tools')}
                className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                  activeSettingsTab === 'tools'
                    ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw size={18} />
                  Tools
                </div>
              </button>
            </div>

            {/* Analytics Tab */}
            {activeSettingsTab === 'analytics' && (
              <div className="space-y-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

                      <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 border border-rose-200 dark:border-rose-700">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="text-rose-600 dark:text-rose-400" size={20} />
                          <div className="text-sm font-medium text-rose-900 dark:text-rose-100">Total Prayers</div>
                        </div>
                        <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">
                          {stats.totalPrayers.toLocaleString()}
                        </div>
                        <div className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1">in database</div>
                      </div>

                      <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
                        <div className="flex items-center gap-2 mb-2">
                          <UserCheck className="text-cyan-600 dark:text-cyan-400" size={20} />
                          <div className="text-sm font-medium text-cyan-900 dark:text-cyan-100">Subscribers</div>
                        </div>
                        <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                          {stats.totalSubscribers.toLocaleString()}
                        </div>
                        <div className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">email subscribers</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Tab */}
            {activeSettingsTab === 'content' && (
              <div className="space-y-6">
                <AppBranding />
                <PromptManager onSuccess={() => {
                  // Success message is shown within the component
                }} />
                <PrayerTypesManager onSuccess={() => {
                  // Success message is shown within the component
                }} />
              </div>
            )}

            {/* Email Tab */}
            {activeSettingsTab === 'email' && (
              <div className="space-y-6">
                <EmailSubscribers />
                <EmailSettings />
              </div>
            )}

            {/* Users Tab */}
            {activeSettingsTab === 'users' && (
              <div className="space-y-6">
                <AdminUserManagement />
              </div>
            )}

            {/* Tools Tab */}
            {activeSettingsTab === 'tools' && (
              <div className="space-y-6">
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
                        } catch (err: unknown) {
                          console.error('Seed error:', err);
                          const errorMessage = err && typeof err === 'object' && 'message' in err 
                            ? String(err.message)
                            : String(err);
                          alert(`Error seeding data: ${errorMessage}`);
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
                        } catch (err: unknown) {
                          console.error('Cleanup error:', err);
                          const errorMessage = err && typeof err === 'object' && 'message' in err 
                            ? String(err.message)
                            : String(err);
                          alert(`Error cleaning up data: ${errorMessage}`);
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

                <BackupStatus />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};