import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, expect } from 'vitest'

// Use shared supabase mock with seeded prayers to provide chainable methods
vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock');
  
  // Use dates within the current week for test data so it passes the 'last week' filter
  const now = new Date()
  // Set time to noon to avoid edge cases with time filtering
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).toISOString()
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0, 0).toISOString()
  
  const prayers = [
    {
      id: 'm1',
      title: 'Mobile Prayer One',
      prayer_for: 'Neighborhood Safety',
      description: 'Keep the neighborhood safe',
      requester: 'Carol',
      status: 'current',
      approval_status: 'approved',
      created_at: today,
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
      created_at: yesterday,
      prayer_updates: []
    }
  ]

  const prompts = [
    {
      id: 'p1',
      title: 'Daily Prayer',
      type: 'Guidance',
      description: 'A daily prayer for guidance',
      created_at: today
    },
    {
      id: 'p2',
      title: 'Weekly Prayer',
      type: 'Healing',
      description: 'A weekly prayer for strength',
      created_at: yesterday
    }
  ]

  const prayerTypes = [
    {
      id: 'pt1',
      name: 'Guidance',
      display_order: 1,
      is_active: true,
      created_at: '2025-01-01T12:00:00Z',
      updated_at: '2025-01-01T12:00:00Z'
    },
    {
      id: 'pt2',
      name: 'Healing',
      display_order: 2,
      is_active: true,
      created_at: '2025-01-01T12:00:00Z',
      updated_at: '2025-01-01T12:00:00Z'
    }
  ]

  const sup = mod.createSupabaseMock({ fromData: { prayers, prayer_prompts: prompts, prayer_types: prayerTypes } }) as any;
  return { supabase: sup };
})

import { MobilePresentation } from '../MobilePresentation'

describe('MobilePresentation', () => {
  it('renders first prayer and supports basic navigation', async () => {
    const user = userEvent.setup()

    render(<MobilePresentation />)

    // Wait for first prayer to load (most recent is shown first)
    // m1 created today should be first, m2 created yesterday should be second
    await waitFor(() => expect(screen.getByText('Neighborhood Safety')).toBeInTheDocument())

    // Open settings and close it
    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)
    expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument()

    // Close using the close button in header
    const settingsHeading = screen.getByRole('heading', { name: /Settings/i })
    const headerBtn = settingsHeading.parentElement?.querySelector('button') as HTMLButtonElement
    if (headerBtn) await user.click(headerBtn)

    // Ensure settings closed
    await waitFor(() => expect(screen.queryByRole('heading', { name: /Settings/i })).toBeNull())
  })

  it('switches between content types', async () => {
    const user = userEvent.setup()
    render(<MobilePresentation />)

    // Wait for initial prayers to load (should show most recent prayer first)
    await waitFor(() => expect(screen.getByText('Neighborhood Safety')).toBeInTheDocument())

    // Open settings
    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    // Switch to prompts only - find the content type select specifically
    const contentSelect = screen.getByDisplayValue('Prayers')
    await user.selectOptions(contentSelect, 'prompts')

    // Close settings
    const settingsHeading = screen.getByRole('heading', { name: /Settings/i })
    const closeButton = settingsHeading.parentElement?.querySelector('button') as HTMLButtonElement
    if (closeButton) await user.click(closeButton)

    // Should show prompts now - wait for the prompts to load after content type change
    await waitFor(() => expect(screen.getByText('Daily Prayer')).toBeInTheDocument(), { timeout: 3000 })
  })

  it('toggles randomization', async () => {
    const user = userEvent.setup()
    render(<MobilePresentation />)

    // Wait for initial prayers to load
    await waitFor(() => expect(screen.getByText('Neighborhood Safety')).toBeInTheDocument())

    // Open settings
    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    // Enable randomization
    const randomizeCheckbox = screen.getByRole('checkbox', { name: /Randomize Order/i })
    await user.click(randomizeCheckbox)

    // Close settings
    const settingsHeading = screen.getByRole('heading', { name: /Settings/i })
    const closeButton = settingsHeading.parentElement?.querySelector('button') as HTMLButtonElement
    if (closeButton) await user.click(closeButton)

    // Should still show content
    await waitFor(() => {
      const hasPrayer1 = screen.queryByText('Neighborhood Safety')
      const hasPrayer2 = screen.queryByText('School Staff')
      expect(hasPrayer1 || hasPrayer2).toBeTruthy()
    })
  })

  it('switches themes', async () => {
    const user = userEvent.setup()
    render(<MobilePresentation />)

    // Wait for initial prayers to load
    await waitFor(() => expect(screen.getByText('Neighborhood Safety')).toBeInTheDocument())

    // Open settings
    const settingsButton = screen.getByTitle('Settings')
    await user.click(settingsButton)

    // Switch to dark theme
    const darkThemeButton = screen.getByRole('button', { name: /Dark/i })
    await user.click(darkThemeButton)

    // Close settings
    const settingsHeading = screen.getByRole('heading', { name: /Settings/i })
    const closeButton = settingsHeading.parentElement?.querySelector('button') as HTMLButtonElement
    if (closeButton) await user.click(closeButton)

    // Should still show content
    expect(screen.getByText('Neighborhood Safety')).toBeInTheDocument()
  })

  it('handles loading state', () => {
    render(<MobilePresentation />)

    // Should show loading initially
    expect(screen.getByText(/Loading prayers\.\.\./i)).toBeInTheDocument()
  })
})
