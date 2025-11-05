import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ToastProvider } from '../../components/ToastProvider'
import { useToast } from '../useToast'

describe('useToast hook', () => {
  it('throws when used outside ToastProvider', () => {
    // renderHook will throw because the context is null
    let threw = false
    try {
      renderHook(() => useToast())
    } catch (e) {
      threw = true
    }
    expect(threw).toBe(true)
  })

  it('returns showToast when used within ToastProvider', () => {
    const { result } = renderHook(() => useToast(), { wrapper: ToastProvider })
    expect(result.current).toHaveProperty('showToast')
    // calling showToast should not throw
    act(() => {
      result.current.showToast('hello', 'success')
    })
  })
})
