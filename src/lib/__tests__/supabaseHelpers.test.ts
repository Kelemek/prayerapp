import 'vitest';
import { describe, it, expect, vi } from 'vitest'
import { handleSupabaseError } from '../supabaseHelpers'

describe('handleSupabaseError', () => {
  it('throws with provided message when error has message property', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => handleSupabaseError({ message: 'boom' } as any)).toThrow('boom')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('throws generic message for unknown error shapes', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => handleSupabaseError(null)).toThrow('An unexpected error occurred')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
