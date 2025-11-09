import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrayerSearch } from '../PrayerSearch'
import { supabase } from '../../lib/supabase'

// Mock Supabase with a builder-style API. Tests will set mockPrayerData per-case.
let mockPrayerData: any[] = []

vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => {
        const builder: any = {}
        builder.select = vi.fn(() => builder)
        builder.or = vi.fn(() => builder)
        builder.eq = vi.fn((column: string, value: any) => {
          if (column === 'id') {
            builder._eqId = value
            // If we have pending updates, apply them now
            if (builder._updates) {
              const prayerIndex = mockPrayerData.findIndex(p => p.id === value)
              if (prayerIndex !== -1) {
                mockPrayerData[prayerIndex] = { ...mockPrayerData[prayerIndex], ...builder._updates }
              }
              const updatedPrayer = mockPrayerData[prayerIndex]
              builder._updates = null // Clear pending updates
              return Promise.resolve({ data: updatedPrayer, error: null })
            }
          } else {
            // Store filter criteria
            builder._filters = builder._filters || {}
            builder._filters[column] = value
          }
          return builder
        })
        builder.order = vi.fn(() => builder)
        builder.update = vi.fn((updates: any) => {
          builder._updates = updates
          return builder
        })
        // Store the eq value for update operations
        builder._eqId = null
        // The last chainable call (limit/select) resolves to the data
        builder.limit = vi.fn(() => {
          let filteredData = [...mockPrayerData]
          
          // Apply filters
          if (builder._filters) {
            if (builder._filters.status) {
              filteredData = filteredData.filter(p => p.status === builder._filters.status)
            }
            if (builder._filters.approval_status) {
              filteredData = filteredData.filter(p => p.approval_status === builder._filters.approval_status)
            }
          }
          
          return Promise.resolve({ data: filteredData, error: null })
        })
        builder.in = vi.fn(() => Promise.resolve({ data: null, error: null }))
        return builder
      }),
    },
  }
})

const setMockPrayerData = (data: any[]) => {
  mockPrayerData = data
}

