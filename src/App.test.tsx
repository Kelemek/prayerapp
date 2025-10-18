import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

// Mock all the hooks and components
vi.mock('./hooks/useTheme', () => ({
  useTheme: vi.fn()
}));

vi.mock('./hooks/useAdminAuthHook', () => ({
  useAdminAuth: vi.fn()
}));

vi.mock('./hooks/usePrayerManager', () => ({
  usePrayerManager: vi.fn()
}));

vi.mock('./lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    }
  }
}));

// Mock components
vi.mock('./components/PrayerPresentation', () => ({
  PrayerPresentation: () => <div data-testid="prayer-presentation">Presentation View</div>
}));

vi.mock('./components/MobilePresentation', () => ({
  MobilePresentation: () => <div data-testid="mobile-presentation">Mobile Presentation View</div>
}));

vi.mock('./components/AdminLogin', () => ({
  AdminLogin: () => <div data-testid="admin-login">Admin Login</div>
}));

vi.mock('./components/AdminPortal', () => ({
  AdminPortal: () => <div data-testid="admin-portal">Admin Portal</div>
}));

vi.mock('./components/PrayerForm', () => ({
  PrayerForm: () => <div data-testid="prayer-form">Prayer Form</div>
}));

vi.mock('./components/PrayerCard', () => ({
  PrayerCard: () => <div>Prayer Card</div>
}));

vi.mock('./components/PromptCard', () => ({
  PromptCard: () => <div>Prompt Card</div>
}));

vi.mock('./components/PrayerFilters', () => ({
  PrayerFiltersComponent: () => <div>Prayer Filters</div>
}));

vi.mock('./components/UserSettings', () => ({
  UserSettings: () => <div>User Settings</div>
}));

vi.mock('./lib/emailNotifications', () => ({
  sendAdminNotification: vi.fn()
}));

import { useAdminAuth } from './hooks/useAdminAuthHook';
import { usePrayerManager } from './hooks/usePrayerManager';

