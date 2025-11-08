import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Create a lightweight inline supabase mock (keeps everything local to avoid hoisting issues)
vi.mock('../../lib/supabase', () => {
  const handlers: Array<{ event: string; cb: (payload: any) => void }> = []

  const ch = {
    on: (event: string, filterOrCb: any, maybeCb?: (payload: any) => void) => {
      if (typeof maybeCb === 'function') {
        handlers.push({ event, cb: maybeCb })
      } else if (typeof filterOrCb === 'function') {
        handlers.push({ event, cb: filterOrCb })
      }
      return ch
    },
    subscribe: async (cb?: (status: string) => void) => {
      // If the component passed a subscribe callback, call it with 'SUBSCRIBED' to simulate success
      if (typeof cb === 'function') cb('SUBSCRIBED')
      return { data: null, error: null }
    },
    __trigger: (eventName: string, payload: any) => {
      handlers.forEach(h => {
        if (h.event === eventName) {
          try { h.cb(payload) } catch (e) { /* ignore */ }
        }
      })
    }
  }

  return {
    supabase: {
      from: () => ({ select: () => ({ single: async () => ({ data: { count: 1 }, error: null }) }) }),
      channel: vi.fn(() => ch),
      removeChannel: vi.fn(),
    }
  }
})

import { RealtimeStatus } from '../RealtimeStatus'

describe('RealtimeStatus', () => {
  afterEach(() => {
    vi.resetAllMocks()
    // restore any timers if used
    try { vi.useRealTimers() } catch (e) { /* ignore */ }
  })

  it('shows Live when supabase is reachable and shows a spinner briefly on realtime events', async () => {
  // Render the component
  const { container } = render(<RealtimeStatus />)

    // Initially, because the mock returns a row for prayers, the component should show Live
    await waitFor(() => expect(screen.getByText('Live')).toBeInTheDocument())

    // Grab the channel instance that the component created so we can trigger events
  // Import the mocked supabase module so we can access the channel mock
  const mod = await import('../../lib/supabase')
  const supabase = (mod as any).supabase
  // Debug: ensure the mocked functions are present
  // eslint-disable-next-line no-console
  console.log('mocked supabase present?', !!supabase, 'from?', !!supabase.from, 'channel?', !!supabase.channel)
  const channelMock = supabase.channel.mock && supabase.channel.mock.results[0] && supabase.channel.mock.results[0].value

  expect(channelMock).toBeDefined()

    // Trigger a postgres_changes event to simulate activity
    channelMock.__trigger('postgres_changes', { /* payload not used */ })

    // The component sets isLoading true synchronously when the handler runs, so the spinner class should be present
    await waitFor(() => expect(container.querySelector('.animate-spin')).toBeTruthy())

  // Wait slightly more than the component's 1s debounce so the loading state clears
  await new Promise((res) => setTimeout(res, 1100))

  // After timers run, spinner should disappear and Live should still be visible
  await waitFor(() => expect(container.querySelector('.animate-spin')).toBeFalsy())
    expect(screen.getByText('Live')).toBeInTheDocument()
  })
})
