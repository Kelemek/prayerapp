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

export const initializeClarity = (): void => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }

  const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID;
  
  // Only initialize if project ID is configured and valid
  if (!clarityProjectId || typeof clarityProjectId !== 'string' || clarityProjectId.trim() === '') {
    console.debug('Clarity not configured (VITE_CLARITY_PROJECT_ID not set or invalid)');
    return;
  }

  // Validate that the project ID looks reasonable (alphanumeric, reasonable length)
  const projectIdRegex = /^[a-z0-9]{8,20}$/i;
  if (!projectIdRegex.test(clarityProjectId)) {
    console.warn('Clarity project ID has invalid format:', clarityProjectId);
    return;
  }

  try {
    const clarityScriptUrl = `https://www.clarity.ms/tag/${clarityProjectId}`;
    console.debug('Initializing Clarity with URL:', clarityScriptUrl);
    
    // Initialize Microsoft Clarity
    (function(c, l, a, r, i, t, y) {
      c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments) };
      t = l.createElement(r);
      t.async = 1;
      t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0];
      if (y && y.parentNode) {
        y.parentNode.insertBefore(t, y);
      } else {
        console.warn('Could not insert Clarity script - no script tags found');
      }
    })(window, document, "clarity", "script", clarityProjectId);

    console.log('Clarity initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Clarity:', error);
  }
};

export default initializeClarity;
