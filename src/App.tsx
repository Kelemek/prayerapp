import { useState, useMemo, useEffect, useRef } from 'react';
import { Shield, LogOut, Settings } from 'lucide-react';
import { PrayerForm } from './components/PrayerForm';
import { PrayerCard } from './components/PrayerCard';
import { PromptCard } from './components/PromptCard';
import { PrayerFiltersComponent } from './components/PrayerFilters';
import { PrayerPresentation } from './components/PrayerPresentation';
import { MobilePresentation } from './components/MobilePresentation';
import { ToastProvider } from './components/ToastProvider';
import { AdminPortal } from './components/AdminPortal';
import { AdminLogin } from './components/AdminLogin';
import { UserSettings } from './components/UserSettings';
import { AdminAuthProvider } from './hooks/useAdminAuth';
import { useAdminAuth } from './hooks/useAdminAuthHook';
import type { PrayerStatus, PrayerPrompt } from './types/prayer';
import { usePrayerManager } from './hooks/usePrayerManager';
import { useTheme } from './hooks/useTheme';
import { supabase } from './lib/supabase';
import type { PrayerFilters } from './types/prayer';
import { sendAdminNotification } from './lib/emailNotifications';

function AppContent() {
  // Initialize theme system
  useTheme();
  
  const { isAdmin, logout } = useAdminAuth();
  
  const { 
    prayers, 
    loading, 
    error,
    addPrayer, 
    updatePrayerStatus, 
    addPrayerUpdate, 
    deletePrayer,
    getFilteredPrayers,
    refresh,
    deletePrayerUpdate,
    requestUpdateDeletion
  } = usePrayerManager();

  // App branding
  const [appTitle, setAppTitle] = useState('Church Prayer Manager');
  const [appSubtitle, setAppSubtitle] = useState('Keeping our community connected in prayer');

  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filters, setFilters] = useState<PrayerFilters>({status: 'current'});
  const [showPrompts, setShowPrompts] = useState(false);
  const [prompts, setPrompts] = useState<PrayerPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [selectedPromptTypes, setSelectedPromptTypes] = useState<string[]>([]);
  
  // Track which form is open across all cards
  const closeAllFormsCallbacks = useRef<Set<() => void>>(new Set());

  const registerCloseCallback = (callback: () => void) => {
    closeAllFormsCallbacks.current.add(callback);
    return () => {
      closeAllFormsCallbacks.current.delete(callback);
    };
  };

  const closeAllForms = () => {
    closeAllFormsCallbacks.current.forEach(callback => callback());
  };

  // Fetch app branding settings
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('app_title, app_subtitle')
          .eq('id', 1)
          .maybeSingle();
        
        if (!error && data) {
          if (data.app_title) setAppTitle(data.app_title);
          if (data.app_subtitle) setAppSubtitle(data.app_subtitle);
        }
      } catch (error) {
        console.error('Failed to fetch branding settings:', error);
      }
    };
    
    fetchBranding();
  }, []);

  // Track page view on initial load
  useEffect(() => {
    const trackPageView = async () => {
      try {
        await supabase.from('analytics').insert({
          event_type: 'page_view',
          event_data: {
            timestamp: new Date().toISOString(),
            path: window.location.pathname,
            hash: window.location.hash
          }
        });
      } catch (error) {
        // Silently fail - don't disrupt user experience if tracking fails
        console.debug('Analytics tracking failed:', error);
      }
    };
    
    trackPageView();
  }, []);

  // Fetch prayer prompts
  const fetchPrompts = async () => {
    setPromptsLoading(true);
    try {
      // Fetch prompts with prayer_types to get display_order
      const { data: promptsData, error: promptsError } = await supabase
        .from('prayer_prompts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (promptsError) throw promptsError;
      
      // Fetch prayer types for ordering
      const { data: typesData, error: typesError } = await supabase
        .from('prayer_types')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (typesError) throw typesError;
      
      // Create a map of type name to display_order
      const typeOrderMap = new Map(typesData?.map(t => [t.name, t.display_order]) || []);
      
      // Sort prompts by type's display_order
      const sortedPrompts = (promptsData || []).sort((a, b) => {
        const orderA = typeOrderMap.get(a.type) ?? 999;
        const orderB = typeOrderMap.get(b.type) ?? 999;
        return orderA - orderB;
      });
      
      setPrompts(sortedPrompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setPromptsLoading(false);
    }
  };

  // Delete prompt (admin only)
  const deletePrompt = async (id: string) => {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('prayer_prompts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh prompts list
      await fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      throw error;
    }
  };

  // Fetch prompts on initial load and when showing prompts
  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (showPrompts) {
      fetchPrompts();
    }
  }, [showPrompts]);

  const filteredPrayers = useMemo(() => {
    return getFilteredPrayers(filters.status, filters.searchTerm);
  }, [filters, getFilteredPrayers]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading prayers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <p className="text-lg font-semibold">Connection Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={refresh}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Make sure your Supabase configuration is correct in the .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6" style={{ margin: '0 auto', maxWidth: '72rem' }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">{appTitle}</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block mt-1">{appSubtitle}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {/* Mobile: all buttons in one row */}
              <div className="flex sm:hidden items-center gap-2 flex-wrap">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => {
                        if (window.location.hash === '#admin') {
                          window.location.hash = '';
                        } else {
                          window.location.hash = '#admin';
                        }
                      }}
                      className={`flex items-center gap-1 px-2 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm ${
                        window.location.hash === '#admin'
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                      }`}
                    >
                      <Shield size={16} />
                      <span>Admin</span>
                    </button>
                    <button
                      onClick={async () => {
                        await logout();
                        window.location.hash = '';
                      }}
                      className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                      title="Logout"
                    >
                      <LogOut size={14} />
                      <span className="text-sm">Logout</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
                {/* Mobile: Prayer Mode button */}
                <button
                  onClick={() => window.location.hash = '#mobile-presentation'}
                  className="flex items-center gap-1 bg-green-600 text-white px-2 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors text-sm"
                  title="Prayer Mode"
                >
                  <span>Pray</span>
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1 bg-blue-600 dark:bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                >
                  <span>Add Request</span>
                </button>
              </div>

              {/* Tablet/Desktop: two rows */}
              <div className="hidden sm:flex flex-col gap-2">
                {/* First row: settings, print, presentation, new prayer */}
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    title="Settings"
                  >
                    <Settings size={18} />
                  </button>
                  {/* Desktop: Prayer Mode button */}
                  <button
                    onClick={() => window.location.hash = '#presentation'}
                    className="flex items-center gap-2 bg-green-600 dark:bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors text-base"
                    title="Prayer Mode"
                  >
                    <span>Pray</span>
                  </button>
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-blue-600 dark:bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-base"
                  >
                    <span>Add Request</span>
                  </button>
                </div>
                
                {/* Second row: admin and logout (right-aligned) */}
                {isAdmin && (
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => {
                        if (window.location.hash === '#admin') {
                          window.location.hash = '';
                        } else {
                          window.location.hash = '#admin';
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-base ${
                        window.location.hash === '#admin'
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                      }`}
                    >
                      <Shield size={18} className="w-5 h-5" />
                      <span>Admin</span>
                    </button>
                    <button
                      onClick={async () => {
                        await logout();
                        window.location.hash = '';
                      }}
                      className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                      title="Logout"
                    >
                      <LogOut size={16} className="w-4 h-4" />
                      <span className="text-base">Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6" style={{ margin: '0 auto', maxWidth: '72rem' }}>
        {/* Filters */}
        <PrayerFiltersComponent 
          filters={filters} 
          onFiltersChange={setFilters} 
        />

        {/* Stats - Clickable Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => { setShowPrompts(false); setFilters({...filters, status: 'current'}); }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              !showPrompts && filters.status === 'current' ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {prayers.filter(p => p.status === 'current').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Current</div>
          </button>
          <button
            onClick={() => { setShowPrompts(false); setFilters({...filters, status: 'ongoing'}); }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              !showPrompts && filters.status === 'ongoing' ? 'ring-2 ring-orange-500 border-orange-500' : 'hover:border-orange-300 dark:hover:border-orange-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
              {prayers.filter(p => p.status === 'ongoing').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Ongoing</div>
          </button>
          <button
            onClick={() => { setShowPrompts(false); setFilters({...filters, status: 'answered'}); }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              !showPrompts && filters.status === 'answered' ? 'ring-2 ring-green-500 border-green-500' : 'hover:border-green-300 dark:hover:border-green-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {prayers.filter(p => p.status === 'answered').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Answered</div>
          </button>
          <button
            onClick={() => { setShowPrompts(false); setFilters({}); }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              !showPrompts && !filters.status ? 'ring-2 ring-purple-500 border-purple-500' : 'hover:border-purple-300 dark:hover:border-purple-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{prayers.length || 0}</div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total Prayers</div>
          </button>
          <button
            onClick={() => { 
              setShowPrompts(true); 
              setFilters({}); 
              setSelectedPromptTypes([]); // Reset type filter when opening prompts
            }}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              showPrompts ? 'ring-2 ring-yellow-500 border-yellow-500' : 'hover:border-yellow-300 dark:hover:border-yellow-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {prompts.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Prompts</div>
          </button>
        </div>

        {/* Prayer List or Prompts */}
        <div className="space-y-4">
          {showPrompts ? (
            // Show Prayer Prompts
            <>
              {/* Prompt Type Filters */}
              {prompts.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* All Types Button */}
                  <button
                    onClick={() => setSelectedPromptTypes([])}
                    className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      selectedPromptTypes.length === 0
                        ? 'bg-yellow-500 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-500'
                    }`}
                  >
                    All Types ({prompts.length})
                  </button>
                  
                  {/* Individual Type Buttons - maintain the order from prompts array */}
                  {(() => {
                    // Get unique types in the order they appear in the sorted prompts array
                    const seenTypes = new Set<string>();
                    const orderedTypes: string[] = [];
                    prompts.forEach(p => {
                      if (!seenTypes.has(p.type)) {
                        seenTypes.add(p.type);
                        orderedTypes.push(p.type);
                      }
                    });
                    
                    return orderedTypes.map(type => {
                      const count = prompts.filter(p => p.type === type).length;
                      const isSelected = selectedPromptTypes.includes(type);
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPromptTypes(selectedPromptTypes.filter(t => t !== type));
                            } else {
                              setSelectedPromptTypes([...selectedPromptTypes, type]);
                            }
                          }}
                          className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-yellow-500 text-white shadow-md'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-yellow-400 dark:hover:border-yellow-500'
                          }`}
                        >
                          {type} ({count})
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
              
              {promptsLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">Loading prayer prompts...</p>
              </div>
            ) : prompts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No prayer prompts yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {isAdmin 
                    ? "Add prayer prompts from the Admin Portal to inspire prayer in your community."
                    : "Check back later for prayer prompts from your church leaders."
                  }
                </p>
              </div>
            ) : (
              (selectedPromptTypes.length > 0
                ? prompts.filter(p => selectedPromptTypes.includes(p.type))
                : prompts
              ).map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  isAdmin={isAdmin}
                  onDelete={isAdmin ? deletePrompt : undefined}
                  isTypeSelected={selectedPromptTypes.includes(prompt.type)}
                  onTypeClick={(type) => {
                    if (selectedPromptTypes.includes(type)) {
                      setSelectedPromptTypes(selectedPromptTypes.filter(t => t !== type));
                    } else {
                      setSelectedPromptTypes([...selectedPromptTypes, type]);
                    }
                  }}
                />
              ))
            )}
            </>
          ) : filteredPrayers.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                {prayers.length === 0 ? "No prayer requests yet" : "No prayers match your filters"}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {prayers.length === 0 
                  ? "Start by adding your first prayer request to build your church's prayer community."
                  : "Try adjusting your filters to see more prayers."
                }
              </p>
              {prayers.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add First Prayer
                </button>
              )}
            </div>
          ) : (
            filteredPrayers.map((prayer) => (
              <PrayerCard
                key={prayer.id}
                prayer={prayer}
                onUpdateStatus={updatePrayerStatus}
                onAddUpdate={addPrayerUpdate}
                onDelete={deletePrayer}
                registerCloseCallback={registerCloseCallback}
                onFormOpen={closeAllForms}
                onRequestStatusChange={async (prayerId: string, newStatus: PrayerStatus, reason: string, requesterName: string, requesterEmail: string) => {
                  try {
                    const { error } = await supabase
                      .from('status_change_requests')
                      .insert({ prayer_id: prayerId, requested_status: newStatus, reason, requested_by: requesterName, requested_email: requesterEmail, approval_status: 'pending' })
                      .select()
                      .single();
                    if (error) throw error;

                    // send admin notification
                    try {
                      const { data: prayerRow } = await supabase.from('prayers').select('title, status').eq('id', prayerId).single();
                      await sendAdminNotification({ type: 'status-change', title: prayerRow?.title || 'Unknown Prayer', reason, requestedBy: requesterName, currentStatus: prayerRow?.status, requestedStatus: newStatus });
                    } catch (notifyErr) {
                      console.warn('Failed to send status change notification', notifyErr);
                    }
                  } catch (err) {
                    console.error('Failed to submit status change request', err);
                    alert('Failed to submit status change request. Please try again.');
                  }
                }}
                onRequestDelete={async (prayerId: string, reason: string, requesterName: string, requesterEmail: string) => {
                  try {
                    const { error } = await supabase
                      .from('deletion_requests')
                      .insert({ prayer_id: prayerId, reason, requested_by: requesterName, requested_email: requesterEmail, approval_status: 'pending' })
                      .select()
                      .single();
                    if (error) throw error;

                    // send admin notification
                    try {
                      const { data: prayerRow } = await supabase.from('prayers').select('title').eq('id', prayerId).single();
                      await sendAdminNotification({ type: 'deletion', title: prayerRow?.title || 'Unknown Prayer', reason, requestedBy: requesterName });
                    } catch (notifyErr) {
                      console.warn('Failed to send deletion notification', notifyErr);
                    }
                  } catch (err) {
                    console.error('Failed to submit deletion request', err);
                    alert('Failed to submit deletion request. Please try again.');
                  }
                }}
                onDeleteUpdate={deletePrayerUpdate}
                onRequestUpdateDelete={async (updateId: string, reason: string, requesterName: string, requesterEmail?: string) => {
                  return await requestUpdateDeletion(updateId, reason, requesterName, requesterEmail);
                }}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>
      </main>

      {/* Prayer Form Modal */}
      <PrayerForm
        isOpen={showForm}
        onSubmit={addPrayer}
        onCancel={() => setShowForm(false)}
      />

      {/* User Settings Modal */}
      <UserSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      
      {/* Admin Access Link */}
      {!isAdmin && window.location.hash !== '#admin' && (
        <footer className="mt-8 text-center">
          <button
            onClick={() => {
              window.location.hash = '#admin';
            }}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 underline transition-colors"
          >
            Admin Access
          </button>
        </footer>
      )}
    </div>
  );
}

function AdminWrapper() {
  const { isAdmin, loading } = useAdminAuth();
  const [currentView, setCurrentView] = useState<'public' | 'admin-login' | 'admin-portal' | 'presentation' | 'mobile-presentation'>('public');
  
  // Handle hash changes for admin access
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#presentation') {
        setCurrentView('presentation');
      } else if (window.location.hash === '#mobile-presentation') {
        setCurrentView('mobile-presentation');
      } else if (window.location.hash === '#admin') {
        // If already logged in (session valid), go straight to portal
        // Otherwise, show login page
        if (isAdmin && !loading) {
          setCurrentView('admin-portal');
        } else if (!loading) {
          setCurrentView('admin-login');
        }
      } else {
        setCurrentView('public');
      }
    };

    // Only handle hash changes after loading is complete
    if (!loading) {
      handleHashChange();
    }
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isAdmin, loading]);

  // Auto-redirect to admin portal after login
  useEffect(() => {
    if (isAdmin && currentView === 'admin-login') {
      setCurrentView('admin-portal');
      window.location.hash = '#admin';
    }
  }, [isAdmin, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (currentView === 'presentation') {
    return <PrayerPresentation />;
  }
  
  if (currentView === 'mobile-presentation') {
    return <MobilePresentation />;
  }
  
  if (currentView === 'admin-login') {
    return <AdminLogin />;
  }
  
  if (currentView === 'admin-portal' && isAdmin) {
    return <AdminPortal />;
  }
  
  return <AppContent />;
}

function App() {
  return (
    <AdminAuthProvider>
      <ToastProvider>
        <AdminWrapper />
      </ToastProvider>
    </AdminAuthProvider>
  );
}

export default App;
