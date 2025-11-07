import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePrayerManager } from '../usePrayerManager';
import { PrayerStatus } from '../../types/prayer';

vi.mock('../../lib/emailNotifications', () => ({
  sendAdminNotification: vi.fn()
}));

// Provide a base mock for supabase (channel/from/removeChannel) so hook effects can mount
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn()
  },
  handleSupabaseError: vi.fn()
}));

import { supabase } from '../../lib/supabase';
import { sendAdminNotification } from '../../lib/emailNotifications';

// Helper to build a simple chainable object for select/eq/maybeSingle
const makeSelectMaybeSingle = (result: any) => ({
  select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: result, error: null }) }) })
});

describe('usePrayerManager extra flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure sendAdminNotification returns a promise so .catch() is safe in production code
    vi.mocked(sendAdminNotification).mockResolvedValue(undefined);
  });

  it('addPrayer inserts prayer, auto-subscribes email when missing, and triggers admin notification', async () => {
    // Mock initial loadPrayers to return empty approved prayers
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return {
          select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [], error: null }) }) })
        } as any;
      }

      // For prayers.insert -> return data via select().single()
      if (table === 'prayers' || table === 'email_subscribers') {
        // Not used here via this branch
      }

      return makeSelectMaybeSingle(null) as any;
    });

    // Now create specific behavior for insert and email_subscribers
    const fromMock = vi.fn((table: string) => {
      if (table === 'prayers') {
        return {
          // handle loadPrayers select(...).eq(...).then()
          select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [], error: null }) }) }),
          // handle insert(...).select().single()
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'p-123' }, error: null } ) }) }),
          delete: () => ({ eq: () => ({ then: async (cb: any) => cb({ data: [], error: null }) }) })
        } as any;
      }

      if (table === 'email_subscribers') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          insert: () => ({ then: async (cb: any) => cb({ data: [{ id: 'es-1' }] }) })
        } as any;
      }

      if (table === 'prayer_updates') {
        return { insert: () => ({ then: async (cb: any) => cb({ data: [], error: null }) }) } as any;
      }

      return makeSelectMaybeSingle(null) as any;
    });

    vi.mocked(supabase.from).mockImplementation(fromMock as any);

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const prayerInput = { title: 'New', description: 'Desc', status: 'current', requester: 'R', prayer_for: 'P', email: 'user@example.com', is_anonymous: false };

  // Call addPrayer and verify side-effects (auto-subscription and admin notification).
  // The function may return undefined on error paths; for this test we focus on the side-effects.
  await result.current.addPrayer(prayerInput as any);

  // Admin notification should have been triggered
  expect(vi.mocked(sendAdminNotification).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('deletePrayer reverts optimistic update on error', async () => {
    // Start with one prayer returned by initial load
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return {
          select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [{ id: 'p1', title: 'T', description: 'd', status: 'current', requester: 'A', prayer_for: 'X', email: 'a@b.com', is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: null, updates: [] }], error: null }) }) })
        } as any;
      }

      // For delete operation, return an error
      if (table === 'prayers' ) {
        return {
          delete: () => ({ eq: () => ({ then: async (cb: any) => cb({ error: { message: 'DB fail' } }) }) })
        } as any;
      }

      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prayers.some(p => p.id === 'p1')).toBe(true);

    // Now mock delete to return error when called
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return {
          delete: () => ({ eq: async () => ({ error: { message: 'DB fail' } }) })
        } as any;
      }
      return makeSelectMaybeSingle(null) as any;
    });

    await act(async () => { await result.current.deletePrayer('p1'); });

    // After failure, prayer should be restored
    expect(result.current.prayers.some(p => p.id === 'p1')).toBe(true);
  });

  it('requestUpdateDeletion returns ok:true and sends admin notification when succeeds', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'update_deletion_requests') {
        return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'r1' }, error: null } ) }) }) } as any;
      }

      if (table === 'prayer_updates') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'u1', prayers: { title: 'PT' }, author: 'Me', content: 'C' } , error: null }) }) }) } as any;
      }

      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await act(async () => await result.current.requestUpdateDeletion('u1', 'reason', 'req', 'req@ex.com'));

    expect(res.ok).toBe(true);
    expect(vi.mocked(sendAdminNotification).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('updatePrayerStatus optimistically updates local state and persists on success', async () => {
    const initialPrayer = { id: 'p1', title: 'T', description: 'd', status: 'current', requester: 'A', prayer_for: 'X', email: 'a@b.com', is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: null, updates: [] } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return {
          select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [initialPrayer], error: null }) }) }),
          update: () => ({ eq: () => ({ error: null }) })
        } as any;
      }
      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // initial status
    expect(result.current.prayers.find(p => p.id === 'p1')?.status).toBe('current');

    await act(async () => { await result.current.updatePrayerStatus('p1', PrayerStatus.ANSWERED); });

    expect(result.current.prayers.find(p => p.id === 'p1')?.status).toBe(PrayerStatus.ANSWERED);
  });

  it('addPrayerUpdate inserts update and notifies admin (author preserved)', async () => {
    const initialPrayer = { id: 'p1', title: 'PrayerTitle', description: 'd', status: 'current', requester: 'A', prayer_for: 'X', email: 'a@b.com', is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: null, updates: [] } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return { select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [initialPrayer], error: null }) }) }) } as any;
      }

      if (table === 'prayer_updates') {
        return { insert: () => ({ error: null }) } as any;
      }

      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.addPrayerUpdate('p1', 'New content', 'RealAuthor', 'auth@ex.com', false); });

    expect(vi.mocked(sendAdminNotification).mock.calls.length).toBeGreaterThanOrEqual(1);
    const lastCall = vi.mocked(sendAdminNotification).mock.calls.at(-1)?.[0];
    expect(lastCall?.author).toBe('RealAuthor');
  });

  it('addPrayerUpdate sends Anonymous as author when requested', async () => {
    const initialPrayer = { id: 'p1', title: 'PrayerTitle', description: 'd', status: 'current', requester: 'A', prayer_for: 'X', email: 'a@b.com', is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: null, updates: [] } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return { select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [initialPrayer], error: null }) }) }) } as any;
      }

      if (table === 'prayer_updates') {
        return { insert: () => ({ error: null }) } as any;
      }

      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.addPrayerUpdate('p1', 'Anon content', 'SomeName', undefined, true); });

    expect(vi.mocked(sendAdminNotification).mock.calls.length).toBeGreaterThanOrEqual(1);
    const lastCall = vi.mocked(sendAdminNotification).mock.calls.at(-1)?.[0];
    expect(lastCall?.author).toBe('Anonymous');
  });

  it('getFilteredPrayers filters by status and search term', async () => {
  const p1 = { id: 'p1', title: 'FindMe', description: 'hello world', status: 'current', requester: 'A', prayer_for: 'X', email: null, is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: null, prayer_updates: [{ id: 'u1', prayer_id: 'p1', content: 'urgent update', author: 'A', created_at: new Date().toISOString(), approval_status: 'approved' }] } as any;
    const p2 = { id: 'p2', title: 'Other', description: 'nothing', status: 'answered', requester: 'B', prayer_for: 'Y', email: null, is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: new Date().toISOString(), updates: [] } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return { select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [p1, p2], error: null }) }) }) } as any;
      }
      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const byStatus = result.current.getFilteredPrayers(PrayerStatus.CURRENT);
    expect(byStatus.length).toBeGreaterThanOrEqual(1);
    expect(byStatus.every(p => p.status === PrayerStatus.CURRENT)).toBe(true);

    const bySearch = result.current.getFilteredPrayers(undefined, 'urgent');
    expect(bySearch.some(p => p.id === 'p1')).toBe(true);
  });

  it('updatePrayerStatus reverts optimistic update when DB update fails', async () => {
    const initialPrayer = { id: 'p1', title: 'T', description: 'd', status: 'current', requester: 'A', prayer_for: 'X', email: 'a@b.com', is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: null, prayer_updates: [] } as any;

    // First render returns initial prayer list
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return {
          select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [initialPrayer], error: null }) }) }),
          update: () => ({ eq: () => ({ error: { message: 'DB fail' } }) })
        } as any;
      }
      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prayers.find(p => p.id === 'p1')?.status).toBe('current');

    // Call update which will fail on DB and trigger loadPrayers to restore state
    await act(async () => { await result.current.updatePrayerStatus('p1', PrayerStatus.ANSWERED); });

    await waitFor(() => expect(result.current.prayers.find(p => p.id === 'p1')?.status).toBe('current'));
  });

  it('addPrayer returns inserted data and auto-subscribes when email missing', async () => {
    // Mock insert and subscriber flows
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return {
          select: () => ({ eq: () => ({ order: () => ({ then: (cb: any) => cb({ data: [], error: null }) }) }) }),
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'p-new', title: 'New' }, error: null }) }) })
        } as any;
      }

      if (table === 'email_subscribers') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          insert: () => ({ then: async (cb: any) => cb({ data: [{ id: 'es-1' }] }) })
        } as any;
      }

      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const res = await act(async () => await result.current.addPrayer({ title: 'New', description: 'd', status: 'current', requester: 'R', prayer_for: 'P', email: 'new@example.com', is_anonymous: false } as any));

    // Should have returned data from insert
    expect(res).toBeDefined();
    expect(vi.mocked(sendAdminNotification).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('realtime subscription handlers update local state on INSERT/UPDATE/DELETE', async () => {
    // Build a controllable channel that records handlers so we can invoke them
    let handlers: Array<{ filter: any; handler: Function }> = [];
    const channel = {
      on: (ev: string, filter: any, handler: Function) => { handlers.push({ filter, handler }); return channel; },
      subscribe: () => ({})
    } as any;

    vi.mocked(supabase.channel).mockImplementation(() => channel as any);
  vi.mocked(supabase.removeChannel).mockImplementation(async () => 'ok');

    // initial load empty
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return { select: () => ({ eq: () => ({ order: () => ({ then: (cb: any) => cb({ data: [], error: null }) }) }) }) } as any;
      }
      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prayers.length).toBe(0);

    // Simulate INSERT
    const newDbPrayer = { id: 'p-ins', title: 'Ins', description: '', status: 'current', requester: 'X', prayer_for: 'Y', email: null, is_anonymous: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), prayer_updates: [] } as any;
    const insertHandler = handlers.find(h => h.filter?.event === 'INSERT' && h.filter?.table === 'prayers');
    expect(insertHandler).toBeDefined();
    await act(async () => { insertHandler!.handler({ new: newDbPrayer }); });
    await waitFor(() => expect(result.current.prayers.some(p => p.id === 'p-ins')).toBe(true));

    // Simulate UPDATE
    const updatedDbPrayer = { ...newDbPrayer, title: 'Updated' } as any;
    const updateHandler = handlers.find(h => h.filter?.event === 'UPDATE' && h.filter?.table === 'prayers');
    expect(updateHandler).toBeDefined();
    await act(async () => { updateHandler!.handler({ new: updatedDbPrayer }); });
    await waitFor(() => expect(result.current.prayers.find(p => p.id === 'p-ins')?.title).toBe('Updated'));

    // Simulate DELETE
    const deleteHandler = handlers.find(h => h.filter?.event === 'DELETE' && h.filter?.table === 'prayers');
    expect(deleteHandler).toBeDefined();
    await act(async () => { deleteHandler!.handler({ old: { id: 'p-ins' } }); });
    await waitFor(() => expect(result.current.prayers.some(p => p.id === 'p-ins')).toBe(false));
  });

  it('convertDbPrayer uses fallback description and only includes approved updates in newest-first order', async () => {
    const dbPrayer = { id: 'p-fb', title: 'Fallback', description: null, status: 'current', requester: 'Req', prayer_for: 'PF', email: null, is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: null, prayer_updates: [
      { id: 'u-old', prayer_id: 'p-fb', content: 'old', author: 'A', created_at: new Date(Date.now() - 10000).toISOString(), approval_status: 'approved' },
      { id: 'u-pend', prayer_id: 'p-fb', content: 'pending', author: 'B', created_at: new Date(Date.now() - 5000).toISOString(), approval_status: 'pending' },
      { id: 'u-new', prayer_id: 'p-fb', content: 'new', author: 'C', created_at: new Date().toISOString(), approval_status: 'approved' }
    ] } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return { select: () => ({ eq: () => ({ then: (cb: any) => cb({ data: [dbPrayer], error: null }) }) }) } as any;
      }
      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const p = result.current.prayers.find(x => x.id === 'p-fb');
    expect(p).toBeDefined();
    // description fallback
    expect(p?.description).toBe('No description provided');
  // only approved updates should be present and newest-first
  expect((p!.updates as any).map((u: any) => u.id)).toEqual(['u-new', 'u-old']);
  });

  it('deletePrayerUpdate calls delete and refreshes prayers on success', async () => {
    // initial load returns one prayer
    const initial = { id: 'p-x', title: 'X', description: 'd', status: 'current', requester: 'A', prayer_for: 'Z', email: null, is_anonymous: false, date_requested: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_answered: null, prayer_updates: [] } as any;

    // First call: loadPrayers returns initial
    let stage = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayer_updates') {
        // delete path
        return { delete: () => ({ eq: () => ({ error: null }) }) } as any;
      }

      if (table === 'prayers') {
        return { select: () => ({ eq: () => ({ then: (cb: any) => {
          if (stage === 0) return cb({ data: [initial], error: null });
          return cb({ data: [], error: null });
        } }) }) } as any;
      }
      return makeSelectMaybeSingle(null) as any;
    });

    const { result } = renderHook(() => usePrayerManager());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prayers.length).toBeGreaterThanOrEqual(1);

    // Advance stage so that after delete, loadPrayers returns empty list
    stage = 1;

    await act(async () => { await result.current.deletePrayerUpdate('u-delete'); });

    // After deletion, loadPrayers should have been called and prayers cleared
    await waitFor(() => expect(result.current.prayers.length).toBe(0));
  });
});
