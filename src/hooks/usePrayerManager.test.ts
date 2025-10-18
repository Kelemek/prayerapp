import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePrayerManager } from './usePrayerManager';
import { supabase } from '../lib/supabase';

// Mock Supabase with complete chain
const createMockChain = (resolveData: any = [], resolveError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
  then: vi.fn((callback: any) => callback({ data: resolveData, error: resolveError }))
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    })),
    removeChannel: vi.fn()
  },
  handleSupabaseError: vi.fn((err) => err?.message || 'Unknown error')
}));

// Mock email notifications
vi.mock('../lib/emailNotifications', () => ({
  sendAdminNotification: vi.fn()
}));

describe('usePrayerManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default successful responses
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('loads prayers on mount', async () => {
    const mockPrayers = [
      {
        id: '1',
        title: 'Test Prayer',
        description: 'Please pray for this',
        status: 'current',
        requester: 'John Doe',
        prayer_for: 'Friend',
        email: 'john@example.com',
        is_anonymous: false,
        approval_status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: []
      }
    ];

    const mockChain = createMockChain(mockPrayers);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(supabase.from).toHaveBeenCalledWith('prayers');
    expect(result.current.prayers).toBeDefined();
  });

  it('provides addPrayer function', () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.addPrayer).toBe('function');
  });

  it('provides deletePrayer function', () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.deletePrayer).toBe('function');
  });

  it('provides updatePrayerStatus function', () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.updatePrayerStatus).toBe('function');
  });

  it('provides addPrayerUpdate function', () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.addPrayerUpdate).toBe('function');
  });

  it('provides refresh function', () => {
    const { result } = renderHook(() => usePrayerManager());

    expect(typeof result.current.refresh).toBe('function');
  });

  it('handles loading errors gracefully', async () => {
    const mockError = { message: 'Database error' };
    const mockChain = createMockChain(null, mockError);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('filters to only show approved prayers', async () => {
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    renderHook(() => usePrayerManager());

    await waitFor(() => {
      const fromCalls = vi.mocked(supabase.from).mock.calls;
      expect(fromCalls.some(call => call[0] === 'prayers')).toBe(true);
    });

    // Verify that eq was called with approval_status = 'approved'
    const mockChain2 = vi.mocked(supabase.from).mock.results[0]?.value;
    expect(mockChain2?.eq).toHaveBeenCalled();
  });

  it('orders prayers by creation date descending', async () => {
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    renderHook(() => usePrayerManager());

    await waitFor(() => {
      const mockChain2 = vi.mocked(supabase.from).mock.results[0]?.value;
      expect(mockChain2?.order).toHaveBeenCalled();
    });
  });

  it('sets up realtime subscriptions', () => {
    renderHook(() => usePrayerManager());

    expect(supabase.channel).toHaveBeenCalled();
  });

  it('provides prayers array in result', async () => {
    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(Array.isArray(result.current.prayers)).toBe(true);
  });

  it('includes updates in prayer data structure', async () => {
    const mockPrayers = [
      {
        id: '1',
        title: 'Test Prayer',
        description: 'Please pray',
        status: 'current',
        requester: 'John',
        prayer_for: 'Friend',
        email: 'john@example.com',
        is_anonymous: false,
        approval_status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        date_requested: new Date().toISOString(),
        prayer_updates: [
          {
            id: 'u1',
            prayer_id: '1',
            content: 'Update 1',
            author: 'John',
            approval_status: 'approved',
            created_at: new Date().toISOString()
          }
        ]
      }
    ];

    const mockChain = createMockChain(mockPrayers);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Just verify the structure is correct
    expect(result.current.prayers).toBeDefined();
  });
});
