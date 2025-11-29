import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Shield, LogOut, Settings } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { PrayerForm } from './components/PrayerForm';
import { PrayerCard } from './components/PrayerCard';
import { PromptCard } from './components/PromptCard';
import { AppLogo } from './components/AppLogo';
import { PrayerFiltersComponent } from './components/PrayerFilters';
import { ToastProvider } from './components/ToastProvider';
import { UserSettings } from './components/UserSettings';
import { SkeletonLoader } from './components/SkeletonLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminAuthProvider } from './hooks/useAdminAuth';
import { useAdminAuth } from './hooks/useAdminAuthHook';
import type { PrayerStatus, PrayerPrompt, AllowanceLevel } from './types/prayer';
import { usePrayerManager } from './hooks/usePrayerManager';
import { useTheme } from './hooks/useTheme';
import { supabase } from './lib/supabase';
import type { PrayerFilters } from './types/prayer';
import { sendAdminNotification } from './lib/emailNotifications';
import { setupGlobalErrorHandling, logPageView } from './lib/errorLogger';
import { validateApprovalCode } from './lib/approvalLinks';

// Lazy load heavy components with timeout protection
const lazyWithTimeout = (importFn: () => Promise<any>, timeoutMs: number = 10000) => {
  return lazy(() => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    
    return Promise.race([
      importFn(),
      new Promise((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          reject(new Error(`Lazy component load timed out after ${timeoutMs}ms`));
        });
      })
    ]).finally(() => clearTimeout(timeoutId));
  });
};

