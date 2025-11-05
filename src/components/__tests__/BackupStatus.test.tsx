import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BackupStatus from '../BackupStatus'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [
              {
                id: '1',
                backup_date: '2025-10-18T08:00:00Z',
                status: 'success',
                tables_backed_up: {
                  prayers: 50,
                  prayer_updates: 25,
                  prayer_types: 5
                },
                total_records: 80,
                duration_seconds: 45,
                created_at: '2025-10-18T08:00:00Z'
              },
              {
                id: '2',
                backup_date: '2025-10-17T08:00:00Z',
                status: 'success',
                tables_backed_up: {
                  prayers: 48,
                  prayer_updates: 23,
                  prayer_types: 5
                },
                total_records: 76,
                duration_seconds: 42,
                created_at: '2025-10-17T08:00:00Z'
              }
            ],
            error: null
          }))
        }))
      }))
    }))
  }
}))

describe('BackupStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders backup status section', async () => {
    render(<BackupStatus />)
    
    await waitFor(() => {
      expect(screen.getByText(/Database Backup Status/i)).toBeInTheDocument()
    })
  })

  it('displays recent backups list', async () => {
    render(<BackupStatus />)
    
    await waitFor(() => {
      expect(screen.getByText(/Recent Backups/i)).toBeInTheDocument()
      expect(screen.getByText(/80/)).toBeInTheDocument() // total records
      expect(screen.getByText(/76/)).toBeInTheDocument()
    })
  })

  it('shows manual backup button', async () => {
    render(<BackupStatus />)
    
    const backupButton = await screen.findByRole('button', { name: /Manual Backup/i })
    expect(backupButton).toBeInTheDocument()
  })

  it('shows restore button', async () => {
    render(<BackupStatus />)
    
    const restoreButton = await screen.findByRole('button', { name: /Restore/i })
    expect(restoreButton).toBeInTheDocument()
  })

  it('displays backup schedule information', async () => {
    render(<BackupStatus />)
    
    await waitFor(() => {
      expect(screen.getByText(/Automated backups run daily at 2:00 AM CST/i)).toBeInTheDocument()
    })
  })

  it('expands backup details when clicked', async () => {
    const user = userEvent.setup()
    render(<BackupStatus />)
    
    // Wait for backups to load
    await waitFor(() => {
      expect(screen.getByText(/80/)).toBeInTheDocument()
    })
    
    // Click on the first backup to expand
    const firstBackup = screen.getAllByText(/80/)[0].closest('div')
    if (firstBackup) {
      await user.click(firstBackup)
      
      // Check if expanded details appear
      await waitFor(() => {
        expect(screen.getByText(/Backup ID/i)).toBeInTheDocument()
      })
    }
  })

  it('handles loading state', () => {
    render(<BackupStatus />)
    
    // Component should show loading spinner while fetching data
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })
})
