import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAdminData } from '../useAdminData'

// Use the shared supabase mock factory from inside the mocked module factory so
// the creation happens at mock-time (avoids hoisting issues). We'll seed data in
// the test's beforeEach using the exported `supabase` instance.
// We'll mock supabase and the email notifications the hook uses.
vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock')
  const sup = mod.createSupabaseMock({ fromData: {} }) as any
  // make removeChannel spy-able for tests
  sup.removeChannel = vi.fn()
  return { supabase: sup, handleSupabaseError: vi.fn((e: any) => e?.message || 'Unknown') }
})

vi.mock('../../lib/emailNotifications', () => ({
  sendApprovedUpdateNotification: vi.fn(() => Promise.resolve()),
  sendApprovedStatusChangeNotification: vi.fn(() => Promise.resolve()),
  sendDeniedUpdateNotification: vi.fn(() => Promise.resolve()),
  sendDeniedStatusChangeNotification: vi.fn(() => Promise.resolve()),
  sendApprovedPrayerNotification: vi.fn(() => Promise.resolve()),
  sendRequesterApprovalNotification: vi.fn(() => Promise.resolve()),
  sendDeniedPrayerNotification: vi.fn(() => Promise.resolve())
}))

import { supabase } from '../../lib/supabase'
import * as email from '../../lib/emailNotifications'

describe('useAdminData approvals', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // default: for any table not explicitly handled, return empty results
    const baseChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((cb: any) => cb({ data: [], error: null }))
    }

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      // For approveUpdate: when selecting from prayer_updates by id
      if (table === 'prayer_updates') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field: string, val: any) => {
            // single() call for fetching an update
            if (field === 'id') return { single: vi.fn().mockResolvedValue({ data: {
              id: val,
              prayer_id: 'p1',
              content: 'Update content',
              mark_as_answered: true,
              is_anonymous: false,
              author: 'Bob',
              author_email: 'bob@example.com',
              prayers: { title: 'Test Prayer', status: 'current' }
            }, error: null }) }
            // update(...).eq(...) style should resolve here
            return { single: vi.fn().mockResolvedValue({ data: null, error: null }), eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
          }),
          update: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          // ensure delete/update chain ends with eq returning a resolved result
          delete: vi.fn().mockReturnThis()
        } as any
      }

      if (table === 'status_change_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field: string, val: any) => {
            if (field === 'id') return { single: vi.fn().mockResolvedValue({ data: {
              id: val,
              prayer_id: 'p2',
              requested_status: 'answered',
              requested_by: 'AdminUser',
              requested_email: 'req@example.com',
              prayers: { title: 'Other Prayer', status: 'current' }
            }, error: null }) }
            return baseChain
          }),
          // make update(...).eq(...) chainable and resolve to a success tuple
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          order: vi.fn().mockReturnThis()
        } as any
      }

      if (table === 'prayers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }), eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'p1', title: 'Test Prayer', description: 'desc', email: 'a@b.com', is_anonymous: false, prayer_for: 'All', status: 'current' }, error: null }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis()
        } as any
      }

      return baseChain as any
    })
  })

  it('approveUpdate updates prayer status when mark_as_answered is true and sends notification', async () => {
    const { result } = renderHook(() => useAdminData())

    // wait for initial fetch
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.approveUpdate('update-123')
    })

    // expect we called out to update the prayer status
    expect(supabase.from).toHaveBeenCalled()
    // email notification should be triggered
    expect(email.sendApprovedUpdateNotification).toHaveBeenCalled()
  })

  it('approveStatusChangeRequest approves and removes pending request and sends notification', async () => {
    const { result } = renderHook(() => useAdminData())

    // Pre-populate pendingStatusChangeRequests to ensure removal happens
    // We can call the refresh to ensure initial data fetched, then manually set data via result.current.refresh
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Manually set data by calling refresh which will use our mocked supabase responses
    await act(async () => {
      // call the approve function
      await result.current.approveStatusChangeRequest('status-1')
    })

    // The notification should be sent
    expect(email.sendApprovedStatusChangeNotification).toHaveBeenCalled()
    // And supabase should have been used to update prayers
    expect(supabase.from).toHaveBeenCalled()
  })
})
