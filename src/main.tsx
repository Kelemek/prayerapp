console.log('🚀 App.tsx is loading...');

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.tsx'
import { initializeClarity } from './lib/clarity'

// Initialize Sentry - moved to after React renders to avoid blocking
const initSentryLater = async () => {
  try {
    const { initializeSentry } = await import('./lib/sentry');
    console.log('📍 About to call initializeSentry()');
    initializeSentry();
    console.log('📍 initializeSentry() called');
  } catch (error) {
    console.error('Failed to load Sentry module:', error);
  }
};

// Initialize Sentry asynchronously
initSentryLater();

// Initialize Microsoft Clarity for session replays
initializeClarity();

// Ensure theme is applied immediately on app load
const applyStoredTheme = () => {
  const theme = localStorage.getItem('theme') || 'system';
  const root = document.documentElement;
  
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

// Apply theme before React renders
applyStoredTheme();

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
    <SpeedInsights />
  </StrictMode>,
);

// Defer non-critical work
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Any non-critical initialization can go here
  });
}
