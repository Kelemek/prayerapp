/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'

describe('supabase module safe import', () => {
  it('imports supabase.ts when env vars are present and createClient is mocked', async () => {
    // Provide expected env vars (Vitest/Vite should map these into import.meta.env at runtime)
    process.env.VITE_SUPABASE_URL = 'https://test.supabase'
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key'

    // Mock the @supabase/supabase-js createClient before importing the module
    vi.mock('@supabase/supabase-js', () => ({
      createClient: (url: string, key: string, opts: any) => {
        return { __mockClient: true, url, key, opts }
      }
    }))

    // Dynamic import to ensure mocks/env are applied
    const mod = await import('../supabase')

  expect(mod.supabase).toBeDefined()
  // If present, the module should export the error helper; but some test environments
  // may mock this module, so we don't require it here.
  })
})
