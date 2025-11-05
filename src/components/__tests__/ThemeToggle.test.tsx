import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeToggle } from '../ThemeToggle';

// Mock useTheme hook
vi.mock('../../hooks/useTheme', () => ({
  useTheme: vi.fn()
}));

import { useTheme } from '../../hooks/useTheme';

describe('ThemeToggle', () => {
  const mockToggleTheme = vi.fn();
  const mockSetSystemTheme = vi.fn();
  let mockUseTheme: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUseTheme = vi.mocked(useTheme);
    mockUseTheme.mockReturnValue({
      toggleTheme: mockToggleTheme,
      setSystemTheme: mockSetSystemTheme,
      isDark: false,
      theme: 'light'
    });

    // Clear localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Button Rendering', () => {
    it('renders theme toggle button', () => {
      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      expect(button).toBeDefined();
    });

    it('displays sun icon when theme is light', () => {
      mockUseTheme.mockReturnValue({
        toggleTheme: mockToggleTheme,
        setSystemTheme: mockSetSystemTheme,
        isDark: false,
        theme: 'light'
      });

      render(<ThemeToggle />);
      
      // Sun icon should be present
      const button = screen.getByTitle('Theme settings');
      expect(button).toBeDefined();
    });

    it('displays moon icon when theme is dark', () => {
      mockUseTheme.mockReturnValue({
        toggleTheme: mockToggleTheme,
        setSystemTheme: mockSetSystemTheme,
        isDark: true,
        theme: 'dark'
      });

      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      expect(button).toBeDefined();
    });

    it('displays theme text on larger screens', () => {
      render(<ThemeToggle />);
      
      expect(screen.getByText('Theme')).toBeDefined();
    });
  });

  describe('Dropdown Menu', () => {
    it('does not show dropdown initially', () => {
      render(<ThemeToggle />);
      
      // Dropdown should not be visible initially
      expect(screen.queryByText('System')).toBeNull();
    });

    it('shows dropdown when button clicked', async () => {
      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('System')).toBeDefined();
        expect(screen.getByText('Light')).toBeDefined();
        expect(screen.getByText('Dark')).toBeDefined();
      });
    });

    it('toggles dropdown visibility on button click', async () => {
      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      
      // Open dropdown
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('System')).toBeDefined();
      });
      
      // Close dropdown
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByText('System')).toBeNull();
      });
    });

    it('closes dropdown when clicking outside', async () => {
      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('System')).toBeDefined();
      });
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      await waitFor(() => {
        expect(screen.queryByText('System')).toBeNull();
      });
    });
  });

  describe('Theme Selection', () => {
    it('calls setSystemTheme when System option clicked', async () => {
      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('System')).toBeDefined();
      });
      
      const systemButton = screen.getByText('System').closest('button');
      fireEvent.click(systemButton!);
      
      expect(mockSetSystemTheme).toHaveBeenCalledTimes(1);
    });

    it('closes dropdown after selecting System theme', async () => {
      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('System')).toBeDefined();
      });
      
      const systemButton = screen.getByText('System').closest('button');
      fireEvent.click(systemButton!);
      
      await waitFor(() => {
        expect(screen.queryByText('System')).toBeNull();
      });
    });

    it('calls toggleTheme when switching from dark to light', async () => {
      mockUseTheme.mockReturnValue({
        toggleTheme: mockToggleTheme,
        setSystemTheme: mockSetSystemTheme,
        isDark: true,
        theme: 'dark'
      });

      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Light')).toBeDefined();
      });
      
      const lightButton = screen.getByText('Light').closest('button');
      fireEvent.click(lightButton!);
      
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('does not call toggleTheme when already in light mode', async () => {
      mockUseTheme.mockReturnValue({
        toggleTheme: mockToggleTheme,
        setSystemTheme: mockSetSystemTheme,
        isDark: false,
        theme: 'light'
      });

      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Light')).toBeDefined();
      });
      
      const lightButton = screen.getByText('Light').closest('button');
      fireEvent.click(lightButton!);
      
      expect(mockToggleTheme).not.toHaveBeenCalled();
    });

    it('calls toggleTheme when switching from light to dark', async () => {
      mockUseTheme.mockReturnValue({
        toggleTheme: mockToggleTheme,
        setSystemTheme: mockSetSystemTheme,
        isDark: false,
        theme: 'light'
      });

      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeDefined();
      });
      
      const darkButton = screen.getByText('Dark').closest('button');
      fireEvent.click(darkButton!);
      
      expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('does not call toggleTheme when already in dark mode', async () => {
      mockUseTheme.mockReturnValue({
        toggleTheme: mockToggleTheme,
        setSystemTheme: mockSetSystemTheme,
        isDark: true,
        theme: 'dark'
      });

      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Dark')).toBeDefined();
      });
      
      const darkButton = screen.getByText('Dark').closest('button');
      fireEvent.click(darkButton!);
      
      expect(mockToggleTheme).not.toHaveBeenCalled();
    });
  });

  describe('Active Theme Indicator', () => {
    it('shows indicator on System when no theme in localStorage', async () => {
      localStorage.removeItem('theme');
      
      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        const systemButton = screen.getByText('System').closest('button');
        const indicator = systemButton?.querySelector('.bg-blue-600');
        expect(indicator).toBeDefined();
      });
    });

    it('highlights Light option when light theme is active', async () => {
      localStorage.setItem('theme', 'light');
      mockUseTheme.mockReturnValue({
        toggleTheme: mockToggleTheme,
        setSystemTheme: mockSetSystemTheme,
        isDark: false,
        theme: 'light'
      });

      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        const lightButton = screen.getByText('Light').closest('button');
        expect(lightButton?.className).toContain('bg-gray-100');
      });
    });

    it('highlights Dark option when dark theme is active', async () => {
      localStorage.setItem('theme', 'dark');
      mockUseTheme.mockReturnValue({
        toggleTheme: mockToggleTheme,
        setSystemTheme: mockSetSystemTheme,
        isDark: true,
        theme: 'dark'
      });

      render(<ThemeToggle />);
      
      const button = screen.getByTitle('Theme settings');
      fireEvent.click(button);
      
      await waitFor(() => {
        const darkButton = screen.getByText('Dark').closest('button');
        expect(darkButton?.className).toContain('bg-gray-100');
      });
    });
  });

  describe('Cleanup', () => {
    it('removes event listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<ThemeToggle />);
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });
  });
});
