import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';

describe('BackupStatus component - extra tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // allow pending state updates to settle to avoid act warnings
    await waitFor(() => {});
  });

  it('shows loading spinner initially', async () => {
    // Mock directQuery to resolve quickly; initial render should show spinner
    vi.doMock('../../lib/supabase', () => ({
      supabase: { from: vi.fn() },
      directQuery: vi.fn().mockResolvedValue({ data: [], error: null }),
      directMutation: vi.fn().mockResolvedValue({ data: null, error: null })
    }));

    const { default: BackupStatus } = await import('../BackupStatus');
    const { container } = render(<BackupStatus />);

    // The loading UI includes an element with class animate-spin
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders empty state when no backups found', async () => {
    vi.doMock('../../lib/supabase', () => ({
      supabase: { from: vi.fn() },
      directQuery: vi.fn().mockResolvedValue({ data: [], error: null }),
      directMutation: vi.fn().mockResolvedValue({ data: null, error: null })
    }));

    const { default: BackupStatus } = await import('../BackupStatus');
    render(<BackupStatus />);

    await waitFor(() => expect(screen.getByText(/No backup logs found/i)).toBeTruthy());
    expect(screen.getByText(/Backups will appear here once the first automated backup runs/i)).toBeTruthy();
  });

  it('renders recent backups and expands details when clicked', async () => {
    const now = new Date().toISOString();
    const mockBackup = {
      id: 'b1',
      backup_date: now,
      status: 'success',
      tables_backed_up: { prayers: 2 },
      total_records: 123,
      duration_seconds: 75,
      created_at: now
    };

    vi.doMock('../../lib/supabase', () => ({
      supabase: { from: vi.fn() },
      directQuery: vi.fn().mockImplementation(async (table: string) => {
        if (table === 'backup_logs') {
          return { data: [mockBackup], error: null };
        }
        return { data: [], error: null };
      }),
      directMutation: vi.fn().mockResolvedValue({ data: null, error: null })
    }));

    const { default: BackupStatus } = await import('../BackupStatus');
    render(<BackupStatus />);

    // Wait for the backup entry to render (by looking for the records text)
    await waitFor(() => expect(screen.getByText(/123 records/)).toBeTruthy());

    const recordsEl = screen.getByText(/123 records/);
    // Click the records element (bubbles to parent clickable row) to expand details
    fireEvent.click(recordsEl);

    // Expanded view should show Backup ID and the id value
    await waitFor(() => expect(screen.getByText(/Backup ID/i)).toBeTruthy());
    expect(screen.getByText(/b1/)).toBeTruthy();
    // Should display table summary
    expect(screen.getByText(/Tables Backed Up/i)).toBeTruthy();
    expect(screen.getByText(/prayers/i)).toBeTruthy();
  });
});
