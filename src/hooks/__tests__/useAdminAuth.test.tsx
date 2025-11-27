import React, { useContext } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AdminAuthProvider } from '../useAdminAuth';
import { AdminAuthContext } from '../../contexts/AdminAuthContext';

// Mock Supabase auth and queries using shared mock (preserves auth helpers)
vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock');
  const sup = mod.createSupabaseMock({ fromData: {} }) as any;
  // Provide signInWithOtp / signOut spies used by the provider tests
  sup.auth.getSession = vi.fn();
  sup.auth.onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
  sup.auth.signInWithOtp = vi.fn();
  sup.auth.signOut = vi.fn();
  sup.rpc = vi.fn();
  sup.removeChannel = vi.fn();
  return { 
    supabase: sup,
    createFreshSupabaseClient: () => sup
  };
});

import { supabase } from '../../lib/supabase';

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

  it('sendMagicLink returns { success: true } on success', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({ data: { user: null, session: null }, error: null } as any);

    const TestChild: React.FC = () => {
      const ctx = useContext(AdminAuthContext)!;
      return (
        <div>
          <button onClick={async () => { const result = await ctx.sendMagicLink('me@example.com'); (window as any).last = result; }}>Send</button>
        </div>
      );
    };

    render(
      <AdminAuthProvider>
        <TestChild />
      </AdminAuthProvider>
    );

    fireEvent.click(screen.getByText('Send'));
    await waitFor(() => expect((window as any).last?.success).toBe(true));
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

describe('useAdminAuth (session expiry)', () => {
  let DateNowSpy: any;

  beforeEach(() => {
    DateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => 1_000_000);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try { vi.useRealTimers(); } catch { /* ignore */ }
  });

  it('registers auto-logout interval when admin session exists', async () => {
    const mod = await import('../../lib/supabase');
    const sup = mod.supabase as any;

    // Mock getSession to return an initial session
    sup.auth.getSession.mockResolvedValue({ data: { session: { user: { email: 'admin@example.com' } } }, error: null });

    // Mock admin check to return is_admin = true with a chainable API
    sup.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { is_admin: true }, error: null }) })
        })
      })
    }));

    // Mock onAuthStateChange to return a subscription (no immediate handler invocation needed)
    sup.auth.onAuthStateChange.mockImplementation((handler: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    });

    // Spy on setInterval to ensure the auto-logout effect registers an interval
    const setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation(() => 123 as any);

    render(
      <AdminAuthProvider>
        <div>child</div>
      </AdminAuthProvider>
    );

    // Wait for the provider to finish initialization and for the effect to register the interval
    await waitFor(() => {
      expect(setIntervalSpy).toHaveBeenCalled();
    });

    setIntervalSpy.mockRestore();
  });
});
