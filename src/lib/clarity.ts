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

  try {
    // Initialize Microsoft Clarity
    (function(c, l, a, r, i, t, y) {
      c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments) };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode?.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityProjectId);

    console.log('Clarity initialized with project:', clarityProjectId);
  } catch (error) {
    console.error('Failed to initialize Clarity:', error);
  }
};

export default initializeClarity;
