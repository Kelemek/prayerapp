import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock')
  const createSupabaseMock = mod.default ?? mod.createSupabaseMock
  // Start with empty store
  const supabase = createSupabaseMock({ fromData: {} })
  return { supabase } as any
})

import { supabase } from '../supabase'
import { seedDummyPrayers, cleanupDummyPrayers } from '../devSeed'

describe('devSeed utilities', () => {
  beforeEach(() => {
    // Clear mocks if running under Vitest; be defensive in case vi isn't present
    if ((globalThis as any).vi && typeof (globalThis as any).vi.clearAllMocks === 'function') {
      (globalThis as any).vi.clearAllMocks()
    }
    // ensure clean store by mutating the underlying testData object (preserves closure in mock)
    const td = (supabase as any).__testData || ((supabase as any).__testData = {})
    td.prayers = []
    td.prayer_updates = []
  })

  it('seedDummyPrayers inserts prayers and returns counts', async () => {
    const res = await seedDummyPrayers()

    expect(res.prayersCount).toBeGreaterThanOrEqual(1)
    expect(res.prayersCount).toBe(50)
    expect(res.updatesCount).toBeGreaterThanOrEqual(0)

    // Ensure store was mutated
    const stored = (supabase as any).__testData.prayers
    expect(stored.length).toBe(res.prayersCount)
  })

  it('cleanupDummyPrayers removes seed data and returns deleted counts', async () => {
    // Populate store with seed entries
    const td = (supabase as any).__testData || ((supabase as any).__testData = {})
    td.prayers = [
      { id: 'p1', is_seed_data: true },
      { id: 'p2', is_seed_data: true }
    ]
    td.prayer_updates = [
      { id: 'u1', is_seed_data: true }
    ]

    const res = await cleanupDummyPrayers()

    expect(res.prayersCount).toBe(2)
    expect(res.updatesCount).toBe(1)

    // Ensure they were removed from the store
    expect((supabase as any).__testData.prayers.length).toBe(0)
    expect((supabase as any).__testData.prayer_updates.length).toBe(0)
  })

  it('cleanupDummyPrayers throws when no seed data present', async () => {
    const td = (supabase as any).__testData || ((supabase as any).__testData = {})
    td.prayers = []
    td.prayer_updates = []

    await expect(cleanupDummyPrayers()).rejects.toThrow('No seed data found in database. Have you run the seed function?')
  })
})
