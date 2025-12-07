import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Play, Pause, Timer, Bell, X, ChevronLeft, ChevronRight, Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculateSmartDurationPrayer, calculateSmartDurationPrompt, formatTime, applyTheme, handleThemeChange as handleThemeChangeUtil } from '../utils/presentationUtils';

interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
}

interface PrayerPrompt {
  id: string;
  title: string;
  type: string;
  description: string;
  created_at: string;
}

export const PrayerPresentation: React.FC = () => {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [prompts, setPrompts] = useState<PrayerPrompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayDuration, setDisplayDuration] = useState(10); // seconds
  const [smartMode, setSmartMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [contentType, setContentType] = useState<string>('prayers');
  const [statusFilter, setStatusFilter] = useState<string[]>(['current', 'answered']);
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string[]>(['current', 'answered']);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [timeFilter, setTimeFilter] = useState<string>('month');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
      return savedTheme;
    }
    return 'system';
  });
  const [randomize, setRandomize] = useState(false);
  const [showSmartModeDetails, setShowSmartModeDetails] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(10);
  
  // Prayer Timer states
  const [prayerTimerMinutes, setPrayerTimerMinutes] = useState(10);
  const [prayerTimerActive, setPrayerTimerActive] = useState(false);
  const [prayerTimerRemaining, setPrayerTimerRemaining] = useState(0);
  const [showTimerNotification, setShowTimerNotification] = useState(false);

  // Apply theme
  useEffect(() => {
    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme(theme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Fetch prayers
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchData = async () => {
      // Only set loading if still mounted
      if (!isMounted) return;
      setLoading(true);
      
      try {
        // Add 30 second timeout for all fetch operations
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout - prayers took too long to load')), 30000)
        );

        const fetchPromise = (async () => {
          if (contentType === 'prayers') {
            await fetchPrayers();
          } else if (contentType === 'prompts') {
            await fetchPrompts();
          } else if (contentType === 'both') {
            // Fetch both prayers and prompts in parallel
            await Promise.all([fetchPrayers(), fetchPrompts()]);
          }
        })();

        await Promise.race([fetchPromise, timeoutPromise]);
      } catch (error) {
        // Only log error if component is still mounted
        if (isMounted) {
          console.error('Error fetching data:', error);
        }
      } finally {
        // Only update state if component is still mounted
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, timeFilter, contentType]);

  const fetchPrayers = async () => {
    try {
      let query = supabase
        .from('prayers')
        .select(`
          *,
          prayer_updates(*)
        `)
        .eq('approval_status', 'approved');

      // Only filter by status when specific statuses are selected
      // When statusFilter is empty, show all prayers including archived
      if (contentType === 'prayers' && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      // Apply time filter only when viewing prayers alone
      if (contentType === 'prayers' && timeFilter !== 'all') {
        const now = new Date();
        let dateThreshold: Date;
        
        switch (timeFilter) {
          case 'week':
            dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'twoweeks':
            dateThreshold = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            dateThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateThreshold = new Date(0);
        }
        
        query = query.gte('created_at', dateThreshold.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching prayers:', error);
      } else {
        // Filter to only include approved updates
        const prayersWithApprovedUpdates = data?.map(prayer => ({
          ...prayer,
          prayer_updates: prayer.prayer_updates?.filter((update: any) => 
            update.approval_status === 'approved'
          ) || []
        })) || [];
        
        setPrayers(prayersWithApprovedUpdates);
      }
    } catch (error) {
      console.error('Error in fetchPrayers:', error);
    }
  };

  const fetchPrompts = async () => {
    try {
      // Fetch active prayer types
      const { data: typesData, error: typesError } = await supabase
        .from('prayer_types')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (typesError) throw typesError;

      // Create a set of active type names
      const activeTypeNames = new Set((typesData || []).map(t => t.name));

      // Create a map of type name to display_order
      const typeOrderMap = new Map(typesData?.map(t => [t.name, t.display_order]) || []);

      // Fetch all prompts
      const { data, error } = await supabase
        .from('prayer_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching prompts:', error);
      } else {
        // Filter to only active types and sort by display_order
        const filtered = (data || [])
          .filter(p => activeTypeNames.has(p.type))
          .sort((a, b) => {
            const orderA = typeOrderMap.get(a.type) ?? 999;
            const orderB = typeOrderMap.get(b.type) ?? 999;
            return orderA - orderB;
          });
        setPrompts(filtered);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  const handleRefreshPrayers = async () => {
    setLoading(true);
    
    try {
      // Add 30 second timeout for refresh operations
      const timeoutPromise = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - prayers took too long to load')), 30000)
      );

      const fetchPromise = (async () => {
        if (contentType === 'prayers') {
          await fetchPrayers();
        } else if (contentType === 'prompts') {
          await fetchPrompts();
        } else if (contentType === 'both') {
          await Promise.all([fetchPrayers(), fetchPrompts()]);
        }
      })();

      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance timer
  useEffect(() => {
    const items = contentType === 'prayers' ? prayers : prompts;
    
    if (!isPlaying || items.length === 0) {
      setCountdownRemaining(0);
      return;
    }

    // Calculate duration based on content type and smart mode
    let calculatedDuration = displayDuration;
    if (smartMode) {
      if (contentType === 'prayers' && prayers[currentIndex]) {
        calculatedDuration = calculateSmartDurationPrayer(prayers[currentIndex], smartMode, displayDuration);
      } else if (contentType === 'prompts' && prompts[currentIndex]) {
        calculatedDuration = calculateSmartDurationPrompt(prompts[currentIndex], smartMode, displayDuration);
      }
    }

    // Set the current duration and countdown
    setCurrentDuration(calculatedDuration);
    setCountdownRemaining(calculatedDuration);

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, calculatedDuration * 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, displayDuration, smartMode, prayers.length, prompts.length, currentIndex, contentType]);

  // Countdown timer for visual display
  useEffect(() => {
    if (!isPlaying || countdownRemaining <= 0) return;

    const interval = setInterval(() => {
      setCountdownRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, countdownRemaining]);

  // Show/hide controls based on mouse position
  useEffect(() => {
    // Detect if device is non-mobile (has mouse/pointer)
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Track whether the initial 5-second period has elapsed
    let initialPeriodElapsed = false;
    
    // On non-mobile devices, show controls for 3 seconds initially
    let initialTimer: NodeJS.Timeout | null = null;
    if (!isMobile) {
      initialTimer = setTimeout(() => {
        initialPeriodElapsed = true;
        setShowControls(false);
      }, 5000);
    } else {
      initialPeriodElapsed = true; // Skip initial period on mobile
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Don't apply auto-hide logic during the initial 5-second period
      if (!initialPeriodElapsed) {
        return;
      }
      
      const windowHeight = window.innerHeight;
      const mouseY = e.clientY;
      
      // Show controls if mouse is in bottom 20% of screen, hide if not
      if (mouseY > windowHeight * 0.8) {
        setShowControls(true);
      } else if (mouseY < windowHeight * 0.75) {
        // Only hide if mouse is well away from the control area
        setShowControls(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (initialTimer) {
        clearTimeout(initialTimer);
      }
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const items = contentType === 'prayers' ? prayers : prompts;
      if (items.length === 0) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentIndex((prev) => (prev + 1) % items.length);
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'Escape':
          e.preventDefault();
          setShowSettings(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prayers.length, prompts.length, contentType]);

  // Prayer Timer
  useEffect(() => {
    if (!prayerTimerActive) return;

    if (prayerTimerRemaining <= 0) {
      // Timer finished
      setPrayerTimerActive(false);
      setShowTimerNotification(true);
      
      // Play notification sound (browser notification)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Prayer Timer Complete! 🙏', {
          body: `Your ${prayerTimerMinutes} minute prayer time is up.`,
          icon: '/favicon.ico'
        });
      }
      
      // Auto-hide notification after 10 seconds
      setTimeout(() => setShowTimerNotification(false), 10000);
      return;
    }

    const timer = setInterval(() => {
      setPrayerTimerRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimerActive, prayerTimerRemaining, prayerTimerMinutes]);

  const startPrayerTimer = () => {
    setPrayerTimerRemaining(prayerTimerMinutes * 60);
    setPrayerTimerActive(true);
    setShowTimerNotification(false);
    
    // Request notification permission if needed
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const stopPrayerTimer = () => {
    setPrayerTimerActive(false);
    setPrayerTimerRemaining(0);
  };

  const goToPrevious = () => {
    if (currentItems.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + currentItems.length) % currentItems.length);
  };

  const goToNext = () => {
    if (currentItems.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % currentItems.length);
  };

  // Get status badge colors matching the main PrayerCard component
  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-[#0047AB] bg-opacity-20 text-[#0047AB] dark:bg-[#0047AB] dark:bg-opacity-30 dark:text-[#4A90E2] border border-[#0047AB]';
      case 'answered':
        return 'bg-[#39704D] bg-opacity-20 text-[#39704D] dark:bg-[#39704D] dark:bg-opacity-30 dark:text-[#5FB876] border border-[#39704D]';
      case 'archived':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  // Shuffle function for randomizing items
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get current items based on content type and randomize setting
  const currentItems = useMemo(() => {
    let items: (Prayer | PrayerPrompt)[] = [];
    
    if (contentType === 'prayers') {
      items = prayers;
    } else if (contentType === 'prompts') {
      items = prompts;
    } else if (contentType === 'both') {
      // Combine both prayers and prompts
      items = [...prayers, ...prompts];
    }
    
    return randomize ? shuffleArray(items) : items;
  }, [prayers, prompts, contentType, randomize]);

  const currentItem = currentItems[currentIndex];
  const currentPrayer = currentItem && 'prayer_for' in currentItem ? currentItem as Prayer : null;
  const currentPrompt = currentItem && 'type' in currentItem && !('prayer_for' in currentItem) ? currentItem as PrayerPrompt : null;

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <div className="text-gray-900 dark:text-white text-xl">
            Loading {contentType === 'prayers' ? 'prayers' : contentType === 'prompts' ? 'prompts' : 'prayers and prompts'}...
          </div>
        </div>
      </div>
    );
  }

  if (currentItems.length === 0) {
    const displayText = contentType === 'prayers' 
      ? 'Prayers' 
      : contentType === 'prompts' 
      ? 'Prayer Prompts' 
      : 'Prayers or Prayer Prompts';
    
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-center">
          <h1 className="text-4xl font-bold mb-4">No {displayText} Available</h1>
          <p className="text-xl">Please add some {displayText.toLowerCase()} to display.</p>
        </div>
      </div>
    );
  }

  const sortedUpdates = currentPrayer?.prayer_updates
    ? [...currentPrayer.prayer_updates].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  const renderPrayerCard = (prayer: Prayer, updates: typeof sortedUpdates) => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto">
      {/* Prayer For */}
      <div className="mb-6">
        <div className="text-2xl font-semibold mb-2 text-blue-600 dark:text-blue-300">Prayer For:</div>
        <div className="text-5xl font-bold leading-tight text-gray-900 dark:text-gray-100">{prayer.prayer_for}</div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <div className="text-3xl leading-relaxed text-gray-800 dark:text-gray-100">{prayer.description}</div>
      </div>

      {/* Meta Info */}
      <div className="flex justify-between items-center mb-1 text-xl text-gray-700 dark:text-gray-300 flex-wrap gap-4">
        <div>
          <span className="font-semibold">Requested by:</span> {prayer.requester || 'Anonymous'}
        </div>
        <div className={`px-5 py-2 rounded-full border ${getStatusBadgeClasses(prayer.status)}`}>
          {prayer.status.charAt(0).toUpperCase() + prayer.status.slice(1)}
        </div>
      </div>

      {/* Date and Time */}
      <div className="mb-6 text-lg text-gray-700 dark:text-gray-300">
        <span className="font-semibold">Date:</span> {new Date(prayer.created_at).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })} at {new Date(prayer.created_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })}
      </div>

      {/* Updates */}
      {updates.length > 0 && (
        <div className="border-t border-gray-300 dark:border-gray-600 pt-6">
          <div className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Recent Updates ({updates.length})</div>
          <div className="space-y-4">
            {updates.slice(0, 3).map((update) => (
              <div key={update.id} className="bg-gray-100 dark:bg-gray-700 rounded-xl p-5">
                <div className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                  {update.author} • {new Date(update.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })} at {new Date(update.created_at).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
                <div className="text-xl text-gray-800 dark:text-gray-200">{update.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPromptCard = (prompt: PrayerPrompt) => (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-h-full overflow-y-auto">
      {/* Type Badge */}
      <div className="mb-6">
        <span className="inline-block px-5 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-xl font-semibold border border-yellow-300 dark:border-yellow-700">
          {prompt.type}
        </span>
      </div>

      {/* Title */}
      <div className="mb-6">
        <div className="text-5xl font-bold leading-tight text-gray-900 dark:text-white">{prompt.title}</div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <div className="text-3xl leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{prompt.description}</div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white relative">
      {/* Main Prayer Display */}
      <div className={`h-screen flex flex-col justify-center px-6 py-6 transition-all duration-300 relative z-0 ${
        showControls ? 'pb-28' : 'pb-6'
      }`}>
        {/* Card Container */}
        <div className="w-full max-w-6xl mx-auto h-full">
          <div className="h-full overflow-y-auto flex items-center px-2">
            {currentPrayer 
              ? renderPrayerCard(currentPrayer, sortedUpdates)
              : currentPrompt
              ? renderPromptCard(currentPrompt)
              : null
            }
          </div>
        </div>
      </div>

      {/* Timer Complete Notification */}
      {showTimerNotification && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-12 shadow-2xl border-4 border-green-400 text-center max-w-2xl mx-4 animate-pulse relative">
            <button
              onClick={() => setShowTimerNotification(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Close"
            >
              <X size={32} className="text-white" />
            </button>
            <Bell size={80} className="mx-auto mb-6 text-white" />
            <h2 className="text-6xl font-bold mb-4">Prayer Timer Complete! 🙏</h2>
            <p className="text-2xl opacity-90">Your prayer time has ended</p>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-6 border-t border-gray-200 dark:border-gray-700 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="container mx-auto flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrevious}
              className="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
              title="Previous Prayer"
            >
              <ChevronLeft size={32} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} />}
            </button>
            <button
              onClick={goToNext}
              className="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
              title="Next Prayer"
            >
              <ChevronRight size={32} />
            </button>
            {isPlaying && (
              <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg ml-2">
                <Timer size={20} className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                  {countdownRemaining}s
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  / {currentDuration}s
                </span>
              </div>
            )}
          </div>

          {/* Status */}
          {/* <div className="text-l text-gray-900 dark:text-white">
            {isPlaying 
              ? smartMode 
                ? 'Auto-advancing (Smart Mode)' 
                : `Auto-advancing every ${displayDuration}s`
              : 'Paused'
            }
          </div> */}

          {/* Settings and Close */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
              title="Settings"
            >
              <Settings size={32} />
            </button>
            <button
              onClick={() => window.location.hash = ''}
              className="p-4 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
              title="Exit Presentation"
            >
              <X size={32} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-8 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="space-y-6 px-8 pb-8 overflow-y-auto">
              {/* Theme Selection */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Sun className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100 mb-3 text-base">
                      Theme Preference
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleThemeChangeUtil('light', setTheme)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          theme === 'light'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <Sun size={20} className="text-amber-600" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Light</span>
                      </button>
                      <button
                        onClick={() => handleThemeChangeUtil('dark', setTheme)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          theme === 'dark'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <Moon size={20} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">Dark</span>
                      </button>
                      <button
                        onClick={() => handleThemeChangeUtil('system', setTheme)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          theme === 'system'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <Monitor size={20} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">System</span>
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      Choose your preferred color theme or use your system settings
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 mb-6">
                  <input
                    type="checkbox"
                    checked={smartMode}
                    onChange={(e) => setSmartMode(e.target.checked)}
                    className="w-6 h-6 rounded cursor-pointer"
                  />
                  <span className="text-xl text-gray-900 dark:text-gray-100">Smart Mode (adjust time based on content length)</span>
                </label>
              </div>

              {!smartMode && (
                <>
                  <div>
                    <label className="block text-xl mb-3 text-gray-900 dark:text-gray-100">Auto-advance interval (seconds)</label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={displayDuration}
                      onChange={(e) => setDisplayDuration(Number(e.target.value))}
                      className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-center text-2xl mt-2 font-semibold text-gray-900 dark:text-gray-100">{displayDuration}s</div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setDisplayDuration(10)}
                      className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-lg transition-colors"
                    >
                      10s
                    </button>
                    <button
                      onClick={() => setDisplayDuration(20)}
                      className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-lg transition-colors"
                    >
                      20s
                    </button>
                    <button
                      onClick={() => setDisplayDuration(30)}
                      className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-lg transition-colors"
                    >
                      30s
                    </button>
                  </div>
                </>
              )}

              {smartMode && (
                <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                  <p className="text-lg text-gray-800 dark:text-gray-100 mb-2">
                    Smart mode automatically adjusts display time based on prayer length, giving you more time to read longer prayers and updates.
                  </p>
                  <button
                    onClick={() => setShowSmartModeDetails(!showSmartModeDetails)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-base font-medium flex items-center gap-1"
                  >
                    {showSmartModeDetails ? '− Hide details' : '+ Show details'}
                  </button>
                  {showSmartModeDetails && (
                    <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700 text-base text-gray-700 dark:text-gray-300 space-y-2">
                      <p><strong>How it works:</strong></p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Counts characters in prayer description and up to 3 recent updates</li>
                        <li>Reading pace: ~120 characters per 10 seconds</li>
                        <li>Minimum time: 10 seconds per prayer</li>
                        <li>Maximum time: 120 seconds (2 minutes) per prayer</li>
                      </ul>
                      <p className="text-sm italic mt-2">
                        Example: A prayer with 240 characters will display for about 20 seconds
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Content Type Filter */}
              <div>
                <label className="block text-xl mb-3 text-gray-900 dark:text-gray-100">Content Type</label>
                <div className="relative">
                  <select
                    value={contentType}
                    onChange={(e) => {
                      setContentType(e.target.value);
                      setCurrentIndex(0); // Reset to first item when switching types
                    }}
                    className="w-full appearance-none px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0047AB] focus:border-transparent pr-10"
                  >
                    <option value="prayers">Prayers</option>
                    <option value="prompts">Prayer Prompts</option>
                    <option value="both">Both</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" size={24} />
                </div>
              </div>

              {/* Randomize Toggle */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xl text-gray-900 dark:text-gray-100">Randomize Order</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={randomize}
                      onChange={(e) => {
                        setRandomize(e.target.checked);
                        setCurrentIndex(0); // Reset to first item when toggling randomize
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-8 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </label>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  Shuffle the display order randomly
                </p>
              </div>

              {/* Time Filter - Only show for prayers */}
              {contentType === 'prayers' && (
                <div>
                  <label className="block text-xl mb-3 text-gray-900 dark:text-gray-100">Time Period</label>
                  <div className="relative">
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      className="w-full appearance-none px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0047AB] focus:border-transparent pr-10"
                    >
                      <option value="week">Last Week</option>
                      <option value="twoweeks">Last 2 Weeks</option>
                      <option value="month">Last Month</option>
                      <option value="year">Last Year</option>
                      <option value="all">All Time</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" size={24} />
                  </div>
                </div>
              )}

              {/* Prayer Status Filter - Only show for prayers */}
              {contentType === 'prayers' && (
                <div>
                  <label className="block text-xl mb-3 text-gray-900 dark:text-gray-100">Prayer Status</label>
                  <div className="relative">
                    <div className="flex">
                      <div className="flex-1 flex items-center px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-l-lg text-lg border border-r-0 border-gray-300 dark:border-gray-600">
                        <span>{statusFilter.length === 0 ? 'All Statuses' : statusFilter.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (showStatusDropdown) {
                            // Closing - apply the pending filter
                            setStatusFilter(pendingStatusFilter);
                            setCurrentIndex(0);
                          } else {
                            // Opening - sync pending with current
                            setPendingStatusFilter(statusFilter);
                          }
                          setShowStatusDropdown(!showStatusDropdown);
                        }}
                        className="flex items-center justify-center px-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-r-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronDown className={`transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} size={24} />
                      </button>
                    </div>
                    {showStatusDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-[60]"
                          onClick={() => {
                            setStatusFilter(pendingStatusFilter);
                            setCurrentIndex(0);
                            setShowStatusDropdown(false);
                          }}
                        />
                        <div 
                          className="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[70]"
                        >
                          {['current', 'answered', 'archived'].map(status => {
                            const isSelected = pendingStatusFilter.includes(status);
                            return (
                              <div
                                key={status}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (isSelected) {
                                    setPendingStatusFilter(pendingStatusFilter.filter(s => s !== status));
                                  } else {
                                    setPendingStatusFilter([...pendingStatusFilter, status]);
                                  }
                                }}
                                className="w-full text-left px-4 py-3 text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between capitalize cursor-pointer"
                              >
                                <span>{status}</span>
                                {isSelected && <span className="text-green-600 dark:text-green-400">✓</span>}
                              </div>
                            );
                          })}
                          <div
                            onMouseDown={(e) => { e.preventDefault(); setPendingStatusFilter([]); }}
                            className="w-full text-left px-4 py-3 text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer border-t border-gray-200 dark:border-gray-700"
                          >
                            <span>All Statuses</span>
                            {pendingStatusFilter.length === 0 && <span className="text-green-600 dark:text-green-400">✓</span>}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Prayer Timer */}
              <div className="border-t border-gray-300 dark:border-gray-600 pt-6 mt-6">
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <Timer size={24} />
                  Prayer Timer
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xl mb-3 text-gray-900 dark:text-gray-100">Timer Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={prayerTimerMinutes}
                      onChange={(e) => setPrayerTimerMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={prayerTimerActive}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0047AB] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {prayerTimerActive && (
                    <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">{formatTime(prayerTimerRemaining)}</div>
                      <div className="text-lg text-gray-700 dark:text-gray-300">Time Remaining</div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {!prayerTimerActive ? (
                      <button
                        onClick={startPrayerTimer}
                        className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <Timer size={20} />
                        Start Timer
                      </button>
                    ) : (
                      <button
                        onClick={stopPrayerTimer}
                        className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <X size={20} />
                        Stop Timer
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                      Set a timer for your prayer time. You'll receive a notification when the time is up.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRefreshPrayers}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-gray-100 rounded-lg text-lg font-semibold transition-colors"
              >
                Refresh Prayers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
