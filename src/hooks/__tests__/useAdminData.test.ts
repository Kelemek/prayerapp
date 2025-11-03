import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminData } from '../useAdminData';

vi.mock('../../lib/emailNotifications', () => ({
  sendApprovedPrayerNotification: vi.fn(),
  sendApprovedUpdateNotification: vi.fn(),
  sendDeniedPrayerNotification: vi.fn(),
  sendDeniedUpdateNotification: vi.fn(),
  sendRequesterApprovalNotification: vi.fn(),
  sendApprovedStatusChangeNotification: vi.fn(),
  sendDeniedStatusChangeNotification: vi.fn()
}));

// Create a helper to build a thenable / chainable supabase.from mock per table
const makeFromFor = (tableName: string, scenario: any) => {
  const state: any = { selectOptions: undefined };
  const obj: any = {
    select: (q: any, opts?: any) => { state.selectOptions = opts; return obj; },
    eq: () => obj,
    order: () => obj,
    single: async () => ({ data: scenario.singleData ?? null, error: scenario.singleError ?? null }),
    maybeSingle: async () => ({ data: scenario.maybeSingleData ?? null, error: scenario.maybeSingleError ?? null }),
    update: () => obj,
    delete: () => obj,
    insert: () => obj,
    then: (resolve: any) => {
      // If head:true was requested, return count-style object
      if (state.selectOptions && state.selectOptions.head) {
        return resolve({ count: scenario.count ?? 0 });
      }
      // Default data resolution
      return resolve({ data: scenario.data ?? [], error: scenario.error ?? null });
    }
  };
  return obj;
};

// Mock supabase with channel/removeChannel too
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn()
  },
  handleSupabaseError: vi.fn()
}));

import { supabase } from '../../lib/supabase';

describe('useAdminData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches admin data successfully (happy path)', async () => {
    const scenarioMap: Record<string, any> = {
      'update_deletion_requests': { data: [] },
      'prayers_pending': { data: [{ id: 'p1', title: 'T1' }] },
      'prayer_updates': { data: [{ id: 'u1', prayers: { title: 'PT' } }] },
      'deletion_requests': { data: [] },
      'status_change_requests': { data: [] },
      // counts
      'prayers_approved_count': { count: 5 },
      'prayer_updates_approved_count': { count: 2 },
      'prayers_denied_count': { count: 1 },
      'prayer_updates_denied_count': { count: 3 },
      // approved/denied lists
      'prayers_approved': { data: [{ id: 'ap1' }] },
      'prayer_updates_approved': { data: [{ id: 'au1', prayers: { title: 'APT' } }] },
      'prayers_denied': { data: [] },
      'prayer_updates_denied': { data: [] },
      'status_change_requests_denied': { data: [] },
      'deletion_requests_denied': { data: [] },
      'update_deletion_requests_denied': { data: [] },
      'pending_preference_changes': { data: [] }
    };

    // Map table to behavior based on how useAdminData queries them
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      switch (table) {
        case 'update_deletion_requests': return makeFromFor(table, scenarioMap['update_deletion_requests']);
        case 'prayers':
          // First prayers call is pending, later used for counts and approved/denied lists
          return makeFromFor(table, { data: scenarioMap['prayers_pending'].data, count: scenarioMap['prayers_approved_count'].count });
        case 'prayer_updates': return makeFromFor(table, { data: scenarioMap['prayer_updates'].data, count: scenarioMap['prayer_updates_approved_count'].count });
        case 'deletion_requests': return makeFromFor(table, scenarioMap['deletion_requests']);
        case 'status_change_requests': return makeFromFor(table, scenarioMap['status_change_requests']);
        case 'pending_preference_changes': return makeFromFor(table, scenarioMap['pending_preference_changes']);
        default: return makeFromFor(table, {});
      }
    });

    const { result } = renderHook(() => useAdminData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pendingPrayers.length).toBeGreaterThanOrEqual(1);
    // approved counts should be numeric (mock returns count via then for head:true)
    expect(typeof result.current.approvedPrayersCount).toBe('number');
  });

  it('handles empty results without crashing', async () => {
    vi.mocked(supabase.from).mockImplementation(() => makeFromFor('any', { data: [] }));

    const { result } = renderHook(() => useAdminData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(Array.isArray(result.current.pendingPrayers)).toBe(true);
    expect(result.current.pendingPrayers).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('sets error state when a query fails', async () => {
    // Make the prayers pending query return an error
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return makeFromFor(table, { data: null, error: { message: 'DB failure' } });
      }
      return makeFromFor(table, { data: [] });
    });

    const { result } = renderHook(() => useAdminData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });
});
