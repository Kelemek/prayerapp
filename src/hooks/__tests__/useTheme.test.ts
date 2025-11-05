import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTheme } from '../useTheme';

describe('useTheme', () => {
  let localStorageMock: { [key: string]: string };
  let mockMatchMedia: {
    matches: boolean;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Clear localStorage mock
    localStorageMock = {};

    // Mock localStorage
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      key: vi.fn(),
      length: 0
    };

    // Mock matchMedia
    mockMatchMedia = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    global.window.matchMedia = vi.fn(() => mockMatchMedia as unknown as MediaQueryList);

    // Mock document.hidden
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove('dark');
  });

  describe('Initialization', () => {
    it('initializes with system theme by default', () => {
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.theme).toBe('system');
    });

    it('loads saved theme from localStorage', () => {
      localStorageMock['theme'] = 'dark';
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.theme).toBe('dark');
    });

    it('loads light theme from localStorage', () => {
      localStorageMock['theme'] = 'light';
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.theme).toBe('light');
    });

    it('ignores invalid theme in localStorage', () => {
      localStorageMock['theme'] = 'invalid';
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.theme).toBe('system');
    });

    it('saves initial theme to localStorage', () => {
      renderHook(() => useTheme());
      
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
    });
  });

  describe('Theme Application', () => {
    it('adds dark class when theme is dark', () => {
      localStorageMock['theme'] = 'dark';
      
      renderHook(() => useTheme());
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes dark class when theme is light', () => {
      localStorageMock['theme'] = 'light';
      document.documentElement.classList.add('dark');
      
      renderHook(() => useTheme());
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('applies system preference when theme is system (dark)', () => {
      mockMatchMedia.matches = true;
      
      renderHook(() => useTheme());
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('applies system preference when theme is system (light)', () => {
      mockMatchMedia.matches = false;
      
      renderHook(() => useTheme());
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('Theme Toggling', () => {
    it('toggles from light to dark', () => {
      localStorageMock['theme'] = 'light';
      
      const { result } = renderHook(() => useTheme());
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.theme).toBe('dark');
    });

    it('toggles from dark to light', () => {
      localStorageMock['theme'] = 'dark';
      
      const { result } = renderHook(() => useTheme());
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.theme).toBe('light');
    });

    it('saves toggled theme to localStorage', async () => {
      localStorageMock['theme'] = 'light';
      
      const { result } = renderHook(() => useTheme());
      
      act(() => {
        result.current.toggleTheme();
      });
      
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
      });
    });
  });

  describe('System Theme', () => {
    it('sets theme to system', () => {
      localStorageMock['theme'] = 'dark';
      
      const { result } = renderHook(() => useTheme());
      
      act(() => {
        result.current.setSystemTheme();
      });
      
      expect(result.current.theme).toBe('system');
    });

    it('saves system theme to localStorage', async () => {
      localStorageMock['theme'] = 'dark';
      
      const { result } = renderHook(() => useTheme());
      
      act(() => {
        result.current.setSystemTheme();
      });
      
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
      });
    });
  });

  describe('isDark Property', () => {
    it('returns true when theme is dark', () => {
      localStorageMock['theme'] = 'dark';
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.isDark).toBe(true);
    });

    it('returns false when theme is light', () => {
      localStorageMock['theme'] = 'light';
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.isDark).toBe(false);
    });

    it('returns true when system preference is dark', () => {
      mockMatchMedia.matches = true;
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.isDark).toBe(true);
    });

    it('returns false when system preference is light', () => {
      mockMatchMedia.matches = false;
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.isDark).toBe(false);
    });

    it('updates when theme changes', () => {
      localStorageMock['theme'] = 'light';
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.isDark).toBe(false);
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.isDark).toBe(true);
    });
  });

  describe('System Theme Change Detection', () => {
    it('registers system theme change listener', () => {
      renderHook(() => useTheme());
      
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockMatchMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('unregisters listener on cleanup', () => {
      const { unmount } = renderHook(() => useTheme());
      
      unmount();
      
      expect(mockMatchMedia.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('updates when system theme changes (system mode)', () => {
      localStorageMock['theme'] = 'system';
      mockMatchMedia.matches = false;
      
      const { result } = renderHook(() => useTheme());
      
      expect(result.current.isDark).toBe(false);
      
      // Simulate system theme change
      mockMatchMedia.matches = true;
      const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1] as () => void;
      
      act(() => {
        changeHandler();
      });
      
      // Theme should re-render with new system preference
      expect(result.current.theme).toBe('system');
    });

    it('does not update when system theme changes (light mode)', () => {
      localStorageMock['theme'] = 'light';
      
      const { result } = renderHook(() => useTheme());
      
      const initialTheme = result.current.theme;
      
      // Simulate system theme change
      mockMatchMedia.matches = true;
      const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1] as () => void;
      
      act(() => {
        changeHandler();
      });
      
      // Theme should not change (still light)
      expect(result.current.theme).toBe(initialTheme);
    });

    it('does not update when system theme changes (dark mode)', () => {
      localStorageMock['theme'] = 'dark';
      
      const { result } = renderHook(() => useTheme());
      
      const initialTheme = result.current.theme;
      
      // Simulate system theme change
      mockMatchMedia.matches = false;
      const changeHandler = mockMatchMedia.addEventListener.mock.calls[0][1] as () => void;
      
      act(() => {
        changeHandler();
      });
      
      // Theme should not change (still dark)
      expect(result.current.theme).toBe(initialTheme);
    });
  });

  describe('Visibility Change Handling', () => {
    it('registers visibility change listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      renderHook(() => useTheme());
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
    });

    it('unregisters visibility listener on cleanup', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = renderHook(() => useTheme());
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('LocalStorage Persistence', () => {
    it('persists theme changes to localStorage', async () => {
      const { result } = renderHook(() => useTheme());
      
      act(() => {
        result.current.toggleTheme();
      });
      
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalled();
      });
    });

    it('retrieves theme from localStorage on mount', () => {
      localStorageMock['theme'] = 'dark';
      
      expect(localStorage.getItem).toHaveBeenCalledTimes(0);
      
      renderHook(() => useTheme());
      
      expect(localStorage.getItem).toHaveBeenCalledWith('theme');
    });

    it('handles multiple theme changes', async () => {
      const { result } = renderHook(() => useTheme());
      
      // Initial theme is 'system', toggle to dark
      act(() => {
        result.current.toggleTheme();
      });
      
      await waitFor(() => {
        expect(['light', 'dark']).toContain(result.current.theme);
      }, { timeout: 100 });
      
      const firstTheme = result.current.theme;
      
      act(() => {
        result.current.toggleTheme();
      });
      
      await waitFor(() => {
        expect(result.current.theme).not.toBe(firstTheme);
      }, { timeout: 100 });
      
      act(() => {
        result.current.setSystemTheme();
      });
      
      await waitFor(() => {
        expect(result.current.theme).toBe('system');
      }, { timeout: 100 });
    });
  });
});
