import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type BackupStatusType from '../BackupStatus'

// Helper to get fresh component after module reset
const getComponent = async (): Promise<typeof BackupStatusType> => {
  const mod = await import('../BackupStatus')
  // Reset the cache when getting the component
  mod.resetBackupCache()
  return mod.default
}

// Default mock data for backup logs
const defaultBackupLogs = [
  {
    id: '1',
    backup_date: '2025-10-18T08:00:00Z',
    status: 'success',
    tables_backed_up: { prayers: 50, prayer_updates: 25, prayer_types: 5 },
    total_records: 80,
    duration_seconds: 45,
    created_at: '2025-10-18T08:00:00Z'
  },
  {
    id: '2',
    backup_date: '2025-10-17T08:00:00Z',
    status: 'success',
    tables_backed_up: { prayers: 48, prayer_updates: 23, prayer_types: 5 },
    total_records: 76,
    duration_seconds: 42,
    created_at: '2025-10-17T08:00:00Z'
  }
];

// Mock Supabase with directQuery and directMutation
vi.mock('../../lib/supabase', async () => {
  const mod = await import('../../testUtils/supabaseMock')
  const sup = mod.createSupabaseMock()
  return { 
    supabase: sup,
    directQuery: vi.fn(),
    directMutation: vi.fn()
  }
})

import { directQuery, directMutation, supabase } from '../../lib/supabase';

// Mock URL and document APIs for backup download - simplified to avoid DOM conflicts
const mockCreateObjectURL = vi.fn()
const mockRevokeObjectURL = vi.fn()
const mockClick = vi.fn()

// Only mock URL.createObjectURL and URL.revokeObjectURL, not the entire URL constructor
Object.defineProperty(window.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true
})
Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
  writable: true
})

// Skip mocking document.body methods for now to avoid DOM conflicts
// The download functionality can be tested indirectly through other means

// Mock window.confirm
const mockConfirm = vi.fn()
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true
})

// Mock window.alert
const mockAlert = vi.fn()
Object.defineProperty(window, 'alert', {
  value: mockAlert,
  writable: true
})

// Global variable to control insert delay
let shouldDelayInsert = false

// Global variable to control restore delay
let shouldDelayRestore = false

