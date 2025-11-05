import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminLogin } from '../AdminLogin';
import * as useAdminAuth from '../../hooks/useAdminAuthHook';
// Mock supabase calls used by AdminLogin to check admin email
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { is_admin: true }, error: null })
          })
        })
      })
    })
  }
}));

// Mock the useAdminAuth hook
vi.mock('../../hooks/useAdminAuthHook', () => ({
  useAdminAuth: vi.fn(),
}));

describe('AdminLogin Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAdminAuth.useAdminAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
    });
  });
  it('renders magic-link form with correct elements', () => {
    render(<AdminLogin />);

    expect(screen.getByText('Admin Portal')).toBeDefined();
    expect(screen.getByText('Sign in with a magic link sent to your email')).toBeDefined();
    expect(screen.getByPlaceholderText('Admin Email Address')).toBeDefined();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeDefined();
  });

  it('updates email input when typing', async () => {
    const user = userEvent.setup();
    render(<AdminLogin />);

    const emailInput = screen.getByPlaceholderText('Admin Email Address') as HTMLInputElement;
    await user.type(emailInput, 'admin@example.com');

    expect(emailInput.value).toBe('admin@example.com');
  });

  it('shows loading state while sending magic link', async () => {
    const user = userEvent.setup();
    const sendMagicLink = vi.fn(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
    (useAdminAuth.useAdminAuth as ReturnType<typeof vi.fn>).mockReturnValue({ sendMagicLink });

    render(<AdminLogin />);

    const emailInput = screen.getByPlaceholderText('Admin Email Address');
    const submitButton = screen.getByRole('button', { name: /send magic link/i });

    await user.type(emailInput, 'admin@example.com');
    await user.click(submitButton);

    expect(screen.getByText('Sending magic link...')).toBeDefined();

    await waitFor(() => {
      expect(screen.queryByText('Sending magic link...')).toBeNull();
    });
  });
});
