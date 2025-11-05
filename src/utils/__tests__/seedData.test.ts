import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the supabase module using the shared test factory (hoist-safe async factory)
vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock')
  const createSupabaseMock = mod.default ?? mod.createSupabaseMock
  const supabase = createSupabaseMock({ fromData: {} })
  return { supabase } as any
})

import { supabase } from '../../lib/supabase'
import { seedTestPrayers } from '../seedData'

describe('seedTestPrayers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // ensure clean test store
    if ((supabase as any).__testData) {
      (supabase as any).__testData.prayers = []
    }
  })

  it('inserts three test prayers into the prayers table', async () => {
    await seedTestPrayers()

    const data = (supabase as any).__testData.prayers || []
    expect(data.length).toBe(3)
    expect(data[0]).toHaveProperty('title')
    expect(data[1]).toHaveProperty('description')
  })
})
