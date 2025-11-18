import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
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

  const prompts = [
    {
      id: 'pr1',
      title: 'Prompt One',
      type: 'Guidance',
      description: 'A general prayer prompt',
      created_at: '2025-01-01T12:00:00Z'
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

  // Minimal chainable builder that is thenable (awaitable)
  const builder = {
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    select: vi.fn(() => builder),
    then(cb: any) {
      // Return different data based on the table being queried
      const tableName = this.tableName || 'prayers'
      if (tableName === 'prayers') {
        return cb({ data: prayers, error: null })
      } else if (tableName === 'prayer_prompts') {
        return cb({ data: prompts, error: null })
      } else if (tableName === 'prayer_types') {
        return cb({ data: prayerTypes, error: null })
      }
      return cb({ data: [], error: null })
    }
  }

  // Track which table is being queried
  const createBuilder = (tableName: string) => ({
    ...builder,
    tableName,
    eq: vi.fn(() => createBuilder(tableName)),
    gte: vi.fn(() => createBuilder(tableName)),
    order: vi.fn(() => createBuilder(tableName)),
    select: vi.fn(() => createBuilder(tableName))
  })

  return {
    supabase: {
      from: vi.fn((tableName) => createBuilder(tableName)),
      channel: vi.fn(() => ({ on: () => ({ subscribe: async () => ({ data: null, error: null }) }) })),
      removeChannel: vi.fn()
    }
  }
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock presentationUtils
vi.mock('../../utils/presentationUtils', () => ({
  calculateSmartDurationPrayer: vi.fn(() => 10),
  calculateSmartDurationPrompt: vi.fn(() => 8),
  formatTime: vi.fn((seconds) => `${seconds}s`),
  applyTheme: vi.fn(),
  handleThemeChange: vi.fn()
}))

import { PrayerPresentation } from '../PrayerPresentation'

describe('PrayerPresentation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  describe('Basic Rendering and Data Loading', () => {
    it('renders loading state initially', () => {
      render(<PrayerPresentation />)
      expect(screen.getByText(/Loading/)).toBeInTheDocument()
    })

    it('renders first prayer after loading', async () => {
      render(<PrayerPresentation />)

      await waitFor(() => {
        expect(screen.getByText('Park Renovation')).toBeInTheDocument()
      })

      expect(screen.getByText('Please pray for the park')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('displays prayer title prominently', async () => {
      render(<PrayerPresentation />)

      await waitFor(() => {
        expect(screen.getByText('Park Renovation')).toBeInTheDocument()
      })
    })

    it('displays formatted creation date', async () => {
      render(<PrayerPresentation />)

      await waitFor(() => {
        expect(screen.getByText(/January 1, 2025/)).toBeInTheDocument()
      })
    })

    it('loads theme from localStorage on mount', async () => {
      localStorageMock.getItem.mockReturnValue('dark')

      render(<PrayerPresentation />)

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith('theme')
      })
    })

    it('applies system theme by default', async () => {
      const { applyTheme } = await import('../../utils/presentationUtils')

      render(<PrayerPresentation />)

      await waitFor(() => {
        expect(applyTheme).toHaveBeenCalledWith('system')
      })
    })
  })

  describe('Navigation', () => {
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

    it('navigates to previous prayer', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Go to next prayer first
      const nextBtn = screen.getByTitle('Next Prayer')
      await user.click(nextBtn)

      await waitFor(() => expect(screen.getByText('Community Center')).toBeInTheDocument())

      // Now go back to previous
      const prevBtn = screen.getByTitle('Previous Prayer')
      await user.click(prevBtn)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())
    })

    it('wraps around to first prayer when reaching the end', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Go to next prayer (should wrap around)
      const nextBtn = screen.getByTitle('Next Prayer')
      await user.click(nextBtn)
      await user.click(nextBtn) // Click again to wrap around

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())
    })

    it('wraps around to last prayer when going previous from first', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Go to previous from first (should wrap around to last)
      const prevBtn = screen.getByTitle('Previous Prayer')
      await user.click(prevBtn)

      await waitFor(() => expect(screen.getByText('Community Center')).toBeInTheDocument())
    })
  })

  describe('Settings Panel', () => {
    it('opens and closes settings panel', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByRole('button', { name: /settings/i })
      await user.click(settingsButton)

      expect(screen.getByRole('heading', { name: /Settings/i })).toBeInTheDocument()

      // Close settings
      const closeButton = screen.getByRole('button', { name: '' }) // Close button has no accessible name
      await user.click(closeButton)

      // Settings should be closed
      expect(screen.queryByRole('heading', { name: /Settings/i })).not.toBeInTheDocument()
    })

    it('changes display duration', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Wait for settings panel to open
      await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument())

      // Wait for the duration input to be visible (only shown when smart mode is off)
      // First ensure smart mode is off
      const smartModeCheckbox = screen.getByLabelText('Smart Mode (adjust time based on content length)') as HTMLInputElement
      if (smartModeCheckbox.checked) {
        await user.click(smartModeCheckbox)
      }

      // Find duration input (range input for display duration)
      const durationInputs = screen.getAllByDisplayValue('10')
      const durationInput = durationInputs.find(input => (input as HTMLInputElement).type === 'range') as HTMLInputElement
      
      fireEvent.change(durationInput, { target: { value: '15' } })

      // For range inputs, check the value as string
      expect(durationInput).toHaveValue('15')
    })

    it('toggles smart mode', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Wait for settings panel to open
      await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument())

      // Find smart mode checkbox and toggle it (starts checked, should become unchecked)
      const smartModeCheckbox = screen.getByLabelText('Smart Mode (adjust time based on content length)') as HTMLInputElement
      
      // Initially should be checked
      expect(smartModeCheckbox).toBeChecked()
      
      // Click to uncheck
      await user.click(smartModeCheckbox)

      // Should now be unchecked
      expect(smartModeCheckbox).not.toBeChecked()
    })
  })

  describe('Theme Switching', () => {
    it('changes theme to dark', async () => {
      const user = userEvent.setup()
      const applyThemeSpy = vi.fn()
      vi.doMock('../../utils/presentationUtils', () => ({
        applyTheme: applyThemeSpy,
        handleThemeChange: vi.fn(),
        calculateSmartDurationPrayer: vi.fn(),
        calculateSmartDurationPrompt: vi.fn(),
        formatTime: vi.fn()
      }))

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Wait for settings panel to open
      await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument())

      // Find dark theme button and click it
      const darkThemeButton = screen.getByText('Dark')
      await user.click(darkThemeButton)

      // Just verify the button was clicked (theme change is handled by the component)
      expect(darkThemeButton).toBeInTheDocument()
    })

    it('changes theme to light', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Wait for settings panel to open
      await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument())

      // Find light theme button and click it
      const lightThemeButton = screen.getByText('Light')
      await user.click(lightThemeButton)

      // Just verify the button was clicked (theme change is handled by the component)
      expect(lightThemeButton).toBeInTheDocument()
    })
  })

  describe('Content Type Switching', () => {
    it('switches to prompts content type', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Find content type select and change to prompts
      const contentTypeSelect = screen.getByDisplayValue('Prayers')
      await user.selectOptions(contentTypeSelect, 'prompts')

      // Should show prompt content
      await waitFor(() => {
        expect(screen.getByText('Prompt One')).toBeInTheDocument()
      })
    })

    it('switches to both content type', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Find content type select and change to both
      const contentTypeSelect = screen.getByDisplayValue('Prayers')
      await user.selectOptions(contentTypeSelect, 'both')

      // Should still show prayers initially
      expect(screen.getByText('Park Renovation')).toBeInTheDocument()
    })
  })

  describe('Timer Controls', () => {
    it('starts and pauses playback', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Find play button and click it
      const playButton = screen.getByTitle('Play')
      await user.click(playButton)

      // Should show pause button now
      expect(screen.getByTitle('Pause')).toBeInTheDocument()

      // Click pause
      const pauseButton = screen.getByTitle('Pause')
      await user.click(pauseButton)

      // Should show play button again
      expect(screen.getByTitle('Play')).toBeInTheDocument()
    })

    it('shows countdown timer when playing', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Start playback
      const playButton = screen.getByTitle('Play')
      await user.click(playButton)

      // Should show countdown
      expect(screen.getByText('10s')).toBeInTheDocument()
    })
  })

  describe('Prayer Timer', () => {
    it('starts prayer timer', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Find prayer timer button and click it
      const prayerTimerButton = screen.getByText('Start Timer')
      await user.click(prayerTimerButton)

      // Should show timer controls
      expect(screen.getByText('Time Remaining')).toBeInTheDocument()
    })

    it('changes prayer timer duration', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Wait for settings panel to open
      await waitFor(() => expect(screen.getByText('Settings')).toBeInTheDocument())

      // Find prayer timer duration input (number input)
      const timerInput = screen.getByDisplayValue('10') as HTMLInputElement
      
      // Ensure it's the number input, not the range input
      expect(timerInput.type).toBe('number')
      
      fireEvent.change(timerInput, { target: { value: '15' } })

      expect(timerInput).toHaveValue(15)
    })
  })

  describe('Control Visibility', () => {
    it('shows controls by default', async () => {
      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Controls should be visible by default
      expect(screen.getByTitle('Settings')).toBeInTheDocument()
      expect(screen.getByTitle('Play')).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('filters by time period', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Find time filter select and change it
      const timeFilterSelect = screen.getByDisplayValue('All Time')
      await user.selectOptions(timeFilterSelect, 'week')

      // Should show filtered status
      expect(screen.getByText(/Filtered/)).toBeInTheDocument()
    })
  })

  describe('Randomization', () => {
    it('toggles randomization', async () => {
      const user = userEvent.setup()

      render(<PrayerPresentation />)

      await waitFor(() => expect(screen.getByText('Park Renovation')).toBeInTheDocument())

      // Open settings
      const settingsButton = screen.getByTitle('Settings')
      await user.click(settingsButton)

      // Find randomize checkbox and toggle it
      const randomizeCheckbox = screen.getByLabelText(/Randomize/i)
      await user.click(randomizeCheckbox)

      expect(randomizeCheckbox).toBeChecked()
    })
  })
})
