/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AdminAuthContext, type AdminAuthContextType } from '../../contexts/AdminAuthContext';

// Ensure no persisted session state interferes with tests
if (typeof sessionStorage !== 'undefined') {
  try {
    sessionStorage.clear();
  } catch {
    // sessionStorage may not be available at module-eval in some environments
  }
}

// We'll provide `AdminAuthContext` in tests instead of mocking the hook module
const defaultProviderValue: AdminAuthContextType = {
  isAdmin: true,
  user: null,
  sendMagicLink: vi.fn(async () => ({ success: true })),
  logout: vi.fn(async () => {}),
  loading: false
};

const renderWithProvider = (ui: React.ReactElement, value = defaultProviderValue) =>
  render(<AdminAuthContext.Provider value={value}>{ui}</AdminAuthContext.Provider>);

// Supabase mock with chainable API used in AdminLogin
const createMockChain = (resolveData: any = null, resolveError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError })
});

vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock');
  const createSupabaseMock = (mod as any).default ?? (mod as any).createSupabaseMock;
  const supabase = createSupabaseMock({ fromData: {} });
  return {
    supabase,
    handleSupabaseError: vi.fn((err: any) => err?.message || 'Unknown error')
  } as any;
});

import { supabase } from '../../lib/supabase';
import { AdminLogin } from '../AdminLogin';

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // Ensure default supabase.from is a mock that returns the base chain
    const baseChain = createMockChain();
    (supabase as any).from = vi.fn().mockReturnValue(baseChain as any);
  });

  it('renders and allows typing email', () => {
    renderWithProvider(<AdminLogin />);
    const input = screen.getByPlaceholderText('Admin Email Address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'admin@example.com' } });
    expect(input.value).toBe('admin@example.com');
  });

  it('disables submit while loading and re-enables after flow', async () => {
    const chain = createMockChain({ is_admin: true }, null);
    (supabase as any).from = vi.fn().mockReturnValue(chain as any);
    renderWithProvider(<AdminLogin />);
    const input = screen.getByPlaceholderText('Admin Email Address');
    fireEvent.change(input, { target: { value: 'admin@example.com' } });

    const button = screen.getByRole('button', { name: /send magic link/i });
    fireEvent.click(button);

    // Loading state shows spinner text; button disabled
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    // After success it should show success UI with email
    await waitFor(() => {
      expect(screen.getByText(/Magic Link Sent!/i)).toBeInTheDocument();
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    });
  });

  it('shows error when email is not an admin', async () => {
    const chain = createMockChain(null, null); // maybeSingle resolves to { data: null }
    (supabase as any).from = vi.fn().mockReturnValue(chain as any);

    renderWithProvider(<AdminLogin />);
    fireEvent.change(screen.getByPlaceholderText('Admin Email Address'), { target: { value: 'user@noadmin.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/does not have admin access/i)).toBeInTheDocument();
    });
  });

  it('shows generic error when admin check returns error', async () => {
    const chain = createMockChain(null, { message: 'db error' });
    (supabase as any).from = vi.fn().mockReturnValue(chain as any);

    renderWithProvider(<AdminLogin />);
    fireEvent.change(screen.getByPlaceholderText('Admin Email Address'), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/an error occurred/i)).toBeInTheDocument();
    });
  });

  it('success path sets sessionStorage and renders success UI', async () => {
    const chain = createMockChain({ is_admin: true }, null);
    (supabase as any).from = vi.fn().mockReturnValue(chain as any);

    renderWithProvider(<AdminLogin />);
    fireEvent.change(screen.getByPlaceholderText('Admin Email Address'), { target: { value: 'admin@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('magic_link_sent')).toBe('true');
      expect(sessionStorage.getItem('magic_link_email')).toBe('admin@example.com');
      expect(screen.getByText(/Magic Link Sent!/i)).toBeInTheDocument();
    });
  });

  it('restores success state from sessionStorage on mount', async () => {
    sessionStorage.setItem('magic_link_sent', 'true');
    sessionStorage.setItem('magic_link_email', 'saved@admin.com');
    renderWithProvider(<AdminLogin />);

    await waitFor(() => {
      expect(screen.getByText(/Magic Link Sent!/i)).toBeInTheDocument();
      expect(screen.getByText('saved@admin.com')).toBeInTheDocument();
    });
  });

  it('allows switching to a different email from success view', async () => {
    sessionStorage.setItem('magic_link_sent', 'true');
    sessionStorage.setItem('magic_link_email', 'saved@admin.com');
    renderWithProvider(<AdminLogin />);

    await waitFor(() => screen.getByText(/Magic Link Sent!/i));
    fireEvent.click(screen.getByRole('button', { name: /send to a different email/i }));

    // Back to form view
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Admin Email Address') as HTMLInputElement;
    expect(input.value).toBe('');
  });


  });

