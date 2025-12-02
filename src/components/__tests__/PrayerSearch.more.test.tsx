import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import { PrayerSearch } from '../PrayerSearch';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  },
  directQuery: vi.fn(),
  directMutation: vi.fn()
}));

describe('PrayerSearch additional tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  it('includes prayers that have denied updates when approval filter is set to denied', async () => {
    const now = new Date().toISOString();
    const prayerWithDeniedUpdate = {
      id: 'p-denied-1',
      title: 'Needs prayer for family',
      requester: 'Alice',
      email: null,
      status: 'current',
      created_at: now,
      denial_reason: 'Not appropriate',
      description: 'Please pray',
      approval_status: 'pending',
      prayer_for: 'Family',
      prayer_updates: [
        { id: 'u1', content: 'Update A', author: 'Bob', created_at: now, denial_reason: 'Not appropriate', approval_status: 'denied' }
      ]
    };

    // Mock fetch to return the prayer
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([prayerWithDeniedUpdate])
    });

    render(<PrayerSearch />);

    // Select the approval filter to 'denied' which should trigger the search effect
    const selects = screen.getAllByRole('combobox');
    const approvalSelect = selects[1] as HTMLSelectElement;
    await waitFor(() => expect(approvalSelect).toBeTruthy());
    fireEvent.change(approvalSelect, { target: { value: 'denied' } });

    // Wait for the result footer to show Found: X prayer(s)
    await waitFor(() => expect(screen.getByText(/Found:/i)).toBeTruthy());
  });

  it('shows no-results UI when a search term is provided but returns no prayers', async () => {
    // Mock fetch to return empty data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    render(<PrayerSearch />);

    // Type a search term and click the Search button
    const input = screen.getByPlaceholderText(/Search by title, requester, email/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'no-results-term' } });

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    await waitFor(() => expect(screen.getByText(/No prayers found/i)).toBeTruthy());
    expect(screen.getByText(/Try a different search term/i)).toBeTruthy();
  });
});
