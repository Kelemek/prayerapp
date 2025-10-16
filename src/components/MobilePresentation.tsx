import React, { useState, useEffect } from 'react';
import { Play, Pause, Settings, X } from 'lucide-react';
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

export const MobilePresentation: React.FC = () => {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayDuration, setDisplayDuration] = useState(10); // seconds
  const [smartMode, setSmartMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Fetch prayers
  useEffect(() => {
    fetchPrayers();
  }, []);

  const fetchPrayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prayers')
      .select(`
        *,
        prayer_updates(*)
      `)
      .eq('approval_status', 'approved')
      .neq('status', 'closed')
      .order('created_at', { ascending: false });

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

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!showControls) return;

    const hideTimer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(hideTimer);
  }, [showControls]);

  const goToPrevious = () => {
    setCurrentIndex((currentIndex - 1 + prayers.length) % prayers.length);
  };

  const goToNext = () => {
    setCurrentIndex((currentIndex + 1) % prayers.length);
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

  // Handle vertical swipes for showing controls
  const onVerticalTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onVerticalTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onVerticalTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance < -minSwipeDistance;
    
    // Only detect upward swipes from bottom 30% of screen
    if (isUpSwipe && touchStart > window.innerHeight * 0.7) {
      setShowControls(true);
    }
  };

  const currentPrayer = prayers[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading prayers...</div>
      </div>
    );
  }

  if (prayers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-white text-center px-4">
          <h1 className="text-3xl font-bold mb-4">No Prayers Available</h1>
          <p className="text-lg">Please add some prayers to display.</p>
        </div>
      </div>
    );
  }

  const sortedUpdates = currentPrayer?.prayer_updates
    ? [...currentPrayer.prayer_updates].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    : [];

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white flex flex-col"
      onTouchStart={onVerticalTouchStart}
      onTouchMove={onVerticalTouchMove}
      onTouchEnd={onVerticalTouchEnd}
    >
      {/* Prayer Content - scrollable and centered with swipe support */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 pb-24 flex items-center"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="max-w-2xl mx-auto w-full">
          {/* Prayer Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
            {/* Prayer For */}
            <div className="mb-4">
              <div className="text-lg font-semibold mb-1 text-blue-200">Prayer For:</div>
              <div className="text-3xl font-bold leading-tight">{currentPrayer.prayer_for}</div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <div className="text-xl leading-relaxed">{currentPrayer.description}</div>
            </div>

            {/* Meta Info */}
            <div className="flex justify-between items-center mb-4 text-base opacity-90 flex-wrap gap-2">
              <div>
                <span className="font-semibold">Requested by:</span> {currentPrayer.requester || 'Anonymous'}
              </div>
              <div className="px-4 py-1 bg-white/20 rounded-full text-sm">
                {currentPrayer.status.charAt(0).toUpperCase() + currentPrayer.status.slice(1)}
              </div>
            </div>

            {/* Updates */}
            {sortedUpdates.length > 0 && (
              <div className="border-t border-white/30 pt-4">
                <div className="text-xl font-semibold mb-3">Recent Updates ({sortedUpdates.length})</div>
                <div className="space-y-3">
                  {sortedUpdates.slice(0, 3).map((update) => (
                    <div key={update.id} className="bg-white/10 rounded-lg p-4">
                      <div className="text-sm opacity-80 mb-1">
                        {update.author} • {new Date(update.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-base">{update.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Controls Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-md p-4 border-t border-white/20">
        <div className="max-w-2xl mx-auto">
          {/* Top Row: Play/Pause and Close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title="Settings"
              >
                <Settings size={24} />
              </button>
              <button
                onClick={() => window.location.hash = ''}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                title="Exit Presentation"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Bottom Row: Status */}
          <div className="text-center text-sm opacity-90">
            {isPlaying 
              ? smartMode 
                ? 'Auto-advancing (Smart Mode)' 
                : `Auto-advancing every ${displayDuration}s`
              : 'Paused'
            } • {currentIndex + 1} of {prayers.length} • Swipe to navigate
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    checked={smartMode}
                    onChange={(e) => setSmartMode(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer"
                  />
                  <span className="text-base">Smart Mode (adjust time based on content length)</span>
                </label>
              </div>

              {!smartMode && (
                <>
                  <div>
                    <label className="block text-base mb-2">Auto-advance interval (seconds)</label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={displayDuration}
                      onChange={(e) => setDisplayDuration(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-center text-xl mt-2 font-semibold">{displayDuration}s</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setDisplayDuration(10)}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                    >
                      10s
                    </button>
                    <button
                      onClick={() => setDisplayDuration(20)}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                    >
                      20s
                    </button>
                    <button
                      onClick={() => setDisplayDuration(30)}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                    >
                      30s
                    </button>
                  </div>
                </>
              )}

              {smartMode && (
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-sm opacity-90">
                    Smart mode automatically adjusts display time (10-90s) based on the amount of text in each prayer.
                  </p>
                </div>
              )}

              <button
                onClick={fetchPrayers}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-base font-semibold transition-colors"
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
