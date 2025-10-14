import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useState, useRef, useEffect } from 'react';

export const ThemeToggle = () => {
  const { toggleTheme, setSystemTheme, isDark } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isSystemTheme = !localStorage.getItem('theme');

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
        title="Theme settings"
      >
        {isDark ? <Moon size={18} /> : <Sun size={18} />}
        <span className="hidden sm:inline">Theme</span>
      </button>

      {showDropdown && (
        <div
          className="absolute mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
          style={{
            right: '0',
            left: 'auto',
            ...(window.innerWidth <= 640 ? { left: '0', right: 'auto' } : {})
          }}
        >
          <div className="py-2">
            <button
              onClick={() => {
                setSystemTheme();
                setShowDropdown(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${
                isSystemTheme ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <Monitor size={16} />
              <span>System</span>
              {isSystemTheme && (
                <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </button>
            
            <button
              onClick={() => {
                if (isDark) toggleTheme();
                setShowDropdown(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${
                !isSystemTheme && !isDark ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <Sun size={16} />
              <span>Light</span>
              {!isSystemTheme && !isDark && (
                <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </button>
            
            <button
              onClick={() => {
                if (!isDark) toggleTheme();
                setShowDropdown(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 ${
                !isSystemTheme && isDark ? 'bg-gray-100 dark:bg-gray-700' : ''
              }`}
            >
              <Moon size={16} />
              <span>Dark</span>
              {!isSystemTheme && isDark && (
                <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};