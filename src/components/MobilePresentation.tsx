import React, { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Settings, X, Timer, Bell, Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
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

export const MobilePresentation: React.FC = () => {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [prompts, setPrompts] = useState<PrayerPrompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayDuration, setDisplayDuration] = useState(10); // seconds
  const [smartMode, setSmartMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [contentType, setContentType] = useState<string>('prayers');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [randomize, setRandomize] = useState(false);
  const [showSmartModeDetails, setShowSmartModeDetails] = useState(false);
  const [prayerTimerMinutes, setPrayerTimerMinutes] = useState(10);
  const [prayerTimerActive, setPrayerTimerActive] = useState(false);
  const [prayerTimerRemaining, setPrayerTimerRemaining] = useState(0);
  const [showTimerNotification, setShowTimerNotification] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(10);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    setTheme(savedTheme || 'system');
  }, []);

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
    const fetchData = async () => {
      setLoading(true);
      
      if (contentType === 'prayers') {
        await fetchPrayers();
      } else if (contentType === 'prompts') {
        await fetchPrompts();
      } else if (contentType === 'both') {
        // Fetch both prayers and prompts in parallel
        await Promise.all([fetchPrayers(), fetchPrompts()]);
      }
      
      setLoading(false);
    };
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, timeFilter, contentType]);

  const fetchPrayers = async () => {
    let query = supabase
      .from('prayers')
      .select(`
        *,
        prayer_updates(*)
      `)
      .eq('approval_status', 'approved')
      .neq('status', 'closed');

    // Apply status filter only when viewing prayers alone
    if (contentType === 'prayers' && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply time filter only when viewing prayers alone
    if (contentType === 'prayers' && timeFilter !== 'all') {
      const now = new Date();
      let dateThreshold: Date;
      
      switch (timeFilter) {
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
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
  };

  const fetchPrompts = async () => {
    const query = supabase
      .from('prayer_prompts')
      .select('*')
      .order('type', { ascending: true })
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching prompts:', error);
    } else {
      setPrompts(data || []);
    }
  };

  // Auto-advance timer
  useEffect(() => {
    const itemsLength = getItemsLength();
    
    if (!isPlaying || itemsLength === 0) {
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
      } else if (contentType === 'both') {
        // For 'both', check which type of content we're showing
        const currentPrayer = prayers[currentIndex];
        if (currentPrayer) {
          calculatedDuration = calculateSmartDurationPrayer(currentPrayer, smartMode, displayDuration);
        }
      }
    }

    // Set the current duration and countdown
    setCurrentDuration(calculatedDuration);
    setCountdownRemaining(calculatedDuration);

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % itemsLength);
    }, calculatedDuration * 1000);

    return () => {
      clearTimeout(timer);
    };
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

  // Prayer timer countdown
  useEffect(() => {
    if (!prayerTimerActive || prayerTimerRemaining <= 0) return;

    const timer = setInterval(() => {
      setPrayerTimerRemaining((prev) => {
        if (prev <= 1) {
          setPrayerTimerActive(false);
          setShowTimerNotification(true);
          
          // Request notification permission and send notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Prayer Timer Complete!', {
              body: 'Your prayer time has ended',
              icon: '/prayer-icon.png'
            });
          }
          
          // Auto-hide notification after 10 seconds
          setTimeout(() => setShowTimerNotification(false), 10000);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimerActive, prayerTimerRemaining]);

  const startPrayerTimer = async () => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    setPrayerTimerRemaining(prayerTimerMinutes * 60);
    setPrayerTimerActive(true);
  };

  const stopPrayerTimer = () => {
    setPrayerTimerActive(false);
    setPrayerTimerRemaining(0);
  };

  // Get current items length based on content type
  const getItemsLength = () => {
    if (contentType === 'prayers') {
      return prayers.length;
    } else if (contentType === 'prompts') {
      return prompts.length;
    } else if (contentType === 'both') {
      return prayers.length + prompts.length;
    }
    return 0;
  };

  const goToPrevious = () => {
    const itemsLength = getItemsLength();
    setCurrentIndex((currentIndex - 1 + itemsLength) % itemsLength);
  };

  const goToNext = () => {
    const itemsLength = getItemsLength();
    setCurrentIndex((currentIndex + 1) % itemsLength);
  };

  // Get status badge colors matching the main PrayerCard component
  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'ongoing':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      case 'answered':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'closed':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // reset
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-2xl">
          Loading {contentType === 'prayers' ? 'prayers' : contentType === 'prompts' ? 'prompts' : 'prayers and prompts'}...
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-center px-4">
          <h1 className="text-3xl font-bold mb-4">No {displayText} Available</h1>
          <p className="text-lg">Please add some {displayText.toLowerCase()} to display.</p>
        </div>
      </div>
    );
  }

  const sortedUpdates = currentPrayer?.prayer_updates
    ? [...currentPrayer.prayer_updates].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  const renderPromptCard = (prompt: PrayerPrompt) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
      {/* Type Badge */}
      <div className="mb-4">
        <span className="inline-block px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full text-base font-semibold border border-yellow-300 dark:border-yellow-700">
          {prompt.type}
        </span>
      </div>

      {/* Title */}
      <div className="mb-4">
        <div className="text-3xl font-bold leading-tight text-gray-900 dark:text-white">{prompt.title}</div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <div className="text-xl leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{prompt.description}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      {/* Prayer Content - scrollable and centered with swipe support */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 pb-24 flex items-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="max-w-2xl mx-auto w-full">
          {/* Prayer Card */}
          {currentPrayer ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Prayer For */}
            <div className="mb-4">
              <div className="text-lg font-semibold mb-1 text-blue-600 dark:text-blue-400">Prayer For:</div>
              <div className="text-3xl font-bold leading-tight text-gray-900 dark:text-white">{currentPrayer.prayer_for}</div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <div className="text-xl leading-relaxed text-gray-800 dark:text-gray-200">{currentPrayer.description}</div>
            </div>

            {/* Meta Info */}
            <div className="flex justify-between items-center mb-1 text-base text-gray-700 dark:text-gray-300 flex-wrap gap-2">
              <div>
                <span className="font-semibold">Requested by:</span> {currentPrayer.requester || 'Anonymous'}
              </div>
              <div className={`px-4 py-1 rounded-full text-sm border ${getStatusBadgeClasses(currentPrayer.status)}`}>
                {currentPrayer.status.charAt(0).toUpperCase() + currentPrayer.status.slice(1)}
              </div>
            </div>

            {/* Date and Time */}
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">Date:</span> {new Date(currentPrayer.created_at).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })} at {new Date(currentPrayer.created_at).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>

            {/* Updates */}
            {sortedUpdates.length > 0 && (
              <div className="border-t border-gray-300 dark:border-gray-600 pt-4">
                <div className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Recent Updates ({sortedUpdates.length})</div>
                <div className="space-y-3">
                  {sortedUpdates.slice(0, 3).map((update) => (
                    <div key={update.id} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
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
                      <div className="text-base text-gray-800 dark:text-gray-200">{update.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          ) : currentPrompt ? (
            renderPromptCard(currentPrompt)
          ) : null}
        </div>
      </div>

      {/* Fixed Controls Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto">
          {/* Top Row: Play/Pause and Close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              {isPlaying && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Timer size={16} className="text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-mono font-semibold text-blue-900 dark:text-blue-100">
                    {countdownRemaining}s
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    / {currentDuration}s
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
                title="Settings"
              >
                <Settings size={24} />
              </button>
              <button
                onClick={() => window.location.hash = ''}
                className="p-3 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-900 dark:text-blue-200 rounded-full transition-colors"
                title="Exit Presentation"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Bottom Row: Status */}
          <div className="text-center text-sm text-gray-900 dark:text-white">
            {isPlaying 
              ? smartMode 
                ? 'Auto-advancing (Smart Mode)' 
                : `Auto-advancing every ${displayDuration}s`
              : 'Paused'
            } • {currentIndex + 1} of {currentItems.length} • Swipe to navigate
            {(statusFilter !== 'all' || timeFilter !== 'all') && contentType === 'prayers' && (
              <div className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                Filtered: {statusFilter !== 'all' ? statusFilter : ''}{statusFilter !== 'all' && timeFilter !== 'all' ? ', ' : ''}{timeFilter !== 'all' ? timeFilter : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4 px-6 pb-6 overflow-y-auto">
              {/* Theme Selection */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Sun className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100 mb-2 text-sm">
                      Theme Preference
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleThemeChangeUtil('light', setTheme)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                          theme === 'light'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <Sun size={18} className="text-amber-600" />
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-100">Light</span>
                      </button>
                      <button
                        onClick={() => handleThemeChangeUtil('dark', setTheme)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                          theme === 'dark'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <Moon size={18} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-100">Dark</span>
                      </button>
                      <button
                        onClick={() => handleThemeChangeUtil('system', setTheme)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                          theme === 'system'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        }`}
                      >
                        <Monitor size={18} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-100">System</span>
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Choose your preferred color theme or use your system settings
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={smartMode}
                    onChange={(e) => setSmartMode(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <span className="text-base text-gray-900 dark:text-white">Smart Mode (adjust time based on content length)</span>
                </label>
              </div>

              {!smartMode && (
                <>
                  <div>
                    <label className="block text-base mb-2 text-gray-900 dark:text-white">Auto-advance interval (seconds)</label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={displayDuration}
                      onChange={(e) => setDisplayDuration(Number(e.target.value))}
                      className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-center text-xl mt-2 font-semibold text-gray-900 dark:text-white">{displayDuration}s</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setDisplayDuration(10)}
                      className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm transition-colors"
                    >
                      10s
                    </button>
                    <button
                      onClick={() => setDisplayDuration(20)}
                      className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm transition-colors"
                    >
                      20s
                    </button>
                    <button
                      onClick={() => setDisplayDuration(30)}
                      className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm transition-colors"
                    >
                      30s
                    </button>
                  </div>
                </>
              )}

              {smartMode && (
                <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                    Smart mode automatically adjusts display time based on prayer length, giving you more time to read longer prayers and updates.
                  </p>
                  <button
                    onClick={() => setShowSmartModeDetails(!showSmartModeDetails)}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-medium flex items-center gap-1"
                  >
                    {showSmartModeDetails ? '− Hide details' : '+ Show details'}
                  </button>
                  {showSmartModeDetails && (
                    <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700 text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
                      <p><strong>How it works:</strong></p>
                      <ul className="list-disc list-inside space-y-0.5 ml-1 text-xs">
                        <li>Counts characters in prayer description and up to 3 recent updates</li>
                        <li>Reading pace: ~120 characters per 10 seconds</li>
                        <li>Minimum time: 10 seconds per prayer</li>
                        <li>Maximum time: 120 seconds (2 minutes) per prayer</li>
                      </ul>
                      <p className="text-xs italic mt-1.5">
                        Example: A prayer with 240 characters will display for about 20 seconds
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Content Type Filter */}
              <div>
                <label className="block text-base mb-2 text-gray-900 dark:text-white">Content Type</label>
                <div className="relative">
                  <select
                    value={contentType}
                    onChange={(e) => {
                      setContentType(e.target.value);
                      setCurrentIndex(0);
                    }}
                    className="w-full appearance-none px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-base cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  >
                    <option value="prayers">Prayers</option>
                    <option value="prompts">Prayer Prompts</option>
                    <option value="both">Both</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" size={20} />
                </div>
              </div>

              {/* Randomize Toggle */}
              <div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-base text-gray-900 dark:text-white">Randomize Order</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={randomize}
                      onChange={(e) => {
                        setRandomize(e.target.checked);
                        setCurrentIndex(0);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Shuffle the display order randomly
                </p>
              </div>

              {/* Status Filter - Only show for prayers */}
              {contentType === 'prayers' && (
              <div>
                <label className="block text-base mb-2 text-gray-900 dark:text-white">Prayer Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full appearance-none px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-base cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  >
                    <option value="all">All Statuses</option>
                    <option value="current">Current</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="answered">Answered</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" size={20} />
                </div>
              </div>
              )}

              {/* Time Filter - Only show for prayers */}
              {contentType === 'prayers' && (
              <div>
                <label className="block text-base mb-2 text-gray-900 dark:text-white">Time Period</label>
                <div className="relative">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="w-full appearance-none px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-base cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">Last Year</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" size={20} />
                </div>
              </div>
              )}

              {/* Prayer Timer */}
              <div className="border-t border-gray-300 dark:border-gray-600 pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900 dark:text-white">
                  <Timer size={20} />
                  Prayer Timer
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-base mb-2 text-gray-900 dark:text-white">Timer Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={prayerTimerMinutes}
                      onChange={(e) => setPrayerTimerMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={prayerTimerActive}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {prayerTimerActive && (
                    <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-3 text-center">
                      <div className="text-3xl font-bold mb-1 text-gray-900 dark:text-white">{formatTime(prayerTimerRemaining)}</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">Time Remaining</div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {!prayerTimerActive ? (
                      <button
                        onClick={startPrayerTimer}
                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-base font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <Timer size={18} />
                        Start Timer
                      </button>
                    ) : (
                      <button
                        onClick={stopPrayerTimer}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-base font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <X size={18} />
                        Stop Timer
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-100 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      Set a timer for your prayer time. You'll receive a notification when the time is up.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={fetchPrayers}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-semibold transition-colors"
              >
                Refresh Prayers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timer Complete Notification */}
      {showTimerNotification && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-8 shadow-2xl border-4 border-green-400 text-center max-w-sm mx-4 animate-pulse relative">
            <button
              onClick={() => setShowTimerNotification(false)}
              className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Close"
            >
              <X size={28} className="text-white" />
            </button>
            <Bell size={60} className="mx-auto mb-4 text-white" />
            <h2 className="text-4xl font-bold mb-3">Prayer Timer Complete! 🙏</h2>
            <p className="text-lg opacity-90">Your prayer time has ended</p>
          </div>
        </div>
      )}
    </div>
  );
};
