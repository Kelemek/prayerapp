/**
 * Microsoft Clarity Integration
 * 
 * Clarity provides:
 * - Session replays (watch user sessions)
 * - Heatmaps (see where users click)
 * - Crash detection
 * - Rage click detection
 * 
 * Setup: Go to https://clarity.microsoft.com and create a project
 * Then add your Project ID to VITE_CLARITY_PROJECT_ID in .env
 */

import Clarity from '@microsoft/clarity';

export const initializeClarity = (): void => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
    
    // Debug logging to verify environment variable is loaded
    if (clarityProjectId) {
      console.debug('Clarity environment check:', {
        projectId: clarityProjectId,
        hasValue: !!clarityProjectId,
        isDefined: clarityProjectId !== undefined,
        isEmpty: clarityProjectId === '',
        type: typeof clarityProjectId,
        mode: import.meta.env.MODE
      });
    }
    
    // Only initialize if project ID is explicitly set and not empty
    // In production on Vercel, if not set, just skip silently
    if (!clarityProjectId || clarityProjectId === '' || clarityProjectId === 'undefined') {
      console.debug('Clarity not configured - skipping initialization');
      return;
    }

    // Initialize Clarity using the official npm package
    Clarity.init(clarityProjectId);
    console.log('✓ Clarity initialized with project:', clarityProjectId);
  } catch (error) {
    console.error('✗ Failed to initialize Clarity:', error instanceof Error ? error.message : String(error));
  }
};

export default initializeClarity;
