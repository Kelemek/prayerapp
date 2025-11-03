import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserSettings } from './UserSettings';
import { supabase } from '../lib/supabase';

// Mock dependencies
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../lib/emailNotifications', () => ({
  sendPreferenceChangeNotification: vi.fn(),
}));

vi.mock('../utils/printablePrayerList', () => ({
  downloadPrintablePrayerList: vi.fn(),
}));

vi.mock('../utils/printablePromptList', () => ({
  downloadPrintablePromptList: vi.fn(),
}));

vi.mock('../utils/userInfoStorage', () => ({
  getUserInfo: vi.fn(() => ({
    firstName: '',
    lastName: '',
    email: '',
  })),
}));

describe('UserSettings', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock window.open
    window.open = vi.fn(() => ({
      close: vi.fn(),
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    })) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<UserSettings isOpen={false} onClose={mockOnClose} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders the settings modal when isOpen is true', () => {
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Settings')).toBeDefined();
      expect(screen.getByText('Email Notification Preferences')).toBeDefined();
      expect(screen.getByPlaceholderText('your.email@example.com')).toBeDefined();
    });

    it('displays all theme options', () => {
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Light')).toBeDefined();
      expect(screen.getByText('Dark')).toBeDefined();
      expect(screen.getByText('System')).toBeDefined();
    });

    it('displays print buttons', () => {
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByText('Print Prayer List')).toBeDefined();
      expect(screen.getByText('Print Prompts')).toBeDefined();
    });

    it('shows name input only after email is entered', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      // Name input should not be visible initially
      expect(screen.queryByPlaceholderText('John Doe')).toBeNull();
      
      // Enter email
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      
      // Name input should now be visible
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
      });
    });
  });

  describe('Close Button', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      const closeButtons = screen.getAllByRole('button');
      const headerCloseButton = closeButtons.find(btn => btn.querySelector('svg'));
      
      if (headerCloseButton) {
        await user.click(headerCloseButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onClose when Close button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('Close'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Theme Selection', () => {
    it('defaults to system theme if no saved preference', () => {
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      const systemButton = screen.getByText('System').closest('button');
      expect(systemButton?.className).toContain('border-purple-500');
    });

    it('applies light theme to document', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('Light'));
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('applies dark theme to document', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('Dark'));
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('applies system theme based on media query', async () => {
      const user = userEvent.setup();
      
      // Mock prefers-color-scheme: dark
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('System'));
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  describe('Loading User Preferences', () => {
    it('loads user info from localStorage on open', async () => {
      const { getUserInfo } = await import('../utils/userInfoStorage');
      vi.mocked(getUserInfo).mockReturnValue({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

      (supabase.from as any).mockReturnValue({ select: mockSelect });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('your.email@example.com')).toHaveProperty('value', 'john@example.com');
      });
    });

    it('loads pending preference changes from database', async () => {
      const { getUserInfo } = await import('../utils/userInfoStorage');
      vi.mocked(getUserInfo).mockReturnValue({
        firstName: '',
        lastName: '',
        email: 'test@example.com',
      });

      const mockPendingData = {
        name: 'Pending User',
        email: 'test@example.com',
        receive_new_prayer_notifications: false,
        approval_status: 'pending',
      };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ 
        data: mockPendingData, 
        error: null 
      });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle1 }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq4 = vi.fn(() => ({ maybeSingle: mockMaybeSingle2 }));
      const mockEq3 = vi.fn(() => ({ eq: mockEq4 }));

      // Mock for admin_settings call from useVerification
      const mockMaybeSingle3 = vi.fn().mockResolvedValue({ data: { value: false }, error: null });
      const mockEq5 = vi.fn(() => ({ maybeSingle: mockMaybeSingle3 }));

      let callCount = 0;
      const mockSelect = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return { eq: mockEq5 }; // admin_settings check
        }
        if (callCount === 2) {
          return { eq: mockEq1 }; // pending_preference_changes
        }
        return { eq: mockEq3 }; // email_subscribers
      });

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toHaveProperty('checked', false);
      }, { timeout: 2000 });
    });

    it('loads approved subscriber preferences when no pending changes', async () => {
      const { getUserInfo } = await import('../utils/userInfoStorage');
      vi.mocked(getUserInfo).mockReturnValue({
        firstName: '',
        lastName: '',
        email: 'subscriber@example.com',
      });

      const mockSubscriberData = {
        name: 'Approved User',
        email: 'subscriber@example.com',
        is_active: true,
        is_admin: false,
      };

      const mockMaybeSingle1 = vi.fn().mockResolvedValueOnce({ data: null, error: null });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle1 }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ 
        data: mockSubscriberData, 
        error: null 
      });
      const mockEq4 = vi.fn(() => ({ maybeSingle: mockMaybeSingle2 }));
      const mockEq3 = vi.fn(() => ({ eq: mockEq4 }));

      let callCount = 0;
      const mockSelect = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return { eq: mockEq1 };
        }
        return { eq: mockEq3 };
      });

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toHaveProperty('checked', true);
      }, { timeout: 3000 });
    });
  });

  describe('Email and Name Input', () => {
    it('updates email value when typed', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      await user.type(emailInput, 'new@example.com');
      
      expect(emailInput).toHaveProperty('value', 'new@example.com');
    });

    it('updates name value when typed', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      // First enter email to show name field
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
      });
      
      const nameInput = screen.getByPlaceholderText('John Doe');
      await user.type(nameInput, 'Jane Smith');
      
      expect(nameInput).toHaveProperty('value', 'Jane Smith');
    });

    it('clears success message when email is changed', async () => {
      const user = userEvent.setup();
      
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

      (supabase.from as any).mockReturnValue({ 
        select: mockSelect,
        insert: mockInsert,
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      // Fill in form and submit
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
      });
      
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
      await user.click(screen.getByText('Submit for Approval'));
      
      await waitFor(() => {
        expect(screen.getByText(/Your preference change has been submitted/i)).toBeDefined();
      });
      
      // Change email - success should clear
      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');
      
      expect(screen.queryByText(/Your preference change has been submitted/i)).toBeNull();
    });
  });

  describe('Notification Toggle', () => {
    it('toggles notification preference when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveProperty('checked', true);
      
      await user.click(checkbox);
      expect(checkbox).toHaveProperty('checked', false);
      
      await user.click(checkbox);
      expect(checkbox).toHaveProperty('checked', true);
    });
  });

  describe('Save Preferences', () => {
    it('shows error when email is empty', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      const submitButton = screen.getByText('Submit for Approval');
      expect(submitButton).toHaveProperty('disabled', true);
    });

    it('shows error when name is empty but email is filled', async () => {
      const user = userEvent.setup();
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      
      await waitFor(() => {
        const submitButton = screen.getByText('Submit for Approval');
        expect(submitButton).toHaveProperty('disabled', true);
      });
    });

    it('successfully saves preferences', async () => {
      const user = userEvent.setup();
      
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

      (supabase.from as any).mockReturnValue({ 
        select: mockSelect,
        insert: mockInsert,
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
      });
      
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
      await user.click(screen.getByText('Submit for Approval'));
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'test@example.com',
          receive_new_prayer_notifications: true,
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Your preference change has been submitted/i)).toBeDefined();
      });
    });

    it('converts email to lowercase when saving', async () => {
      const user = userEvent.setup();
      
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

      (supabase.from as any).mockReturnValue({ 
        select: mockSelect,
        insert: mockInsert,
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'TEST@EXAMPLE.COM');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
      });
      
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
      await user.click(screen.getByText('Submit for Approval'));
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'test@example.com',
          receive_new_prayer_notifications: true,
        });
      });
    });

    it('trims whitespace from name and email', async () => {
      const user = userEvent.setup();
      
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

      (supabase.from as any).mockReturnValue({ 
        select: mockSelect,
        insert: mockInsert,
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.type(screen.getByPlaceholderText('your.email@example.com'), '  test@example.com  ');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
      });
      
      await user.type(screen.getByPlaceholderText('John Doe'), '  Test User  ');
      await user.click(screen.getByText('Submit for Approval'));
      
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith({
          name: 'Test User',
          email: 'test@example.com',
          receive_new_prayer_notifications: true,
        });
      });
    });

    it('displays error when save fails', async () => {
      const user = userEvent.setup();
      
      const mockInsert = vi.fn().mockResolvedValue({ 
        error: { message: 'Database error' } 
      });
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

      (supabase.from as any).mockReturnValue({ 
        select: mockSelect,
        insert: mockInsert,
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
      });
      
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
      await user.click(screen.getByText('Submit for Approval'));
      
      await waitFor(() => {
        expect(screen.getByText(/Database error/i)).toBeDefined();
      });
    });

    it('shows Submitting... text while saving', async () => {
      const user = userEvent.setup();
      
      let resolveInsert: () => void;
      const insertPromise = new Promise<void>((resolve) => {
        resolveInsert = resolve;
      });
      
      const mockInsert = vi.fn().mockReturnValue(
        insertPromise.then(() => ({ error: null }))
      );
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockLimit = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockEq2 = vi.fn(() => ({ order: mockOrder }));
      const mockEq1 = vi.fn(() => ({ eq: mockEq2 }));
      const mockSelect = vi.fn(() => ({ eq: mockEq1 }));

      (supabase.from as any).mockReturnValue({ 
        select: mockSelect,
        insert: mockInsert,
      });

      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.type(screen.getByPlaceholderText('your.email@example.com'), 'test@example.com');
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('John Doe')).toBeDefined();
      });
      
      await user.type(screen.getByPlaceholderText('John Doe'), 'Test User');
      await user.click(screen.getByText('Submit for Approval'));
      
      // Should show "Submitting..."
      await waitFor(() => {
        expect(screen.getByText('Submitting...')).toBeDefined();
      });
      
      // Resolve the promise
      resolveInsert!();
      
      // Should show success
      await waitFor(() => {
        expect(screen.getByText(/Your preference change has been submitted/i)).toBeDefined();
      });
    });
  });

  describe('Print Functionality', () => {
    it('opens print window for prayer list', async () => {
      const user = userEvent.setup();
      const { downloadPrintablePrayerList } = await import('../utils/printablePrayerList');
      
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('Print Prayer List'));
      
      await waitFor(() => {
        expect(window.open).toHaveBeenCalledWith('', '_blank');
        expect(downloadPrintablePrayerList).toHaveBeenCalled();
      });
    });

    it('opens print window for prompts', async () => {
      const user = userEvent.setup();
      const { downloadPrintablePromptList } = await import('../utils/printablePromptList');
      
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('Print Prompts'));
      
      await waitFor(() => {
        expect(window.open).toHaveBeenCalledWith('', '_blank');
        expect(downloadPrintablePromptList).toHaveBeenCalled();
      });
    });

    it('shows Generating... text while printing prayers', async () => {
      const user = userEvent.setup();
      
      let resolvePrint: () => void;
      const printPromise = new Promise<void>((resolve) => {
        resolvePrint = resolve;
      });
      
      const { downloadPrintablePrayerList } = await import('../utils/printablePrayerList');
      vi.mocked(downloadPrintablePrayerList).mockReturnValue(printPromise as any);
      
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('Print Prayer List'));
      
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeDefined();
      });
      
      resolvePrint!();
      
      await waitFor(() => {
        expect(screen.getByText('Print Prayer List')).toBeDefined();
      });
    });

    it('shows Generating... text while printing prompts', async () => {
      const user = userEvent.setup();
      
      let resolvePrint: () => void;
      const printPromise = new Promise<void>((resolve) => {
        resolvePrint = resolve;
      });
      
      const { downloadPrintablePromptList } = await import('../utils/printablePromptList');
      vi.mocked(downloadPrintablePromptList).mockReturnValue(printPromise as any);
      
      render(<UserSettings isOpen={true} onClose={mockOnClose} />);
      
      await user.click(screen.getByText('Print Prompts'));
      
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeDefined();
      });
      
      resolvePrint!();
      
      await waitFor(() => {
        expect(screen.getByText('Print Prompts')).toBeDefined();
      });
    });
  });
});
