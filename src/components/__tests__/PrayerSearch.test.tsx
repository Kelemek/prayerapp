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
      from: vi.fn((table: string) => {
        const builder: any = {}
        builder._table = table
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
        builder.insert = vi.fn((data: any) => {
          builder._insertData = data
          return builder
        })
        builder.single = vi.fn(() => {
          // Handle insert operation
          if (builder._insertData && builder._table === 'prayer_updates') {
            const newUpdate = {
              id: `update-${Date.now()}`,
              created_at: new Date().toISOString(),
              ...builder._insertData
            }
            return Promise.resolve({ data: newUpdate, error: null })
          }
          return Promise.resolve({ data: null, error: null })
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
  // Also update the global fetch mock to return this data with URL param filtering
  global.fetch = vi.fn().mockImplementation((url: string) => {
    let filteredData = [...data];
    
    // Parse URL params for filtering
    try {
      const urlObj = new URL(url);
      const statusParam = urlObj.searchParams.get('status');
      const approvalParam = urlObj.searchParams.get('approval_status');
      
      // Apply status filter (e.g., "eq.current")
      if (statusParam && statusParam.startsWith('eq.')) {
        const statusValue = statusParam.replace('eq.', '');
        filteredData = filteredData.filter(p => p.status === statusValue);
      }
      
      // Apply approval filter (e.g., "eq.approved")
      if (approvalParam && approvalParam.startsWith('eq.')) {
        const approvalValue = approvalParam.replace('eq.', '');
        filteredData = filteredData.filter(p => p.approval_status === approvalValue);
      }
    } catch (e) {
      // If URL parsing fails, just return all data
    }
    
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(filteredData),
    });
  });
}

describe('PrayerSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window.confirm mock if any tests manipulate it
    // @ts-ignore
    global.confirm = vi.fn(() => true)
    // Default fetch mock returns empty array
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
    setMockPrayerData([])
  })

  describe('Rendering', () => {
    it('renders the search component with header', () => {
      render(<PrayerSearch />)
      expect(screen.getByRole('heading', { name: /prayer editor/i })).toBeDefined()
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

  describe('Adding Prayer Updates', () => {
    it('shows add update button when prayer is expanded', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]
      
      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      // Search to show the prayer
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })
      
      // Click the prayer card to expand it
      const prayerCardButton = screen.getByRole('button', { name: /Test Prayer.*John/ })
      await user.click(prayerCardButton)
      
      // Should show Add Update button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add update/i })).toBeDefined()
      })
    })

    it('allows adding a new update to a prayer', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]
      
      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      // Search and expand
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })
      
      const prayerCardButton = screen.getByRole('button', { name: /Test Prayer.*John/ })
      await user.click(prayerCardButton)
      
      // Click Add Update button
      const addUpdateButton = await screen.findByRole('button', { name: /add update/i })
      await user.click(addUpdateButton)
      
      // Should show the update form
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/enter the update content/i)).toBeDefined()
        expect(screen.getByPlaceholderText(/your name/i)).toBeDefined()
        expect(screen.getByPlaceholderText(/your.email@example.com/i)).toBeDefined()
      })
      
      // Fill in the form
      const contentInput = screen.getByPlaceholderText(/enter the update content/i)
      const authorInput = screen.getByPlaceholderText(/your name/i)
      const emailInput = screen.getByPlaceholderText(/your.email@example.com/i)
      
      await user.type(contentInput, 'Prayer has been answered!')
      await user.type(authorInput, 'Admin User')
      await user.type(emailInput, 'admin@example.com')
      
      // Save the update
      const saveButton = screen.getByRole('button', { name: /save update/i })
      await user.click(saveButton)
      
      // Should show the new update in the list
      await waitFor(() => {
        expect(screen.getByText('Prayer has been answered!')).toBeDefined()
        expect(screen.getByText(/Admin User/)).toBeDefined()
      })
    })

    it('can cancel adding an update', async () => {
      const user = userEvent.setup()
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ]
      
      setMockPrayerData(mockPrayers)
      render(<PrayerSearch />)
      
      // Search and expand
      const searchButton = screen.getByRole('button', { name: /^search$/i })
      await user.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined()
      })
      
      const prayerCardButton = screen.getByRole('button', { name: /Test Prayer.*John/ })
      await user.click(prayerCardButton)
      
      // Click Add Update button
      const addUpdateButton = await screen.findByRole('button', { name: /add update/i })
      await user.click(addUpdateButton)
      
      // Fill in some content
      const contentInput = await screen.findByPlaceholderText(/enter the update content/i)
      await user.type(contentInput, 'Test content')
      
      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      // Should go back to showing Add Update button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add update/i })).toBeDefined()
      })
      
      // Form content should be cleared
      const addUpdateButtonAgain = screen.getByRole('button', { name: /add update/i })
      await user.click(addUpdateButtonAgain)
      
      const contentInputAfter = await screen.findByPlaceholderText(/enter the update content/i)
      expect(contentInputAfter).toHaveValue('')
    })
  })
})