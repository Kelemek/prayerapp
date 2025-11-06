import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPortal } from '../AdminPortal';

// Mock the hooks
vi.mock('../../hooks/useAdminData', () => ({
  useAdminData: vi.fn()
}));

vi.mock('../../hooks/useAdminAuthHook', () => ({
  useAdminAuth: vi.fn()
}));

// Mock Supabase with an inline chain (vi.mock factories are hoisted so avoid referencing
// external variables from inside the factory)
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: async () => ({ data: [], error: null })
          }),
          order: async () => ({ data: [], error: null })
        }),
        gte: async () => ({ count: 0 }),
        order: async () => ({ data: [], error: null })
      }),
      // allow other chains to safely call order/limit/single/maybeSingle
      order: async () => ({ data: [], error: null }),
      limit: async () => ({ data: [], error: null }),
      single: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: null, error: null })
    })
  }
}));

// Mock email notifications
vi.mock('../../lib/emailNotifications', () => ({
  sendApprovedPreferenceChangeNotification: vi.fn(),
  sendDeniedPreferenceChangeNotification: vi.fn()
}));

// Mock dev seed
vi.mock('../../lib/devSeed', () => ({
  seedDummyPrayers: vi.fn(() => Promise.resolve()),
  cleanupDummyPrayers: vi.fn(() => Promise.resolve())
}));

// Mock child components
vi.mock('../DeletionStyleCard', () => ({
  DeletionStyleCard: () => <div data-testid="deletion-style-card">Deletion Style Card</div>
}));

vi.mock('../PendingPrayerCard', () => ({
  PendingPrayerCard: ({ prayer }: { prayer: { id: string } }) => (
    <div data-testid={`pending-prayer-${prayer.id}`}>Pending Prayer Card</div>
  )
}));

vi.mock('../PendingUpdateCard', () => ({
  PendingUpdateCard: ({ update }: { update: { id: string } }) => (
    <div data-testid={`pending-update-${update.id}`}>Pending Update Card</div>
  )
}));

vi.mock('../PendingDeletionCard', () => ({
  PendingDeletionCard: () => <div>Pending Deletion Card</div>
}));

vi.mock('../PendingStatusChangeCard', () => ({
  PendingStatusChangeCard: () => <div>Pending Status Change Card</div>
}));

vi.mock('../PendingPreferenceChangeCard', () => ({
  PendingPreferenceChangeCard: () => <div>Pending Preference Change Card</div>
}));

vi.mock('../PasswordChange', () => ({
  PasswordChange: () => <div data-testid="password-change">Password Change</div>
}));

vi.mock('../EmailSettings', () => ({
  EmailSettings: () => <div data-testid="email-settings">Email Settings</div>
}));

vi.mock('../EmailSubscribers', () => ({
  EmailSubscribers: () => <div data-testid="email-subscribers">Email Subscribers</div>
}));

vi.mock('../PrayerSearch', () => ({
  PrayerSearch: () => <div data-testid="prayer-search">Prayer Search</div>
}));

vi.mock('../BackupStatus', () => ({
  default: () => <div data-testid="backup-status">Backup Status</div>
}));

vi.mock('../PromptManager', () => ({
  PromptManager: () => <div data-testid="prompt-manager">Prompt Manager</div>
}));

vi.mock('../PrayerTypesManager', () => ({
  PrayerTypesManager: () => <div data-testid="prayer-types-manager">Prayer Types Manager</div>
}));

import { useAdminData } from '../../hooks/useAdminData';
import { useAdminAuth } from '../../hooks/useAdminAuthHook';

