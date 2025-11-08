import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Inline mock for supabase to keep test self-contained and satisfy vi.mock hoisting
vi.mock('../../lib/supabase', () => {
  const prayers = [
    {
      id: 'p1',
      title: 'Prayer One',
      prayer_for: 'Park Renovation',
      description: 'Please pray for the park',
      requester: 'Alice',
      status: 'current',
      approval_status: 'approved',
      created_at: '2025-01-01T12:00:00Z',
      prayer_updates: []
    },
    {
      id: 'p2',
      title: 'Prayer Two',
      prayer_for: 'Community Center',
      description: 'Pray for our center',
      requester: 'Bob',
      status: 'current',
      approval_status: 'approved',
      created_at: '2025-01-02T12:00:00Z',
      prayer_updates: []
    }
  ]

  // Minimal chainable builder that is thenable (awaitable)
  const builder = {
    eq: () => builder,
    gte: () => builder,
    order: () => builder,
    select: () => builder,
    then(cb: any) { return cb({ data: prayers, error: null }) }
  }

  return {
    supabase: {
      from: vi.fn(() => builder),
      channel: vi.fn(() => ({ on: () => ({ subscribe: async () => ({ data: null, error: null }) }) })),
      removeChannel: vi.fn()
    }
  }
})

import { PrayerPresentation } from '../PrayerPresentation'

describe('PrayerPresentation (focused)', () => {
  it('renders a prayer and allows navigation and opening settings', async () => {
    const user = userEvent.setup()

    render(<PrayerPresentation />)

    // Wait for first prayer to appear (prayer_for shown prominently)
    await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

    // Settings button toggles the settings panel
    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)
    expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument()

  // Close settings: find the close button next to the Settings heading to avoid matching other buttons
  const settingsHeading = screen.getByRole('heading', { name: /Settings/i })
  const header = settingsHeading.parentElement
  const closeBtn = header?.querySelector('button') as HTMLButtonElement
  if (closeBtn) await user.click(closeBtn)

    // Navigate to next prayer
    const nextBtn = screen.getByTitle('Next Prayer')
    await user.click(nextBtn)

    // Now the second prayer_for should be visible
    await waitFor(() => expect(screen.getByText('Community Center')).toBeInTheDocument())
  })
})
