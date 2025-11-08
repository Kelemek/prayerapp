import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, expect } from 'vitest'

// Use shared supabase mock with seeded prayers to provide chainable methods
vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock');
  const prayers = [
    {
      id: 'm1',
      title: 'Mobile Prayer One',
      prayer_for: 'Neighborhood Safety',
      description: 'Keep the neighborhood safe',
      requester: 'Carol',
      status: 'current',
      approval_status: 'approved',
      created_at: '2025-02-01T12:00:00Z',
      prayer_updates: []
    },
    {
      id: 'm2',
      title: 'Mobile Prayer Two',
      prayer_for: 'School Staff',
      description: 'Pray for teachers',
      requester: 'Dan',
      status: 'current',
      approval_status: 'approved',
      created_at: '2025-02-02T12:00:00Z',
      prayer_updates: []
    }
  ]

  const sup = mod.createSupabaseMock({ fromData: { prayers } }) as any;
  return { supabase: sup };
})

import { MobilePresentation } from '../MobilePresentation'

describe('MobilePresentation (focused)', () => {
  it('renders first prayer, supports swipe to next, and toggles settings', async () => {
    const user = userEvent.setup()

    const { container } = render(<MobilePresentation />)

  // Wait for first prayer (newer prayers appear first)
  await waitFor(() => expect(screen.getByText('School Staff')).toBeInTheDocument())

  // Simulate a left swipe: touchStart at x=300 -> touchMove x=100 -> touchEnd
  // The touch handlers are on the scrollable container (class "flex-1"), not the outer .min-h-screen
  const touchTarget = container.querySelector('.flex-1') || container.querySelector('.min-h-screen') || container.firstChild
    if (!touchTarget) throw new Error('touch target not found')

  fireEvent.touchStart(touchTarget, { touches: [{ clientX: 300 }], targetTouches: [{ clientX: 300 }] })
  fireEvent.touchMove(touchTarget, { touches: [{ clientX: 100 }], targetTouches: [{ clientX: 100 }] })
    fireEvent.touchEnd(touchTarget)

  // After swipe, the next prayer_for should appear
  await waitFor(() => expect(screen.getByText('Neighborhood Safety')).toBeInTheDocument())

    // Open settings and close it
    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)
    expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument()

    // Close using the close button in header (select nearby button)
    const settingsHeading = screen.getByRole('heading', { name: /Settings/i })
    const headerBtn = settingsHeading.parentElement?.querySelector('button') as HTMLButtonElement
    if (headerBtn) await user.click(headerBtn)

    // Ensure settings closed by asserting heading is not present
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Settings/i })).toBeNull())
  })
})