const ResponsivePresentation = lazyWithTimeout(() => import('./components/ResponsivePresentation').then(module => ({ default: module.ResponsivePresentation })));
const AdminPortal = lazyWithTimeout(() => import('./components/AdminPortal').then(module => ({ default: module.AdminPortal })));
const AdminLogin = lazyWithTimeout(() => import('./components/AdminLogin').then(module => ({ default: module.AdminLogin })));

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
  const [useLogo, setUseLogo] = useState(false);
  const [lightModeLogoUrl, setLightModeLogoUrl] = useState<string>('');
  const [darkModeLogoUrl, setDarkModeLogoUrl] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [deletionsAllowed, setDeletionsAllowed] = useState<AllowanceLevel>('everyone');
  const [updatesAllowed, setUpdatesAllowed] = useState<AllowanceLevel>('everyone');

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
        // Load from window cache first (set by index.html script)
        const windowCache = (window as any).__cachedLogos;
        if (windowCache?.light) setLightModeLogoUrl(windowCache.light);
        if (windowCache?.dark) setDarkModeLogoUrl(windowCache.dark);
        if (windowCache?.useLogo !== undefined) setUseLogo(windowCache.useLogo);

        // Fetch fresh data from DB
        const { data, error } = await supabase
          .from('admin_settings')
          .select('app_title, app_subtitle, use_logo, light_mode_logo_blob, dark_mode_logo_blob, deletions_allowed, updates_allowed')
          .eq('id', 1)
          .maybeSingle();

        if (!error && data) {
          if (data.app_title) setAppTitle(data.app_title);
          if (data.app_subtitle) setAppSubtitle(data.app_subtitle);
          if (data.use_logo !== null && data.use_logo !== undefined) {
            setUseLogo(data.use_logo);
            localStorage.setItem('branding_use_logo', String(data.use_logo));
          }
          if (data.light_mode_logo_blob) {
            setLightModeLogoUrl(data.light_mode_logo_blob);
            localStorage.setItem('branding_light_logo', data.light_mode_logo_blob);
          }
          if (data.dark_mode_logo_blob) {
            setDarkModeLogoUrl(data.dark_mode_logo_blob);
            localStorage.setItem('branding_dark_logo', data.dark_mode_logo_blob);
          }
          if (data.deletions_allowed) {
            setDeletionsAllowed(data.deletions_allowed);
          }
          if (data.updates_allowed) {
            setUpdatesAllowed(data.updates_allowed);
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding settings:', error);
      }
    };

    fetchBranding();
  }, []);

  // Detect dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    // Initial check
    checkDarkMode();

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => observer.disconnect();
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
  const fetchPromptsAbortRef = useRef<AbortController | null>(null);
  
  const fetchPrompts = useCallback(async () => {
    if (fetchPromptsAbortRef.current) {
      fetchPromptsAbortRef.current.abort();
    }
    
    const abortController = new AbortController();
    fetchPromptsAbortRef.current = abortController;
    
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 15000);
    
    setPromptsLoading(true);
    try {
      // Parallelize both queries for faster loading
      const [typesResult, promptsResult] = await Promise.all([
        supabase
          .from('prayer_types')
          .select('name, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('prayer_prompts')
          .select('*')
          .order('created_at', { ascending: false })
      ]);
      
      clearTimeout(timeoutId);
      
      if (abortController.signal.aborted) {
        return;
      }
      
      if (typesResult.error) {
        throw typesResult.error;
      }
      if (promptsResult.error) {
        throw promptsResult.error;
      }
      // Create a set of active type names for filtering
      const activeTypeNames = new Set((typesResult.data || []).map(t => t.name));
      
      // Create a map of type name to display_order
      const typeOrderMap = new Map(typesResult.data?.map(t => [t.name, t.display_order]) || []);
      
      // Filter prompts to only include those with active types, then sort by type's display_order
      const sortedPrompts = (promptsResult.data || [])
        .filter(p => activeTypeNames.has(p.type))
        .sort((a, b) => {
          const orderA = typeOrderMap.get(a.type) ?? 999;
          const orderB = typeOrderMap.get(b.type) ?? 999;
          return orderA - orderB;
        });
      
      setPrompts(sortedPrompts);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
    } finally {
      setPromptsLoading(false);
    }
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showPrompts) {
      fetchPrompts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPrompts]);

  // Re-fetch prompts when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        fetchPrompts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchPrompts]);

  const filteredPrayers = useMemo(() => {
    return getFilteredPrayers(filters.status, filters.searchTerm);
  }, [filters, getFilteredPrayers]);

  if (error) {
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
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
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      {/* Header */}
      <header className="w-full bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto w-full px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
                {useLogo ? (
                  <AppLogo isDarkMode={isDarkMode} lightModeImageUrl={lightModeLogoUrl} darkModeImageUrl={darkModeLogoUrl} />
                ) : (
                  <>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">{appTitle}</h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block mt-1">{appSubtitle}</p>
                  </>
                )}
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
                  onClick={() => window.location.hash = '#presentation'}
                  className="flex items-center gap-1 bg-[#2F5F54] text-white px-2 py-2 rounded-lg hover:bg-[#1a3a2e] focus:outline-none focus:ring-2 focus:ring-[#2F5F54] transition-colors text-sm"
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
                    className="flex items-center gap-2 bg-[#2F5F54] dark:bg-[#2F5F54] text-white px-4 py-2 rounded-lg hover:bg-[#1a3a2e] dark:hover:bg-[#1a3a2e] focus:outline-none focus:ring-2 focus:ring-[#2F5F54] transition-colors text-base"
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
      <main className="w-full flex-1 max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Filters */}
        <PrayerFiltersComponent 
          filters={filters} 
          onFiltersChange={setFilters} 
        />

        {/* Stats - Clickable Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <button
            onClick={() => { setShowPrompts(false); setFilters({...filters, status: 'current'}); }}
            className={`rounded-lg shadow-md p-3 sm:p-4 text-center border-[2px] transition-all duration-200 min-w-0 ${
              !showPrompts && filters.status === 'current' 
                ? '!border-[#0047AB] dark:!border-[#0047AB] bg-blue-100 dark:bg-blue-950 ring-2 ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0' 
                : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#0047AB] dark:hover:!border-[#0047AB] hover:shadow-lg'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {prayers.filter(p => p.status === 'current').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis">Current</div>
          </button>
          <button
            onClick={() => { setShowPrompts(false); setFilters({...filters, status: 'answered'}); }}
            className={`rounded-lg shadow-md p-3 sm:p-4 text-center border-[2px] transition-all duration-200 min-w-0 ${
              !showPrompts && filters.status === 'answered' 
                ? '!border-[#39704D] dark:!border-[#39704D] bg-green-100 dark:bg-green-950 ring-2 ring-[#39704D] dark:ring-[#39704D] ring-offset-0' 
                : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#39704D] dark:hover:!border-[#39704D] hover:shadow-lg'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {prayers.filter(p => p.status === 'answered').length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis">Answered</div>
          </button>
          <button
            onClick={() => { setShowPrompts(false); setFilters({}); }}
            className={`rounded-lg shadow-md p-3 sm:p-4 text-center border-[2px] transition-all duration-200 min-w-0 ${
              !showPrompts && !filters.status 
                ? '!border-[#C9A961] dark:!border-[#C9A961] bg-amber-100 dark:bg-amber-900/40 ring-2 ring-[#C9A961] dark:ring-[#C9A961] ring-offset-0' 
                : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#C9A961] dark:hover:!border-[#C9A961] hover:shadow-lg'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">{prayers.length || 0}</div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis">Total Prayers</div>
          </button>
          <button
            onClick={() => { 
              setShowPrompts(true); 
              setFilters({}); 
              setSelectedPromptTypes([]); // Reset type filter when opening prompts
            }}
            className={`rounded-lg shadow-md p-3 sm:p-4 text-center border-[2px] transition-all duration-200 min-w-0 ${
              showPrompts 
                ? '!border-[#988F83] dark:!border-[#988F83] bg-stone-100 dark:bg-stone-900/40 ring-2 ring-[#988F83] dark:ring-[#988F83] ring-offset-0' 
                : 'bg-white dark:bg-gray-800 !border-gray-200 dark:!border-gray-700 hover:!border-[#988F83] dark:hover:!border-[#988F83] hover:shadow-lg'
            }`}
          >
            <div className="text-xl sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {prompts.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis">Prompts</div>
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
                        ? 'bg-[#988F83] text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]'
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
                              ? 'bg-[#988F83] text-white shadow-md'
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]'
                          }`}
                        >
                          {type} ({count})
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
              
              {promptsLoading && prompts.length === 0 ? (
              <SkeletonLoader count={3} type="card" />
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
          ) : loading ? (
            <SkeletonLoader count={5} type="card" />
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
                deletionsAllowed={deletionsAllowed}
                updatesAllowed={updatesAllowed}
                registerCloseCallback={registerCloseCallback}
                onFormOpen={closeAllForms}
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
                      
                      // Fetch admin emails for approval code generation
                      const { data: admins } = await supabase
                        .from('email_subscribers')
                        .select('email')
                        .eq('is_admin', true)
                        .eq('is_active', true)
                        .eq('receive_admin_emails', true);

                      await sendAdminNotification({ 
                        type: 'status-change', 
                        title: prayerRow?.title || 'Unknown Prayer', 
                        reason, 
                        requestedBy: requesterName, 
                        currentStatus: prayerRow?.status, 
                        requestedStatus: newStatus, 
                        requestId: data?.id,
                        adminEmails: admins?.map(a => a.email) || []
                      });
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
                      
                      // Fetch admin emails for approval code generation
                      const { data: admins } = await supabase
                        .from('email_subscribers')
                        .select('email')
                        .eq('is_admin', true)
                        .eq('is_active', true)
                        .eq('receive_admin_emails', true);

                      await sendAdminNotification({ 
                        type: 'deletion', 
                        title: prayerRow?.title || 'Unknown Prayer', 
                        reason, 
                        requestedBy: requesterName, 
                        requestId: data?.id,
                        adminEmails: admins?.map(a => a.email) || []
                      });
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
  const [deletionsAllowed, setDeletionsAllowed] = useState<AllowanceLevel>('everyone');
  const [updatesAllowed, setUpdatesAllowed] = useState<AllowanceLevel>('everyone');
  
  // Track if this is a magic link redirect
  const hasRedirectedRef = useRef(false);
  const isMagicLinkRedirect = useRef(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect') === 'admin';
  }).current();
  
  // Fetch app settings for admin controls
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('deletions_allowed, updates_allowed')
        .eq('id', 1)
        .maybeSingle();
      
      if (!error && data) {
        if (data.deletions_allowed) {
          setDeletionsAllowed(data.deletions_allowed);
        }
        if (data.updates_allowed) {
          setUpdatesAllowed(data.updates_allowed);
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin settings:', error);
    }
  };
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  // Handle approval code in URL - validate and store session
  useEffect(() => {
    const handleApprovalCode = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      
      if (!code) return;
      
      // Check if already validated
      const existingEmail = localStorage.getItem('approvalAdminEmail');
      if (existingEmail) {
        window.location.href = window.location.origin + '/#admin';
        return;
      }
      
      try {
        const result = await validateApprovalCode(code);
        
        if (result?.user?.email) {
          localStorage.setItem('approvalAdminEmail', result.user.email);
          localStorage.setItem('approvalSessionValidated', 'true');
          localStorage.setItem('approvalApprovalType', result.approval_type);
          localStorage.setItem('approvalApprovalId', result.approval_id);
          
          window.location.href = window.location.origin + '/#admin';
        }
      } catch (error) {
        // Silently fail - user can use login page instead
      }
    };
    
    handleApprovalCode();
  }, []);
  
  // Handle hash changes for admin access
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      
      // Check if we're in an approval code flow
      const approvalEmail = localStorage.getItem('approvalAdminEmail');
      const isApprovalFlow = !!approvalEmail;
      
      // Check if we're in a magic link callback
      const hasMagicLinkTokens = window.location.hash.includes('access_token') || redirect === 'admin';
      
      if (hash === '#presentation') {
        setCurrentView('presentation');
      } else if (hash.startsWith('#admin') || redirect === 'admin') {
        if (hasMagicLinkTokens && loading) return;
        if (isApprovalFlow && loading) return;
        
        if ((isAdmin || isApprovalFlow) && !loading) {
          setCurrentView('admin-portal');
          if (redirect === 'admin') {
            window.history.replaceState(null, '', window.location.pathname + '#admin');
          }
        } else if (!loading) {
          setCurrentView('admin-login');
          if (redirect === 'admin') {
            window.history.replaceState(null, '', window.location.pathname + '#admin');
          }
        }
      } else {
        setCurrentView('public');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAdmin, loading]);

  // Auto-redirect to admin portal after login via magic link
  useEffect(() => {
    if (isMagicLinkRedirect && !hasRedirectedRef.current && isAdmin && !loading) {
      hasRedirectedRef.current = true;
      setCurrentView('admin-portal');
      window.location.hash = '#admin';
    }
  }, [isAdmin, loading, isMagicLinkRedirect, currentView]);

  if (loading) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    const hasMagicLinkTokens = window.location.hash.includes('access_token') || redirect === 'admin';
    const message = hasMagicLinkTokens ? 'Signing you in...' : 'Loading prayers...';
    const submessage = hasMagicLinkTokens ? 'Please wait while we verify your credentials' : 'If this takes more than 15 seconds, please refresh the page';
    
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-6xl mx-auto px-4">
          <div className="text-center mb-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">{submessage}</p>
          </div>
          <SkeletonLoader count={5} type="card" />
        </div>
      </div>
    );
  }
  
  if (currentView === 'presentation') {
    return (
      <ErrorBoundary onReset={() => window.location.hash = ''}>
        <Suspense fallback={
          <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="w-full max-w-6xl mx-auto px-4">
              <SkeletonLoader count={3} type="card" />
            </div>
          </div>
        }>
          <ResponsivePresentation />
        </Suspense>
      </ErrorBoundary>
    );
  }
  
  if (currentView === 'admin-login') {
    return (
      <ErrorBoundary onReset={() => window.location.hash = ''}>
        <Suspense fallback={
          <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="skeleton h-96 w-96 rounded-lg"></div>
          </div>
        }>
          <AdminLogin />
        </Suspense>
      </ErrorBoundary>
    );
  }
  
  if (currentView === 'admin-portal' && isAdmin) {
    return (
      <ErrorBoundary onReset={() => window.location.hash = '#admin'}>
        <Suspense fallback={
          <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="w-full max-w-6xl mx-auto px-4">
              <SkeletonLoader count={5} type="card" />
            </div>
          </div>
        }>
          <AdminPortal 
            deletionsAllowed={deletionsAllowed}
            updatesAllowed={updatesAllowed}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }
  
  return <AppContent />;
}

function App() {
  // Initialize global error handling on first load
  useEffect(() => {
    setupGlobalErrorHandling();
    logPageView('App');
  }, []);

  return (
    <AdminAuthProvider>
      <ToastProvider>
        <AdminWrapper />
        <Analytics />
      </ToastProvider>
    </AdminAuthProvider>
  );
}

export default App;
