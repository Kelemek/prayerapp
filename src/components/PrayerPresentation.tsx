import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Play, Pause, Timer, Bell, X, ChevronLeft, ChevronRight, Sun, Moon, Monitor } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

export const PrayerPresentation: React.FC = () => {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayDuration, setDisplayDuration] = useState(10); // seconds
  const [smartMode, setSmartMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  // Prayer Timer states
  const [prayerTimerMinutes, setPrayerTimerMinutes] = useState(10);
  const [prayerTimerActive, setPrayerTimerActive] = useState(false);
  const [prayerTimerRemaining, setPrayerTimerRemaining] = useState(0);
  const [showTimerNotification, setShowTimerNotification] = useState(false);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    setTheme(savedTheme || 'system');
  }, []);

  // Apply theme
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      
      let effectiveTheme: 'light' | 'dark';
      
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = systemPrefersDark ? 'dark' : 'light';
      } else {
        effectiveTheme = theme as 'light' | 'dark';
      }
      
      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      localStorage.setItem('theme', theme);
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Fetch prayers
  useEffect(() => {
    fetchPrayers();
  }, [statusFilter, timeFilter]);

  const fetchPrayers = async () => {
    setLoading(true);
    let query = supabase
      .from('prayers')
      .select(`
        *,
        prayer_updates(*)
      `)
      .eq('approval_status', 'approved')
      .neq('status', 'closed');

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply time filter
    if (timeFilter !== 'all') {
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
      setPrayers(data || []);
    }
    setLoading(false);
  };

  // Calculate smart display duration based on content length
  const calculateSmartDuration = (prayer: Prayer): number => {
    if (!smartMode) return displayDuration;
    
    // Count total characters
    let totalChars = 0;
    totalChars += prayer.prayer_for?.length || 0;
    totalChars += prayer.description?.length || 0;
    
    // Add update text length
    if (prayer.prayer_updates && prayer.prayer_updates.length > 0) {
      const recentUpdates = prayer.prayer_updates
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      
      recentUpdates.forEach(update => {
        totalChars += update.content?.length || 0;
      });
    }
    
    // Calculate duration: ~120 chars per 10 seconds (slower, more comfortable reading)
    // Minimum 10 seconds, maximum 90 seconds
    const calculatedDuration = Math.max(10, Math.min(90, Math.ceil(totalChars / 12)));
    return calculatedDuration;
  };

  // Auto-advance timer
  useEffect(() => {
    if (!isPlaying || prayers.length === 0) return;

    const currentDuration = smartMode && prayers[currentIndex] 
      ? calculateSmartDuration(prayers[currentIndex])
      : displayDuration;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % prayers.length);
    }, currentDuration * 1000);

    return () => clearInterval(timer);
  }, [isPlaying, displayDuration, smartMode, prayers.length, currentIndex]);

  // Show/hide controls based on mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (prayers.length === 0) return;
      
      switch(e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setCurrentIndex((prev) => (prev - 1 + prayers.length) % prayers.length);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setCurrentIndex((prev) => (prev + 1) % prayers.length);
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
  }, [prayers.length]);

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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme immediately
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((currentIndex - 1 + prayers.length) % prayers.length);
  };

  const goToNext = () => {
    setCurrentIndex((currentIndex + 1) % prayers.length);
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

  const currentPrayer = prayers[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-3xl">Loading prayers...</div>
      </div>
    );
  }

  if (prayers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-white text-center">
          <h1 className="text-4xl font-bold mb-4">No Prayers Available</h1>
          <p className="text-xl">Please add some prayers to display.</p>
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
        <div className="text-2xl font-semibold mb-2 text-blue-600 dark:text-blue-400">Prayer For:</div>
        <div className="text-5xl font-bold leading-tight text-gray-900 dark:text-white">{prayer.prayer_for}</div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <div className="text-3xl leading-relaxed text-gray-800 dark:text-gray-200">{prayer.description}</div>
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
      <div className="mb-6 text-lg text-gray-600 dark:text-gray-400">
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
          <div className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Updates ({updates.length})</div>
          <div className="space-y-4">
            {updates.slice(0, 3).map((update) => (
              <div key={update.id} className="bg-gray-100 dark:bg-gray-700 rounded-xl p-5">
                <div className="text-lg text-gray-600 dark:text-gray-400 mb-2">
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white relative">
      {/* Main Prayer Display */}
      <div className={`h-screen flex flex-col justify-center px-6 py-6 transition-all duration-300 ${
        showControls ? 'pb-28' : 'pb-6'
      }`}>
        {/* Card Container */}
        <div className="max-w-6xl mx-auto w-full h-full">
          <div className="h-full overflow-y-auto flex items-center px-2">
            {renderPrayerCard(currentPrayer, sortedUpdates)}
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
        className={`fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-6 border-t border-gray-200 dark:border-gray-700 transition-transform duration-300 ${
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
          </div>

          {/* Status */}
          <div className="text-xl text-gray-900 dark:text-white">
            {isPlaying 
              ? smartMode 
                ? 'Auto-advancing (Smart Mode)' 
                : `Auto-advancing every ${displayDuration}s`
              : 'Paused'
            }
            {(statusFilter !== 'all' || timeFilter !== 'all') && (
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                • Filtered ({statusFilter !== 'all' ? statusFilter : ''}{statusFilter !== 'all' && timeFilter !== 'all' ? ', ' : ''}{timeFilter !== 'all' ? timeFilter : ''})
              </span>
            )}
          </div>

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
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            <div className="space-y-6 px-8 pb-8 overflow-y-auto">
              {/* Theme Selection */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sun className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-100 mb-3 text-base">
                      Theme Preference
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleThemeChange('light')}
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
                        onClick={() => handleThemeChange('dark')}
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
                        onClick={() => handleThemeChange('system')}
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
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
                  <span className="text-xl text-gray-900 dark:text-white">Smart Mode (adjust time based on content length)</span>
                </label>
              </div>

              {!smartMode && (
                <>
                  <div>
                    <label className="block text-xl mb-3 text-gray-900 dark:text-white">Auto-advance interval (seconds)</label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={displayDuration}
                      onChange={(e) => setDisplayDuration(Number(e.target.value))}
                      className="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-center text-2xl mt-2 font-semibold text-gray-900 dark:text-white">{displayDuration}s</div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setDisplayDuration(10)}
                      className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-lg transition-colors"
                    >
                      10s
                    </button>
                    <button
                      onClick={() => setDisplayDuration(20)}
                      className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-lg transition-colors"
                    >
                      20s
                    </button>
                    <button
                      onClick={() => setDisplayDuration(30)}
                      className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-lg transition-colors"
                    >
                      30s
                    </button>
                  </div>
                </>
              )}

              {smartMode && (
                <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
                  <p className="text-lg text-gray-800 dark:text-gray-200">
                    Smart mode automatically adjusts display time (10-90s) based on the amount of text in each prayer.
                  </p>
                </div>
              )}

              {/* Status Filter */}
              <div>
                <label className="block text-xl mb-3 text-gray-900 dark:text-white">Prayer Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="current">Current</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="answered">Answered</option>
                </select>
              </div>

              {/* Time Filter */}
              <div>
                <label className="block text-xl mb-3 text-gray-900 dark:text-white">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23666' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="all">All Time</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                </select>
              </div>

              {/* Prayer Timer */}
              <div className="border-t border-gray-300 dark:border-gray-600 pt-6 mt-6">
                <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                  <Timer size={24} />
                  Prayer Timer
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xl mb-3 text-gray-900 dark:text-white">Timer Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={prayerTimerMinutes}
                      onChange={(e) => setPrayerTimerMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={prayerTimerActive}
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {prayerTimerActive && (
                    <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4 text-center">
                      <div className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">{formatTime(prayerTimerRemaining)}</div>
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
                    <p className="text-base text-gray-700 dark:text-gray-300">
                      Set a timer for your prayer time. You'll receive a notification when the time is up.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={fetchPrayers}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold transition-colors"
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
