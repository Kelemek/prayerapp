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

// import Clarity from '@microsoft/clarity';

export const initializeClarity = (): void => {
  // Clarity is now loaded via script tag in index.html
  // This function is kept for backward compatibility
  console.debug('Clarity loaded via script tag in index.html');
};

export default initializeClarity;
