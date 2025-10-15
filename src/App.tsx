import { useState, useMemo, useEffect } from 'react';
import { Plus, Heart, Shield, LogOut } from 'lucide-react';
import { PrayerForm } from './components/PrayerForm';
import { PrayerCard } from './components/PrayerCard';
import { PrayerFiltersComponent } from './components/PrayerFilters';
import { ThemeToggle } from './components/ThemeToggle';
import { ToastProvider } from './components/Toast';
import { AdminPortal } from './components/AdminPortal';
import { AdminLogin } from './components/AdminLogin';
import { AdminAuthProvider, useAdminAuth } from './hooks/useAdminAuth';
import type { PrayerStatus } from './types/prayer';
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

  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<PrayerFilters>({status: 'current'});

  const filteredPrayers = useMemo(() => {
    return getFilteredPrayers(filters.status, filters.searchTerm);
  }, [prayers, filters, getFilteredPrayers]);

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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">Church Prayer Manager</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block mt-1">Keeping our community connected in prayer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
              <ThemeToggle />
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
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm sm:text-base ${
                      window.location.hash === '#admin'
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                    }`}
                  >
                    <Shield size={16} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">
                      {window.location.hash === '#admin' ? 'Exit Admin' : 'Admin Portal'}
                    </span>
                    <span className="sm:hidden">
                      {window.location.hash === '#admin' ? 'Exit' : 'Admin'}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      window.location.hash = '';
                    }}
                    className="flex items-center gap-1 sm:gap-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                    title="Logout"
                  >
                    <LogOut size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline text-sm">Logout</span>
                  </button>
                </>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 sm:gap-2 bg-blue-600 dark:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm sm:text-base"
              >
                <Plus size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden lg:inline">New Prayer Request</span>
                <span className="lg:hidden">New Prayer</span>
              </button>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => setFilters({...filters, status: 'current'})}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              filters.status === 'current' ? 'ring-2 ring-orange-500 border-orange-500' : 'hover:border-orange-300 dark:hover:border-orange-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
              {prayers.filter(p => p.status === 'current').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Current</div>
          </button>
          <button
            onClick={() => setFilters({...filters, status: 'ongoing'})}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              filters.status === 'ongoing' ? 'ring-2 ring-purple-500 border-purple-500' : 'hover:border-purple-300 dark:hover:border-purple-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
              {prayers.filter(p => p.status === 'ongoing').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Ongoing</div>
          </button>
          <button
            onClick={() => setFilters({...filters, status: 'answered'})}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              filters.status === 'answered' ? 'ring-2 ring-green-500 border-green-500' : 'hover:border-green-300 dark:hover:border-green-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
              {prayers.filter(p => p.status === 'answered').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Answered</div>
          </button>
          <button
            onClick={() => setFilters({})}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ${
              !filters.status ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{prayers.length || 0}</div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total Prayers</div>
          </button>
        </div>

        {/* Prayer List */}
        <div className="space-y-4">
          {filteredPrayers.length === 0 ? (
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
                onRequestStatusChange={async (prayerId: string, newStatus: PrayerStatus, reason: string, requesterName: string, requesterEmail: string) => {
                  try {
                    const { data, error } = await supabase
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
                    const { data, error } = await supabase
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
                onRequestUpdateDelete={async (updateId: string, reason: string, requesterName: string) => {
                  // The PrayerCard now supplies requester email as the 4th arg; forward it to the hook
                  // @ts-ignore - forward all args
                  return await requestUpdateDeletion(updateId, reason, requesterName, arguments[3]);
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
  const [currentView, setCurrentView] = useState<'public' | 'admin-login' | 'admin-portal'>('public');
  
  // Handle hash changes for admin access
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        if (isAdmin) {
          setCurrentView('admin-portal');
        } else {
          setCurrentView('admin-login');
        }
      } else {
        setCurrentView('public');
      }
    };

    // Check initial hash
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isAdmin]);

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
