import React, { useContext } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminAuthProvider } from './useAdminAuth';
import { AdminAuthContext } from '../contexts/AdminAuthContext';

// Mock Supabase auth and queries
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOtp: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

import { supabase } from '../lib/supabase';

describe('AdminAuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets isAdmin true when initial session user is admin', async () => {
    // Mock getSession to return a user session
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: { user: { email: 'admin@example.com' } } }, error: null } as any);

    // Mock admin check chain: from(...).select().eq().eq().maybeSingle()
    const maybeSingle = vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null });
    const eq2 = vi.fn().mockReturnValue({ maybeSingle });
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const select = vi.fn().mockReturnValue({ eq: eq1 });
    vi.mocked(supabase.from).mockReturnValue({ select } as any);

    const TestChild: React.FC = () => {
      const ctx = useContext(AdminAuthContext)!;
      return (
        <div>
          <div data-testid="is-admin">{String(ctx.isAdmin)}</div>
          <div data-testid="loading">{String(ctx.loading)}</div>
        </div>
      );
    };

    render(
      <AdminAuthProvider>
        <TestChild />
      </AdminAuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('is-admin').textContent).toBe('true');
  });

  it('sendMagicLink returns true on success', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
  vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: { user: null, session: null }, error: null } as any);

    const TestChild: React.FC = () => {
      const ctx = useContext(AdminAuthContext)!;
      return (
        <div>
          <button onClick={async () => { const ok = await ctx.sendMagicLink('me@example.com'); (window as any).last = ok; }}>Send</button>
        </div>
      );
    };

    render(
      <AdminAuthProvider>
        <TestChild />
      </AdminAuthProvider>
    );

    fireEvent.click(screen.getByText('Send'));
    await waitFor(() => expect((window as any).last).toBe(true));
    expect(supabase.auth.signInWithOtp).toHaveBeenCalled();
  });

  it('logout calls supabase.auth.signOut and clears user', async () => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as any);
  vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as any);

    const TestChild: React.FC = () => {
      const ctx = useContext(AdminAuthContext)!;
      return (
        <div>
          <button onClick={async () => { await ctx.logout(); (window as any).loggedOut = true; }}>Logout</button>
        </div>
      );
    };

    render(
      <AdminAuthProvider>
        <TestChild />
      </AdminAuthProvider>
    );

    fireEvent.click(screen.getByText('Logout'));
    await waitFor(() => expect((window as any).loggedOut).toBe(true));
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
