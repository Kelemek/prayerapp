import React, { useState, useEffect } from 'react';
import { PrayerPresentation } from './PrayerPresentation';
import { MobilePresentation } from './MobilePresentation';

export const ResponsivePresentation: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check initial window size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint in Tailwind
    };

    checkMobile();
    setIsReady(true);

    // Listen for window resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show nothing until we determine the correct component to render
  // This prevents hydration mismatches
  if (!isReady) {
    return null;
  }

  return isMobile ? <MobilePresentation /> : <PrayerPresentation />;
};