describe('PrayerSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window.confirm mock if any tests manipulate it
    // @ts-ignore
    global.confirm = vi.fn(() => true)
    setMockPrayerData([])
  })

  describe('Rendering', () => {
    it('renders the search component with header', () => {
      render(<PrayerSearch />)
      expect(screen.getByRole('heading', { name: /prayer search & log/i })).toBeDefined()
    })

    it('displays the description text', () => {
      render(<PrayerSearch />)
      // match a fragment because the sentence may be wrapped
      expect(screen.getByText((content, node) => content.includes('Search and filter prayers by'))).toBeDefined()
    })

    it('renders search input field', () => {
      render(<PrayerSearch />)
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i) as HTMLInputElement
      expect(searchInput).toBeDefined()
      expect(searchInput.type).toBe('text')
    })

    it('renders search button', () => {
      render(<PrayerSearch />)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      expect(searchButton).toBeDefined()
    })

    it('displays warning message about permanent deletion', () => {
      render(<PrayerSearch />)
      expect(screen.getByText(/warning/i)).toBeDefined()
      expect(screen.getByText(/deleting prayers is permanent/i)).toBeDefined()
    })

    it('search button is enabled even when search term is empty (filters can be used)', () => {
      render(<PrayerSearch />)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      expect(searchButton).toHaveProperty('disabled', false)
    })
  })

  describe('Search Functionality', () => {
    it('allows typing in search input', async () => {
      const user = userEvent.setup()
      render(<PrayerSearch />)
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i) as HTMLInputElement
      await user.type(searchInput, 'John')
      expect(searchInput.value).toBe('John')
    })

    it('performs search when search button is clicked', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'John')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
        expect(screen.getByText(/John Doe/)).toBeDefined()
      })
    })

    it('performs search when Enter key is pressed', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      await user.type(searchInput, 'John{Enter}')

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })
    })

    it('displays "no prayers found" message when search returns empty', async () => {
      const user = userEvent.setup()
      setMockPrayerData([])
      render(<PrayerSearch />)
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'NonexistentUser')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/no prayers found/i)).toBeDefined()
      })
    })
  })

  describe('Filtering Functionality', () => {
    it('filters by prayer status', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Current Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
        {
          id: '2',
          title: 'Answered Prayer',
          requester: 'Jane Smith',
          email: 'jane@example.com',
          status: 'answered',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      // Select "current" status filter
      const statusSelect = screen.getByDisplayValue('Select status...')
      await user.selectOptions(statusSelect, 'current')
      
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Current Prayer')).toBeDefined()
        expect(screen.queryByText('Answered Prayer')).toBeNull()
      })
    })

    it('filters by approval status', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Approved Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
        {
          id: '2',
          title: 'Pending Prayer',
          requester: 'Jane Smith',
          email: 'jane@example.com',
          status: 'current',
          approval_status: 'pending',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      // Select "approved" approval filter
      const approvalSelect = screen.getByDisplayValue('Select approval...')
      await user.selectOptions(approvalSelect, 'approved')
      
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Approved Prayer')).toBeDefined()
        expect(screen.queryByText('Pending Prayer')).toBeNull()
      })
    })
  })

  describe('Bulk Selection and Deletion', () => {
    it('allows selecting individual prayers', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer 1',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
        {
          id: '2',
          title: 'Test Prayer 2',
          requester: 'Jane Smith',
          email: 'jane@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'Test')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Test Prayer 1')).toBeDefined()
      })

      // Select first prayer checkbox
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // Click the first individual prayer checkbox

      // Check that selection count is shown
      expect(screen.getByText('1 selected')).toBeDefined()
    })

    it('allows selecting all prayers', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer 1',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
        {
          id: '2',
          title: 'Test Prayer 2',
          requester: 'Jane Smith',
          email: 'jane@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'Test')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Test Prayer 1')).toBeDefined()
      })

      // Click select all checkbox
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0]) // First checkbox is select all

      // Check that all prayers are selected
      expect(screen.getByText('2 selected')).toBeDefined()
    })

    it('shows delete button when prayers are selected', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'Test')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })

      // Select prayer
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      // Delete button should appear
      expect(screen.getByRole('button', { name: /delete \(1\)/i })).toBeDefined()
    })

    it('requires confirmation before deleting prayers', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'Test')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })

      // Select prayer
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete \(1\)/i })
      await user.click(deleteButton)

      // Should show confirmation dialog
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1 prayer(s)? This action cannot be undone.')
    })
  })

  describe('Card Expansion and Editing', () => {
    it('expands and collapses prayer cards', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          description: 'Test description',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'Test')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })

      // Initially description should not be visible
      expect(screen.queryByText('Test description')).toBeNull()

      // Click the prayer card to expand
      const prayerCardButton = screen.getByRole('button', { name: /Test Prayer.*Requester.*John Doe/ })
      await user.click(prayerCardButton)

      // Description should now be visible
      expect(screen.getByText('Test description')).toBeDefined()
    })

    it('allows editing prayer details', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          description: 'Test description',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'Test')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })

      // Expand card first
      const prayerCardButton = screen.getByRole('button', { name: /Test Prayer.*Requester.*John Doe/ })
      await user.click(prayerCardButton)

      // Click edit button
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)

      // Should show edit form
      expect(screen.getByDisplayValue('Test Prayer')).toBeDefined()
      expect(screen.getByDisplayValue('John Doe')).toBeDefined()
    })

    it('saves edited prayer details', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          description: 'Test description',
          prayer_updates: [],
        },
      ]

      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.type(searchInput, 'Test')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })

      // Expand and edit
      const prayerCardButton = screen.getByRole('button', { name: /Test Prayer.*Requester.*John Doe/ })
      await user.click(prayerCardButton)
      
      const editButton = screen.getByRole('button', { name: /edit/i })
      await user.click(editButton)

      // Change title
      const titleInput = screen.getByDisplayValue('Test Prayer')
      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Prayer Title')

      // Save changes
      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      // Should show success message or updated title
      await waitFor(() => {
        // Check that we're no longer in edit mode (title input should not exist)
        expect(screen.queryByDisplayValue('Updated Prayer Title')).toBeNull()
        // And the title should appear in the card header
        const titleElements = screen.getAllByText('Updated Prayer Title')
        expect(titleElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Error Handling', () => {
    it('allows empty search to show all prayers (wildcard search)', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Prayer 1',
          requester: 'User 1',
          email: 'user1@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
        {
          id: '2',
          title: 'Prayer 2',
          requester: 'User 2',
          email: 'user2@example.com',
          status: 'answered',
          approval_status: 'approved',
          created_at: '2025-01-02T00:00:00Z',
          prayer_updates: [],
        },
      ]
      
      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      
      // Click search without entering anything (wildcard search)
      await user.click(searchButton)

      // Should show all prayers
      await waitFor(() => {
        expect(screen.getByText('Prayer 1')).toBeDefined()
        expect(screen.getByText('Prayer 2')).toBeDefined()
      })
    });
  })

  describe('Loading States', () => {
    it('shows initial empty state', () => {
      render(<PrayerSearch />)
      
      // Should show initial guidance text
      expect(screen.getByText('Search Prayers & Audit Log')).toBeInTheDocument();
      expect(screen.getByText(/Select a filter from the dropdowns/)).toBeInTheDocument();
    });
  })
})