describe('AdminPortal', () => {
  const mockUseAdminData = vi.mocked(useAdminData);
  const mockUseAdminAuth = vi.mocked(useAdminAuth);

  const defaultAdminData = {
    pendingPrayers: [],
    pendingUpdates: [],
    pendingDeletionRequests: [],
    pendingStatusChangeRequests: [],
    pendingUpdateDeletionRequests: [],
    approvedPrayers: [],
    approvedUpdates: [],
    deniedPrayers: [],
    deniedUpdates: [],
    deniedStatusChangeRequests: [],
    deniedDeletionRequests: [],
    deniedUpdateDeletionRequests: [],
    deniedPreferenceChanges: [],
    approvedPrayersCount: 0,
    approvedUpdatesCount: 0,
    deniedPrayersCount: 0,
    deniedUpdatesCount: 0,
    loading: false,
    error: null,
    approvePrayer: vi.fn(),
    denyPrayer: vi.fn(),
    approveUpdate: vi.fn(),
    denyUpdate: vi.fn(),
    editUpdate: vi.fn(),
    approveDeletionRequest: vi.fn(),
    denyDeletionRequest: vi.fn(),
    approveStatusChangeRequest: vi.fn(),
    denyStatusChangeRequest: vi.fn(),
    approveUpdateDeletionRequest: vi.fn(),
    denyUpdateDeletionRequest: vi.fn(),
    editPrayer: vi.fn(),
    refresh: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAdminData.mockReturnValue(defaultAdminData);
    
    mockUseAdminAuth.mockReturnValue({
      isAdmin: true,
      loading: false,
      user: null,
      sendMagicLink: vi.fn(),
      logout: vi.fn()
    });
  });

  describe('Loading State', () => {
    it('displays loading spinner when data is loading', () => {
      mockUseAdminData.mockReturnValue({
        ...defaultAdminData,
        loading: true
      });

      render(<AdminPortal />);
      
      expect(screen.getByText('Loading admin portal...')).toBeDefined();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeDefined();
    });
  });

  describe('Header and Navigation', () => {
    it('renders admin portal header', () => {
      render(<AdminPortal />);
      
      expect(screen.getByText('Admin Portal')).toBeDefined();
      expect(screen.getByText('Manage prayer requests and updates')).toBeDefined();
    });

    it('has back to main page button', () => {
      render(<AdminPortal />);
      
      const backButton = screen.getByText('Back to Main Page');
      expect(backButton).toBeDefined();
    });

    it('navigates back to main page when back button clicked', () => {
      const originalHash = window.location.hash;
      window.location.hash = '#admin';
      
      render(<AdminPortal />);
      
      const backButton = screen.getByText('Back to Main Page');
      fireEvent.click(backButton);
      
      expect(window.location.hash).toBe('');
      
      // Restore
      window.location.hash = originalHash;
    });
  });

  describe('Stats Display', () => {
    it('displays pending prayers count', () => {
      mockUseAdminData.mockReturnValue({
        ...defaultAdminData,
        pendingPrayers: [
          { id: '1', title: 'Prayer 1' },
          { id: '2', title: 'Prayer 2' }
        ] as any
      });

      render(<AdminPortal />);
      
      expect(screen.getByText('2')).toBeDefined();
      expect(screen.getByText('Prayers')).toBeDefined();
    });

    it('displays pending updates count', () => {
      mockUseAdminData.mockReturnValue({
        ...defaultAdminData,
        pendingUpdates: [
          { id: '1', update_text: 'Update 1' },
          { id: '2', update_text: 'Update 2' },
          { id: '3', update_text: 'Update 3' }
        ] as any
      });

      render(<AdminPortal />);
      
      expect(screen.getByText('3')).toBeDefined();
      expect(screen.getByText('Updates')).toBeDefined();
    });


  });

  describe('Tab Navigation', () => {
    it('starts with prayers tab active by default', () => {
      render(<AdminPortal />);
      
      const prayersButton = screen.getByText('Prayers').closest('button');
      expect(prayersButton?.className).toContain('ring-orange-500');
    });

    it('switches to updates tab when clicked', async () => {
      render(<AdminPortal />);
      
      const updatesButton = screen.getByText('Updates').closest('button');
      fireEvent.click(updatesButton!);
      
      await waitFor(() => {
        expect(updatesButton?.className).toContain('ring-blue-500');
      });
    });

    it('switches to deletions tab when clicked', async () => {
      render(<AdminPortal />);
      
      const deletionsButton = screen.getByText('Deletions').closest('button');
      fireEvent.click(deletionsButton!);
      
      await waitFor(() => {
        expect(deletionsButton?.className).toContain('ring-red-500');
      });
    });

    it('switches to settings tab when clicked', async () => {
      render(<AdminPortal />);
      
      const settingsButton = screen.getByText('Settings').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        expect(settingsButton?.className).toContain('ring-gray-500');
      });
    });

    it('has settings button with gray color scheme', () => {
      render(<AdminPortal />);
      
      const settingsButton = screen.getByText('Settings').closest('button');
      const settingsIcon = settingsButton?.querySelector('svg');
      
      expect(settingsIcon?.classList).toContain('text-gray-600');
    });
  });

  describe('Prayer Management', () => {
    it('displays pending prayers when on prayers tab', () => {
      mockUseAdminData.mockReturnValue({
        ...defaultAdminData,
        pendingPrayers: [
          { id: 'prayer-1', title: 'Test Prayer' }
        ] as any
      });

      render(<AdminPortal />);
      
      expect(screen.getByTestId('pending-prayer-prayer-1')).toBeDefined();
    });

    it('shows empty state when no pending prayers', () => {
      mockUseAdminData.mockReturnValue({
        ...defaultAdminData,
        pendingPrayers: []
      });

      render(<AdminPortal />);
      
      expect(screen.getByText('No pending prayer requests')).toBeDefined();
    });
  });

  describe('Update Management', () => {
    it('displays pending updates when on updates tab', async () => {
      mockUseAdminData.mockReturnValue({
        ...defaultAdminData,
        pendingUpdates: [
          { id: 'update-1', update_text: 'Test Update' }
        ] as any
      });

      render(<AdminPortal />);
      
      const updatesButton = screen.getByText('Updates').closest('button');
      fireEvent.click(updatesButton!);
      
      await waitFor(() => {
        expect(screen.getByTestId('pending-update-update-1')).toBeDefined();
      });
    });

    it('shows empty state when no pending updates', async () => {
      mockUseAdminData.mockReturnValue({
        ...defaultAdminData,
        pendingUpdates: []
      });

      render(<AdminPortal />);
      
      const updatesButton = screen.getByText('Updates').closest('button');
      fireEvent.click(updatesButton!);
      
      await waitFor(() => {
        expect(screen.getByText('No pending prayer updates')).toBeDefined();
      });
    });
  });

  describe('Settings Tab', () => {
    it('displays settings components when on settings tab', async () => {
      render(<AdminPortal />);
      
      const settingsButton = screen.getByText('Settings').closest('button');
      fireEvent.click(settingsButton!);
      
      // Check that the settings header is visible (child components are mocked elsewhere)
      await waitFor(() => {
        expect(screen.getByText('Admin Settings')).toBeDefined();
      });
    });

    it('displays prayer search in settings', async () => {
      render(<AdminPortal />);
      
      const settingsButton = screen.getByText('Settings').closest('button');
      fireEvent.click(settingsButton!);
      
      await waitFor(() => {
        expect(screen.getByTestId('prayer-search')).toBeDefined();
      });
    });
  });



  describe('Responsive Layout', () => {
    it('renders stats grid with proper layout classes', () => {
      render(<AdminPortal />);
      
      const statsGrid = document.querySelector('.grid.grid-cols-2');
      expect(statsGrid).toBeDefined();
      expect(statsGrid?.className).toContain('sm:grid-cols-3');
  expect(statsGrid?.className).toContain('md:grid-cols-5');
  expect(statsGrid?.className).toContain('gap-2');
  expect(statsGrid?.className).toContain('mb-8');
    });

    it('renders content within max-width container', () => {
      render(<AdminPortal />);
      
      const mainContainer = document.querySelector('main.max-w-6xl');
      expect(mainContainer).toBeDefined();
    });
  });
});
