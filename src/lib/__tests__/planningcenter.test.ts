/// <reference types="vitest/globals" />

// Mock the supabase module used by planningcenter
vi.mock('../supabase', () => {
  return {
    supabase: {
      functions: {
        invoke: vi.fn()
      }
    }
  }
})

import { lookupPersonByEmail, formatPersonName } from '../planningcenter'
import { supabase } from '../supabase'

describe('planningcenter utilities', () => {
  beforeEach(() => {
    // reset mock implementation between tests
    ;(supabase.functions.invoke as any).mockReset()
  })

  it('formatPersonName prefers attributes.name then first+last then Unknown', () => {
    const p1: any = { attributes: { name: 'Full Name', first_name: 'X', last_name: 'Y' } }
    expect(formatPersonName(p1)).toBe('Full Name')

    const p2: any = { attributes: { name: '', first_name: 'John', last_name: 'Doe' } }
    expect(formatPersonName(p2)).toBe('John Doe')

    const p3: any = { attributes: { name: '', first_name: '', last_name: '' } }
    expect(formatPersonName(p3)).toBe('Unknown')
  })

  it('lookupPersonByEmail throws on empty input', async () => {
    await expect(lookupPersonByEmail('')).rejects.toThrow('Email address is required')
    await expect(lookupPersonByEmail('   ')).rejects.toThrow('Email address is required')
  })

  it('lookupPersonByEmail throws when functions.invoke returns an error', async () => {
    ;(supabase.functions.invoke as any).mockResolvedValueOnce({ data: null, error: { message: 'PC error' } })
    await expect(lookupPersonByEmail('a@b.com')).rejects.toThrow('PC error')
  })

  it('lookupPersonByEmail returns data when functions.invoke succeeds', async () => {
    const result = { people: [{ id: 'p1', type: 'person', attributes: { name: 'N', first_name: 'N', last_name: '', avatar: '', status: '', created_at: '', updated_at: '' } }], count: 1 }
    ;(supabase.functions.invoke as any).mockResolvedValueOnce({ data: result, error: null })
    const res = await lookupPersonByEmail('me@example.com')
    expect(res).toEqual(result)
    expect((supabase.functions.invoke as any)).toHaveBeenCalled()
  })

  it('lookupPersonByEmail throws when supabase invoke returns an error object', async () => {
    ;(supabase.functions.invoke as any).mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    await expect(lookupPersonByEmail('b@example.com')).rejects.toThrow('not found')
  })

  it('lookupPersonByEmail propagates when invoke throws', async () => {
    ;(supabase.functions.invoke as any).mockImplementation(() => { throw new Error('network') })
    await expect(lookupPersonByEmail('c@example.com')).rejects.toThrow('network')
  })
})
