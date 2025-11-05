import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase used by AdminAuthProvider
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOtp: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn(),
    rpc: vi.fn()
  }
}))

import { useAdminAuth } from '../useAdminAuthHook'
import { AdminAuthProvider } from '../useAdminAuth'

describe('useAdminAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when used outside AdminAuthProvider', () => {
    let threw = false
    try {
      renderHook(() => useAdminAuth())
    } catch (e) {
      threw = true
    }
    expect(threw).toBe(true)
  })

  it('returns context when used inside AdminAuthProvider', async () => {
    const { result } = renderHook(() => useAdminAuth(), { wrapper: AdminAuthProvider })
    // The provider does async initialization; at minimum the hook should return an object with sendMagicLink and logout
    expect(result.current).toHaveProperty('sendMagicLink')
    expect(result.current).toHaveProperty('logout')
    expect(typeof result.current.sendMagicLink).toBe('function')
    expect(typeof result.current.logout).toBe('function')
  })
})
