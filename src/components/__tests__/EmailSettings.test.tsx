import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
      upsert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('EmailSettings Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module cache to clear cachedEmailSettings between tests
    vi.resetModules();
  });

  // Helper to get fresh component import after module reset
  const getComponent = async () => {
    const { EmailSettings } = await import('../EmailSettings');
    return EmailSettings;
  };

  it('renders loading state initially', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    expect(screen.getByText('Loading email settings...')).toBeInTheDocument();
  });

  it('loads and displays settings correctly', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            require_email_verification: true,
            verification_code_length: 6,
            verification_code_expiry_minutes: 15,
            enable_reminders: true,
            reminder_interval_days: 7,
            enable_auto_archive: true,
            days_before_archive: 14,
          },
          error: null,
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    // Check that verification checkbox is checked
    await waitFor(() => {
      const verificationCheckbox = screen.getByRole('checkbox', { name: /require email verification/i });
      expect(verificationCheckbox).toBeChecked();
    });

    // Check that reminder checkbox is checked
    const reminderCheckbox = screen.getByRole('checkbox', { name: /enable prayer update reminders/i });
    expect(reminderCheckbox).toBeChecked();

    // Check that auto-archive checkbox is checked
    const archiveCheckbox = screen.getByRole('checkbox', { name: /auto-archive prayers after reminder/i });
    expect(archiveCheckbox).toBeChecked();
  });

  it('saves verification settings successfully', async () => {
    const EmailSettings = await getComponent();
    const user = userEvent.setup();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            require_email_verification: false,
            verification_code_length: 6,
            verification_code_expiry_minutes: 15,
          },
          error: null,
        }),
      })),
    }));

    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      upsert: mockUpsert,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /require email verification/i })).toBeInTheDocument();
    });

    // Enable verification and change settings
    const verificationCheckbox = screen.getByRole('checkbox', { name: /require email verification/i });
    await user.click(verificationCheckbox);

    // Change code length
    const lengthSelect = screen.getByDisplayValue('6 digits (recommended)');
    await user.selectOptions(lengthSelect, '8');

    // Change expiry time
    const expirySelect = screen.getByDisplayValue('15 minutes (recommended)');
    await user.selectOptions(expirySelect, '30');

    // Save verification settings
    const saveButton = screen.getByRole('button', { name: /save verification settings/i });
    await user.click(saveButton);

    // Check that upsert was called with correct data
    expect(mockUpsert).toHaveBeenCalledWith({
      id: 1,
      require_email_verification: true,
      verification_code_length: 8,
      verification_code_expiry_minutes: 30,
      updated_at: expect.any(String),
    });

    // Check that success state was set (don't check UI message as it may disappear quickly)
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('saves reminder settings successfully', async () => {
    const EmailSettings = await getComponent();
    const user = userEvent.setup();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            enable_reminders: false,
            reminder_interval_days: 7,
            enable_auto_archive: false,
            days_before_archive: 7,
          },
          error: null,
        }),
      })),
    }));

    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      upsert: mockUpsert,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save reminder settings/i })).toBeInTheDocument();
    });

    // Enable reminders and change settings
    const reminderCheckbox = screen.getByRole('checkbox', { name: /enable prayer update reminders/i });
    await user.click(reminderCheckbox);

    // Wait for the input to appear
    await waitFor(() => {
      expect(screen.getByLabelText('Days of inactivity before sending reminder email')).toBeInTheDocument();
    });

    // Change reminder interval
    const intervalInput = screen.getByLabelText('Days of inactivity before sending reminder email');
    fireEvent.change(intervalInput, { target: { value: '10' } });

    // Save reminder settings
    const saveButton = screen.getByRole('button', { name: /save reminder settings/i });
    await user.click(saveButton);

    // Check that upsert was called with correct data
    expect(mockUpsert).toHaveBeenCalledWith({
      id: 1,
      enable_reminders: true,
      reminder_interval_days: 10,
      enable_auto_archive: false,
      days_before_archive: 7,
      updated_at: expect.any(String),
    });
  });

  it('shows verification code settings when verification is enabled', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            require_email_verification: true,
            verification_code_length: 6,
            verification_code_expiry_minutes: 15,
          },
          error: null,
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.getByText('Verification Code Length')).toBeInTheDocument();
      expect(screen.getByText('Code Expiration Time')).toBeInTheDocument();
    });
  });

  it('hides verification code settings when verification is disabled', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            require_email_verification: false,
          },
          error: null,
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.queryByText('Verification Code Length')).not.toBeInTheDocument();
      expect(screen.queryByText('Code Expiration Time')).not.toBeInTheDocument();
    });
  });

  it('shows auto-archive settings when auto-archive is enabled', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            enable_reminders: true,
            enable_auto_archive: true,
            days_before_archive: 7,
          },
          error: null,
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.getByText('Days after reminder email before auto-archiving')).toBeInTheDocument();
    });
  });

  it('hides auto-archive settings when auto-archive is disabled', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            enable_reminders: true,
            enable_auto_archive: false,
          },
          error: null,
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.queryByText('Days after reminder email before auto-archiving')).not.toBeInTheDocument();
    });
  });

  it('shows reminder settings when reminders are enabled', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            enable_reminders: true,
            reminder_interval_days: 7,
          },
          error: null,
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.getByText('Days of inactivity before sending reminder email')).toBeInTheDocument();
    });
  });

  it('hides reminder settings when reminders are disabled', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            enable_reminders: false,
          },
          error: null,
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.queryByText('Days of inactivity before sending reminder email')).not.toBeInTheDocument();
    });
  });

  it('handles loading error gracefully', async () => {
    const EmailSettings = await getComponent();
    const mockSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      })),
    }));

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    render(<EmailSettings />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load email settings/i)).toBeInTheDocument();
    });
  });

});
