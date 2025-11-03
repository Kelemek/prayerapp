import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useVerification } from '../useVerification';

// Mock localStorage (simple in-file mock to control sessions)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Helper to create a supabase.from chain for admin_settings maybeSingle
const createAdminSettingsMock = (requireVerification: boolean | null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue(
    requireVerification === null ? { data: null } : { data: { require_email_verification: requireVerification } }
  )
});

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

import { supabase } from '../../lib/supabase';

describe('useVerification - edge function integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('requestCode returns null when verification is disabled', async () => {
    // admin setting returns null/disabled
    const mockChain = createAdminSettingsMock(false);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => useVerification());

    // Wait for effect to run and set isEnabled
    await waitFor(() => {
      expect(result.current.isEnabled).toBe(false);
    });

    const response = await result.current.requestCode('user@example.com', 'test', { foo: 'bar' });
    expect(response).toBeNull();
  });

  it('requestCode succeeds when enabled and edge function returns success', async () => {
    const mockChain = createAdminSettingsMock(true);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    // Mock successful edge function response
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: true, codeId: 'code-123', expiresAt: '2030-01-01T00:00:00Z' },
      error: null
    });

    const { result } = renderHook(() => useVerification());

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(true);
    });

    const resp = await result.current.requestCode('USER@EXAMPLE.COM', 'action', { x: 1 });

    expect(resp).toMatchObject({ codeId: 'code-123', expiresAt: '2030-01-01T00:00:00Z' });
    // verificationState should be set with normalized email (wait for state update)
    await waitFor(() => {
      expect(result.current.verificationState.email).toBe('user@example.com');
    });
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('requestCode throws when edge function returns error', async () => {
    const mockChain = createAdminSettingsMock(true);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Edge service failed' }
    });

    const { result } = renderHook(() => useVerification());

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(true);
    });

    await expect(result.current.requestCode('user@example.com', 'action', {})).rejects.toThrow();
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('verifyCode succeeds and saves verified session', async () => {
    const mockChain = createAdminSettingsMock(true);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { success: true, codeId: 'c1', expiresAt: '2030-01-01T00:00:00Z' },
      error: null
    });

    // Now mock verify-code call
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { success: true, actionType: 'doThing', actionData: { a: 1 }, email: 'me@ex.com' },
      error: null
    });

    const { result } = renderHook(() => useVerification());

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(true);
    });

    // Request code first to populate state
    const req = await result.current.requestCode('me@ex.COM', 'act', {});
    expect(req).not.toBeNull();

    const verified = await result.current.verifyCode('c1', '000000');
    expect(verified.actionType).toBe('doThing');
    expect(verified.email).toBe('me@ex.com');

    // localStorage should have a session saved
    const sessions = JSON.parse(localStorage.getItem('prayer_app_verified_sessions') || '[]');
    expect(sessions.length).toBeGreaterThan(0);
  });

  it('verifyCode throws when response is invalid', async () => {
    const mockChain = createAdminSettingsMock(true);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false, error: 'invalid' },
      error: null
    });

    const { result } = renderHook(() => useVerification());

    await waitFor(() => {
      expect(result.current.isEnabled).toBe(true);
    });

    await expect(result.current.verifyCode('bogus', '123456')).rejects.toThrow();
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