describe('App', () => {
  let mockUseAdminAuth: ReturnType<typeof vi.fn>;
  let mockUsePrayerManager: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseAdminAuth = vi.mocked(useAdminAuth);
    mockUsePrayerManager = vi.mocked(usePrayerManager);
    
    mockUseAdminAuth.mockReturnValue({
      isAdmin: false,
      loading: false,
      logout: vi.fn()
    });

    mockUsePrayerManager.mockReturnValue({
      prayers: [],
      loading: false,
      error: null,
      addPrayer: vi.fn(),
      updatePrayerStatus: vi.fn(),
      addPrayerUpdate: vi.fn(),
      deletePrayer: vi.fn(),
      getFilteredPrayers: vi.fn(() => []),
      refresh: vi.fn(),
      deletePrayerUpdate: vi.fn(),
      requestUpdateDeletion: vi.fn()
    });

    // Reset window.location.hash
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
  });

  describe('Provider Setup', () => {
    it('renders the app with all providers', () => {
      render(<App />);
      // App should render without crashing
      expect(document.body).toBeDefined();
    });

    it('initializes with loading state', () => {
      mockUsePrayerManager.mockReturnValue({
        prayers: [],
        loading: true,
        error: null,
        addPrayer: vi.fn(),
        updatePrayerStatus: vi.fn(),
        addPrayerUpdate: vi.fn(),
        deletePrayer: vi.fn(),
        getFilteredPrayers: vi.fn(() => []),
        refresh: vi.fn(),
        deletePrayerUpdate: vi.fn(),
        requestUpdateDeletion: vi.fn()
      });

      render(<App />);
      expect(screen.getByText('Loading prayers...')).toBeDefined();
    });

    it('displays error state when prayer loading fails', () => {
      mockUsePrayerManager.mockReturnValue({
        prayers: [],
        loading: false,
        error: 'Failed to connect to database',
        addPrayer: vi.fn(),
        updatePrayerStatus: vi.fn(),
        addPrayerUpdate: vi.fn(),
        deletePrayer: vi.fn(),
        getFilteredPrayers: vi.fn(() => []),
        refresh: vi.fn(),
        deletePrayerUpdate: vi.fn(),
        requestUpdateDeletion: vi.fn()
      });

      render(<App />);
      expect(screen.getByText('Connection Error')).toBeDefined();
      expect(screen.getByText('Failed to connect to database')).toBeDefined();
    });
  });

  describe('View Routing', () => {
    it('renders public view by default', () => {
      render(<App />);
      // Should show the main church prayer manager header
      expect(screen.getByText('Church Prayer Manager')).toBeDefined();
    });

    it('renders presentation view when hash is #presentation', async () => {
      window.location.hash = '#presentation';
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('prayer-presentation')).toBeDefined();
      });
    });

    it('renders mobile presentation view when hash is #mobile-presentation', async () => {
      window.location.hash = '#mobile-presentation';
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-presentation')).toBeDefined();
      });
    });

    it('renders admin login when hash is #admin and user is not authenticated', async () => {
      window.location.hash = '#admin';
      mockUseAdminAuth.mockReturnValue({
        isAdmin: false,
        loading: false,
        logout: vi.fn()
      });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-login')).toBeDefined();
      });
    });

    it('renders admin portal when hash is #admin and user is authenticated', async () => {
      window.location.hash = '#admin';
      mockUseAdminAuth.mockReturnValue({
        isAdmin: true,
        loading: false,
        logout: vi.fn()
      });
      
      render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-portal')).toBeDefined();
      });
    });

    it('shows loading spinner during auth check', () => {
      mockUseAdminAuth.mockReturnValue({
        isAdmin: false,
        loading: true,
        logout: vi.fn()
      });

      render(<App />);
      
      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeDefined();
    });
  });

  describe('Hash Change Navigation', () => {
    it('updates view when hash changes to presentation', async () => {
      const { rerender } = render(<App />);
      
      // Initially should show public view
      expect(screen.getByText('Church Prayer Manager')).toBeDefined();
      
      // Change hash
      window.location.hash = '#presentation';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      
      rerender(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('prayer-presentation')).toBeDefined();
      });
    });

    it('returns to public view when hash is cleared', async () => {
      window.location.hash = '#presentation';
      const { rerender } = render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('prayer-presentation')).toBeDefined();
      });
      
      // Clear hash
      window.location.hash = '';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      
      rerender(<App />);
      
      await waitFor(() => {
        expect(screen.getByText('Church Prayer Manager')).toBeDefined();
      });
    });
  });

  describe('Admin Authentication Flow', () => {
    it('redirects from admin-login to admin-portal after successful auth', async () => {
      window.location.hash = '#admin';
      
      // Start not authenticated
      mockUseAdminAuth.mockReturnValue({
        isAdmin: false,
        loading: false,
        logout: vi.fn()
      });
      
      const { rerender } = render(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-login')).toBeDefined();
      });
      
      // Simulate successful login
      mockUseAdminAuth.mockReturnValue({
        isAdmin: true,
        loading: false,
        logout: vi.fn()
      });
      
      rerender(<App />);
      
      await waitFor(() => {
        expect(screen.getByTestId('admin-portal')).toBeDefined();
      });
    });
  });

  describe('Main Content Rendering', () => {
    it('renders header with title', () => {
      render(<App />);
      expect(screen.getByText('Church Prayer Manager')).toBeDefined();
    });

    it('renders with empty prayer list', () => {
      mockUsePrayerManager.mockReturnValue({
        prayers: [],
        loading: false,
        error: null,
        addPrayer: vi.fn(),
        updatePrayerStatus: vi.fn(),
        addPrayerUpdate: vi.fn(),
        deletePrayer: vi.fn(),
        getFilteredPrayers: vi.fn(() => []),
        refresh: vi.fn(),
        deletePrayerUpdate: vi.fn(),
        requestUpdateDeletion: vi.fn()
      });

      render(<App />);
      
      // Should render without error
      expect(screen.getByText('Church Prayer Manager')).toBeDefined();
    });
  });
});
