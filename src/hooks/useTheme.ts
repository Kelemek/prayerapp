import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export const useTheme = () => {
  // Initialize from localStorage immediately, or default to 'system'
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
      return savedTheme;
    }
    return 'system';
  });

  // Apply theme immediately on component mount and whenever theme changes
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      
      // Get the saved theme from localStorage (in case it was changed elsewhere)
      const currentSavedTheme = localStorage.getItem('theme') as Theme | null;
      const activeTheme = currentSavedTheme || theme;
      
      // Determine the actual theme to apply
      let effectiveTheme: 'light' | 'dark';
      
      if (activeTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        effectiveTheme = systemPrefersDark ? 'dark' : 'light';
      } else {
        effectiveTheme = activeTheme as 'light' | 'dark';
      }
      
      // Apply the theme class
      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      // Save preference to localStorage if it changed
      if (currentSavedTheme !== theme) {
        localStorage.setItem('theme', theme);
      }
    };

    // Apply immediately
    applyTheme();
    
    // Also reapply on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        applyTheme();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user is using system theme
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'system' || !savedTheme) {
        // Force re-render to apply new system theme
        setTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setSystemTheme = () => {
    // Set to system theme
    setTheme('system');
  };

  // Determine if currently in dark mode
  const isDark = () => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return theme === 'dark';
  };

  return {
    theme,
    toggleTheme,
    setSystemTheme,
    isDark: isDark()
  };
};