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

  const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
  
  // Debug logging to verify environment variable is loaded
  console.log('Clarity environment check:', {
    projectId: clarityProjectId,
    hasValue: !!clarityProjectId,
    type: typeof clarityProjectId,
    allEnvVars: Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  });
  
  // Only initialize if project ID is configured and valid
  if (!clarityProjectId || typeof clarityProjectId !== 'string' || clarityProjectId.trim() === '') {
    console.debug('Clarity not configured (VITE_CLARITY_PROJECT_ID not set or invalid)');
    return;
  }

  try {
    // Initialize Clarity using the official npm package
    Clarity.init(clarityProjectId);
    console.log('Clarity initialized successfully with project:', clarityProjectId);
  } catch (error) {
    console.error('Failed to initialize Clarity:', error);
  }
};

export default initializeClarity;