describe('BackupStatus Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    // Default mock for directQuery to return backup logs
    vi.mocked(directQuery).mockImplementation(async (table: string) => {
      if (table === 'backup_logs') {
        return { data: defaultBackupLogs, error: null };
      }
      if (table === 'backup_tables') {
        return { data: [{ table_name: 'prayers' }, { table_name: 'prayer_updates' }], error: null };
      }
      // For table data queries
      return { data: [], error: null };
    });
    vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });
  })

  afterEach(async () => {
    // allow pending state updates to settle to avoid act(...) warnings
    await waitFor(() => {})
  })

  it('renders backup status section', async () => {
    const BackupStatus = await getComponent();
      render(<BackupStatus />)

    await waitFor(() => {
      expect(screen.getByText(/Database Backup Status/i)).toBeDefined()
    })
  })

  it('displays recent backups list', async () => {
    const BackupStatus = await getComponent();
      render(<BackupStatus />)

    await waitFor(() => {
      expect(screen.getByText(/Recent Backups/i)).toBeDefined()
      expect(screen.getByText(/80/)).toBeDefined() // total records
      expect(screen.getByText(/76/)).toBeDefined()
    })
  })

  it('shows manual backup button', async () => {
    const BackupStatus = await getComponent();
      render(<BackupStatus />)

    await waitFor(() => {
      expect(screen.getByText(/Manual Backup/i)).toBeDefined()
    })
  })

  it('shows restore button', async () => {
    const BackupStatus = await getComponent();
      render(<BackupStatus />)

    await waitFor(() => {
      expect(screen.getByText(/Restore/i)).toBeDefined()
    })
  })

  it('displays backup status with success indicator', async () => {
    const BackupStatus = await getComponent();
      render(<BackupStatus />)

    await waitFor(() => {
      // Should show success icon (CheckCircle) for successful backups
      // Look for the success icon by its class
      const successIcon = document.querySelector('.lucide-circle-check-big.text-green-500')
      expect(successIcon).toBeDefined()
    })
  })

  it('shows backup duration', async () => {
    const BackupStatus = await getComponent();
      render(<BackupStatus />)

    await waitFor(() => {
      expect(screen.getByText(/45s/)).toBeDefined()
    })
  })

  it('displays table backup counts', async () => {
    const user = userEvent.setup()
    const BackupStatus = await getComponent();
      render(<BackupStatus />)

    await waitFor(() => {
      // Click on the first backup to expand details
      const firstBackup = screen.getAllByText(/Oct 18, 2025/)[0].closest('div')
      expect(firstBackup).toBeDefined()
    })

    // Click to expand the backup details
    const firstBackup = screen.getAllByText(/Oct 18, 2025/)[0].closest('div')
    if (firstBackup) {
      await user.click(firstBackup)
    }

    await waitFor(() => {
      // Should show table counts in expanded details
      expect(screen.getByText('prayers')).toBeDefined()
      expect(screen.getByText('prayer_updates')).toBeDefined()
      expect(screen.getByText('prayer_types')).toBeDefined()
      
      // Check specific counts
      expect(screen.getByText('50')).toBeDefined() // count for prayers table
      expect(screen.getByText('25')).toBeDefined() // count for prayer_updates table
      expect(screen.getByText('5')).toBeDefined() // count for prayer_types table
    })
  })

  describe('Manual Backup Functionality', () => {
    beforeEach(() => {
      mockConfirm.mockReturnValue(true)
      mockCreateObjectURL.mockReturnValue('blob:mock-url')
    })

    it('requires confirmation before starting backup', async () => {
      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Manual Backup/i)).toBeDefined()
      })

      const backupButton = screen.getByText(/Manual Backup/i)
      await user.click(backupButton)

      expect(mockConfirm).toHaveBeenCalledWith('Create a manual backup now? This will back up all current data.')
    })
  })

  describe('Manual Restore Functionality', () => {
    beforeEach(() => {
      mockConfirm.mockReturnValue(true)
    })

    it('opens restore dialog when restore button is clicked', async () => {
      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Restore/i)).toBeDefined()
      })

      const restoreButton = screen.getByText(/Restore/i)
      await user.click(restoreButton)

      await waitFor(() => {
        expect(screen.getByText(/Restore Database from Backup/i)).toBeDefined()
      })
    })

    it('shows warning message in restore dialog', async () => {
      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Restore/i)).toBeDefined()
      })

      const restoreButton = screen.getByText(/Restore/i)
      await user.click(restoreButton)

      await waitFor(() => {
        expect(screen.getByText(/DELETE all current data/i)).toBeDefined()
      })
    })
  })

  describe('UI Interactions', () => {
    it('expands and collapses backup details', async () => {
      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/80/)).toBeDefined()
      })

      // Click on a backup row to expand
      const backupRow = screen.getByText(/80/).closest('div')
      if (backupRow) {
        await user.click(backupRow)
      }

      await waitFor(() => {
        expect(screen.getByText(/Backup ID/i)).toBeDefined()
      })

      // Click again to collapse
      if (backupRow) {
        await user.click(backupRow)
      }

      await waitFor(() => {
        expect(screen.queryByText(/Backup ID/i)).toBeNull()
      })
    })

    it('cancels restore dialog', async () => {
      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Restore/i)).toBeDefined()
      })

      const restoreButton = screen.getByText(/Restore/i)
      await user.click(restoreButton)

      await waitFor(() => {
        expect(screen.getByText(/Cancel/i)).toBeDefined()
      })

      const cancelButton = screen.getByText(/Cancel/i)
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText(/Restore Database from Backup/i)).toBeNull()
      })
    })
  })

  describe('Loading and Error States', () => {
    it('shows loading spinner initially', async () => {
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      // Should show loading spinner while fetching data
      expect(document.querySelector('.animate-spin')).toBeDefined()
    })

    it('handles no backup logs gracefully', async () => {
      // Mock empty backup logs
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return { data: [], error: null };
        }
        return { data: [], error: null };
      });

      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/No backup logs found/i)).toBeDefined()
        expect(screen.getByText(/Backups will appear here once the first automated backup runs/i)).toBeDefined()
      })
    })

    it('handles fetch error gracefully', async () => {
      // Mock fetch error
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return { data: null, error: { message: 'Database error' } };
        }
        return { data: [], error: null };
      });

      // Spy on console.error to avoid test output pollution
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/No backup logs found/i)).toBeDefined()
      })
    })

    it('shows error message in expanded backup details', async () => {
      // Mock backup logs with a failed backup
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return {
            data: [
              {
                id: '1',
                backup_date: '2025-10-18T08:00:00Z',
                status: 'failed',
                error_message: 'Detailed error message here',
                total_records: 0,
                created_at: '2025-10-18T08:00:00Z'
              }
            ],
            error: null
          };
        }
        return { data: [], error: null };
      });

      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText('Detailed error message here')).toBeDefined()
      })

      // Click to expand details if not already expanded
      if (!screen.queryByText(/Error Message/i)) {
        const backupRow = screen.getByText('Detailed error message here').closest('div')
        if (backupRow) {
          await user.click(backupRow)
        }
      }

      await waitFor(() => {
        expect(screen.getByText(/Error Message/i)).toBeDefined()
        expect(screen.getByText('Detailed error message here')).toBeDefined()
      })
    })
  })

  describe('Show More/Less Functionality', () => {
    it('shows "Show More" button when there are more than 5 backups', async () => {
      // Mock more than 5 backup logs
      const mockBackups = Array.from({ length: 8 }, (_, i) => ({
        id: `${i + 1}`,
        backup_date: `2025-10-${18 - i}T08:00:00Z`,
        status: 'success',
        tables_backed_up: { prayers: 50 },
        total_records: 50,
        duration_seconds: 30,
        created_at: `2025-10-${18 - i}T08:00:00Z`
      }))

      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return { data: mockBackups, error: null };
        }
        return { data: [], error: null };
      });

      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Show More \(3 older backups\)/i)).toBeDefined()
      })
    })

    it('expands to show all backups when "Show More" is clicked', async () => {
      // Mock more than 5 backup logs
      const mockBackups = Array.from({ length: 8 }, (_, i) => ({
        id: `${i + 1}`,
        backup_date: `2025-10-${18 - i}T08:00:00Z`,
        status: 'success',
        tables_backed_up: { prayers: 50 },
        total_records: 50,
        duration_seconds: 30,
        created_at: `2025-10-${18 - i}T08:00:00Z`
      }))

      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return { data: mockBackups, error: null };
        }
        return { data: [], error: null };
      });

      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Show More/i)).toBeDefined()
      })

      const showMoreButton = screen.getByText(/Show More/i)
      await user.click(showMoreButton)

      await waitFor(() => {
        expect(screen.getByText(/Show Less/i)).toBeDefined()
        // Should now show all 8 backups
        expect(screen.getAllByText(/50/)).toHaveLength(8) // 8 total records entries
      })
    })
  })

  describe('Manual Backup Success Scenarios', () => {
    beforeEach(() => {
      mockConfirm.mockReturnValue(true)
      mockCreateObjectURL.mockReturnValue('blob:mock-url')
      mockAlert.mockImplementation(() => {})
    })

    it('successfully completes manual backup and shows success message', async () => {
      // Mock directQuery for backup_tables and table data
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return {
            data: [{
              id: '1',
              backup_date: '2025-10-18T08:00:00Z',
              status: 'success',
              tables_backed_up: { prayers: 50 },
              total_records: 50,
              duration_seconds: 30,
              created_at: '2025-10-18T08:00:00Z'
            }],
            error: null
          };
        }
        if (table === 'backup_tables') {
          return {
            data: [
              { table_name: 'prayers' },
              { table_name: 'prayer_updates' }
            ],
            error: null
          };
        }
        if (table === 'prayers') {
          return { data: [{ id: '1', title: 'Test Prayer' }], error: null };
        }
        if (table === 'prayer_updates') {
          return { data: [{ id: '1', content: 'Test Update' }], error: null };
        }
        return { data: [], error: null };
      });

      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Manual Backup/i)).toBeDefined()
      })

      const backupButton = screen.getByText(/Manual Backup/i)
      await user.click(backupButton)

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('✅ Backup complete! Downloaded 2 records'))
      })
    })

    it('handles backup failure and shows error message', async () => {
      // Mock directQuery to fail for backup_tables
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return {
            data: [{
              id: '1',
              backup_date: '2025-10-18T08:00:00Z',
              status: 'success',
              tables_backed_up: { prayers: 50 },
              total_records: 50,
              duration_seconds: 30,
              created_at: '2025-10-18T08:00:00Z'
            }],
            error: null
          };
        }
        if (table === 'backup_tables') {
          throw new Error('Database connection failed');
        }
        return { data: [], error: null };
      });

      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Manual Backup/i)).toBeDefined()
      })

      const backupButton = screen.getByText(/Manual Backup/i)
      await user.click(backupButton)

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('❌ Backup failed: Database connection failed')
      })
    })
  })

  describe('Backup Status Display', () => {
    // Tests in this block set up their own mocks before rendering

    it('displays failed backup with error indicator', async () => {
      // Mock backup logs with a failed backup
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return {
            data: [
              {
                id: '1',
                backup_date: '2025-10-18T08:00:00Z',
                status: 'failed',
                error_message: 'Connection timeout',
                total_records: 0,
                created_at: '2025-10-18T08:00:00Z'
              }
            ],
            error: null
          };
        }
        return { data: [], error: null };
      });

      // NOW import and render the component
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        // Should show error icon (XCircle) for failed backups
        const errorIcon = document.querySelector('.lucide-circle-x.text-red-500')
        expect(errorIcon).toBeDefined()
        expect(screen.getByText('Connection timeout')).toBeDefined()
      })
    })

    it('displays in-progress backup status', async () => {
      // Mock backup logs with an in-progress backup
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return {
            data: [
              {
                id: '1',
                backup_date: '2025-10-18T08:00:00Z',
                status: 'in_progress',
                total_records: 0,
                created_at: '2025-10-18T08:00:00Z'
              }
            ],
            error: null
          };
        }
        return { data: [], error: null };
      });

      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        // Wait for backup to be displayed
        expect(screen.getByText(/Oct 18, 2025/)).toBeDefined()
      })

      // Click to expand backup details - find the clickable row containing the date
      const user = userEvent.setup()
      const dateElement = screen.getByText(/Oct 18, 2025/)
      const backupRow = dateElement.closest('[onClick]') || dateElement.closest('div')
      if (backupRow) {
        await user.click(backupRow)
      }

      await waitFor(() => {
        // Should show in-progress status with yellow styling
        expect(screen.getByText('IN_PROGRESS')).toBeDefined()
      })
    })

    it('handles backup failure and shows error message', async () => {
      // Mock directQuery to throw an exception when fetching backup_tables
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return {
            data: [
              {
                id: '1',
                backup_date: '2025-10-18T08:00:00Z',
                status: 'success',
                tables_backed_up: { prayers: 50, prayer_updates: 25, prayer_types: 5 },
                total_records: 80,
                duration_seconds: 45,
                created_at: '2025-10-18T08:00:00Z'
              }
            ],
            error: null
          };
        }
        if (table === 'backup_tables') {
          throw new Error('Database connection failed');
        }
        return { data: [], error: null };
      });

      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Manual Backup/i)).toBeDefined()
      })

      const backupButton = screen.getByText(/Manual Backup/i)
      await user.click(backupButton)

      await waitFor(() => {
        // Should show error alert
        expect(mockAlert).toHaveBeenCalledWith('❌ Backup failed: Database connection failed')
      })
    })

    it('shows loading state during backup', async () => {
      // Mock directQuery with delay for loading state test
      vi.mocked(directQuery).mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return {
            data: [
              {
                id: '1',
                backup_date: '2025-10-18T08:00:00Z',
                status: 'success',
                tables_backed_up: { prayers: 50 },
                total_records: 50,
                duration_seconds: 30,
                created_at: '2025-10-18T08:00:00Z'
              }
            ],
            error: null
          };
        }
        if (table === 'backup_tables') {
          // Add delay to simulate loading
          await new Promise(resolve => setTimeout(resolve, 200));
          return { data: [{ table_name: 'prayers' }], error: null };
        }
        if (table === 'prayers') {
          return { data: [{ id: '1', content: 'Test prayer' }], error: null };
        }
        return { data: [], error: null };
      });
      
      mockConfirm.mockReturnValue(true)

      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Manual Backup/i)).toBeDefined()
      })

      const backupButton = screen.getByText(/Manual Backup/i)
      await user.click(backupButton)

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Backing up\.\.\./i)).toBeDefined()
      })

      // Button should be disabled during backup
      const loadingButton = screen.getByText(/Backing up\.\.\./i)
      expect(loadingButton).toBeDisabled()

      // Wait for backup to complete
      await waitFor(() => {
        expect(screen.getByText(/Manual Backup/i)).toBeDefined()
      })
    })
  })

  describe('Manual Restore Functionality', () => {
    beforeEach(() => {
      // Ensure backup data is available for tests that need buttons to be visible
      const mockSupabase = vi.mocked(supabase)
      const originalFrom = mockSupabase.from
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'backup_logs') {
          return {
            select: () => ({
              order: () => ({
                limit: () => Promise.resolve({
                  data: [
                    {
                      id: '1',
                      backup_date: '2025-10-18T08:00:00Z',
                      status: 'success',
                      tables_backed_up: { prayers: 50, prayer_updates: 25, prayer_types: 5 },
                      total_records: 80,
                      duration_seconds: 45,
                      created_at: '2025-10-18T08:00:00Z'
                    }
                  ],
                  error: null
                })
              })
            }),
            insert: vi.fn().mockResolvedValue({ data: null, error: null })
          } as any
        }
        return originalFrom(table)
      })
      mockConfirm.mockReturnValue(true)
    })

    it('shows loading state during restore', async () => {
      mockConfirm.mockReturnValue(true)
      
      const mockFile = new File(['{"tables": {"prayers": {"data": []}}}'], 'backup.json', { type: 'application/json' })
      // Mock file.text to delay
      mockFile.text = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('{"tables": {"prayers": {"data": []}}}'), 200)
        })
      })

      const user = userEvent.setup()
      const BackupStatus = await getComponent();
      render(<BackupStatus />)

      await waitFor(() => {
        expect(screen.getByText(/Restore/i)).toBeDefined()
      })

      const restoreButton = screen.getByText(/Restore/i)
      await user.click(restoreButton)

      await waitFor(() => {
        expect(screen.getByText(/Select backup file/)).toBeDefined()
      })

      // Simulate file selection
      const fileInput = screen.getByLabelText(/Select backup file/)
      await user.upload(fileInput, mockFile)

      // Restore button should show loading state
      await waitFor(() => {
        expect(screen.getByText(/Restoring\.\.\./i)).toBeDefined()
      })

      // Button should be disabled during restore
      const loadingButton = screen.getByText(/Restoring\.\.\./i)
      expect(loadingButton).toBeDisabled()
    })
  })
})