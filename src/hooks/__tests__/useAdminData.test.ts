import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminData } from '../useAdminData';
import { supabase } from '../../lib/supabase';

// Mock Supabase with a complete chain
const createMockChain = (resolveData: any = [], resolveError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  then: vi.fn((callback: any) => callback({ data: resolveData, error: resolveError }))
});

vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock')
  const sup = mod.createSupabaseMock({ fromData: {} }) as any
  sup.removeChannel = vi.fn()
  return { supabase: sup, handleSupabaseError: vi.fn((err: any) => err?.message || 'Unknown error') }
});

// Mock email notifications
vi.mock('../../lib/emailNotifications', () => ({
  sendApprovedPrayerNotification: vi.fn(),
  sendApprovedUpdateNotification: vi.fn(),
  sendDeniedPrayerNotification: vi.fn(),
  sendDeniedUpdateNotification: vi.fn(),
  sendRequesterApprovalNotification: vi.fn(),
  sendApprovedStatusChangeNotification: vi.fn(),
  sendDeniedStatusChangeNotification: vi.fn()
}));

describe('useAdminData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default successful responses for all queries
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAdminData());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('provides all required data arrays', () => {
    const { result } = renderHook(() => useAdminData());

    expect(result.current).toHaveProperty('pendingPrayers');
    expect(result.current).toHaveProperty('pendingUpdates');
    expect(result.current).toHaveProperty('pendingDeletionRequests');
    expect(result.current).toHaveProperty('pendingStatusChangeRequests');
    expect(result.current).toHaveProperty('approvedPrayers');
    expect(result.current).toHaveProperty('deniedPrayers');
  });

  it('provides approval functions', () => {
    const { result } = renderHook(() => useAdminData());

    expect(typeof result.current.approvePrayer).toBe('function');
    expect(typeof result.current.denyPrayer).toBe('function');
    expect(typeof result.current.approveUpdate).toBe('function');
    expect(typeof result.current.denyUpdate).toBe('function');
  });

  it('provides a refresh function', () => {
    const { result } = renderHook(() => useAdminData());

    expect(typeof result.current.refresh).toBe('function');
  });

  it('fetches data on mount', async () => {
    const { result } = renderHook(() => useAdminData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify supabase.from was called multiple times for different tables
    expect(supabase.from).toHaveBeenCalled();
  });

  it('calls supabase.from with prayers table', async () => {
    const { result } = renderHook(() => useAdminData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(supabase.from).toHaveBeenCalledWith('prayers');
  });

  it('calls supabase.from with prayer_updates table', async () => {
    const { result } = renderHook(() => useAdminData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(supabase.from).toHaveBeenCalledWith('prayer_updates');
  });

  it('provides counts for approved and denied items', async () => {
    const { result } = renderHook(() => useAdminData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toHaveProperty('approvedPrayersCount');
    expect(result.current).toHaveProperty('deniedPrayersCount');
    expect(result.current).toHaveProperty('approvedUpdatesCount');
    expect(result.current).toHaveProperty('deniedUpdatesCount');
  });
});
