import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAdminData } from '../useAdminData'

vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock')
  const sup = mod.createSupabaseMock({ fromData: {} }) as any
  sup.removeChannel = vi.fn()
  return { 
    supabase: sup, 
    handleSupabaseError: vi.fn((e: any) => e?.message || 'Unknown'),
    directQuery: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    directMutation: vi.fn().mockResolvedValue({ data: null, error: null }),
    getSupabaseConfig: vi.fn().mockReturnValue({ url: 'https://test.supabase.co', anonKey: 'test-key' })
  }
})

vi.mock('../../lib/emailNotifications', () => ({
  sendApprovedPrayerNotification: vi.fn(() => Promise.resolve()),
  sendRequesterApprovalNotification: vi.fn(() => Promise.resolve()),
  sendDeniedUpdateNotification: vi.fn(() => Promise.resolve())
}))

import { supabase } from '../../lib/supabase'
import * as email from '../../lib/emailNotifications'

describe('useAdminData additional flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const baseChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      then: vi.fn((cb: any) => cb({ data: [], error: null }))
    }

    // Provide table-specific behavior
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'prayers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field: string, val: any) => {
            // When selecting by id, return a single() resolver with the prayer
            if (field === 'id') return { single: vi.fn().mockResolvedValue({ data: { id: val, title: 'To Approve', description: 'x', email: 'req@example.com', is_anonymous: false, prayer_for: 'All', status: 'current' }, error: null }) }
            return baseChain
          }),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis()
        } as any
      }

      if (table === 'prayer_updates') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field: string, val: any) => {
            // fetching update by id
            if (field === 'id') return { single: vi.fn().mockResolvedValue({ data: { id: val, prayer_id: 'p-123', content: 'u', author_email: 'author@example.com', is_anonymous: false }, error: null }) }
            return baseChain
          }),
          update: vi.fn().mockReturnThis()
        } as any
      }

      if (table === 'deletion_requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field: string, val: any) => {
            if (field === 'id') return { single: vi.fn().mockResolvedValue({ data: { id: val, prayer_id: 'p-del' }, error: null }) }
            return baseChain
          }),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis()
        } as any
      }

      return baseChain as any
    })
  })

  it('approvePrayer updates prayer approval_status and triggers email notifications', async () => {
    const { result } = renderHook(() => useAdminData())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.approvePrayer('p-approve')
    })

    // Should have called supabase queries and notification utilities
    expect(supabase.from).toHaveBeenCalled()
    expect(email.sendApprovedPrayerNotification).toHaveBeenCalled()
    expect(email.sendRequesterApprovalNotification).toHaveBeenCalled()
  })

  it('denyUpdate marks update denied and sends denied update notification when email present', async () => {
    const { result } = renderHook(() => useAdminData())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.denyUpdate('update-1', 'Not appropriate')
    })

    expect(supabase.from).toHaveBeenCalled()
    expect(email.sendDeniedUpdateNotification).toHaveBeenCalled()
  })

  it('approveDeletionRequest approves and deletes the prayer', async () => {
    const { result } = renderHook(() => useAdminData())

    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.approveDeletionRequest('del-1')
    })

    expect(supabase.from).toHaveBeenCalled()
  })
})
