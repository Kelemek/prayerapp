import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  },
  directQuery: vi.fn(),
  directMutation: vi.fn()
}));

import { PrayerSearch } from '../PrayerSearch';

describe('PrayerSearch component - extra tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  it('performs wildcard search when pressing Enter with no criteria', async () => {
    const mockPrayers = [
      {
        id: 'r1',
        title: 'Prayer One',
        requester: 'Alice',
        email: 'alice@example.com',
        status: 'current',
        created_at: new Date().toISOString(),
        description: 'First prayer',
        approval_status: 'approved',
        prayer_updates: []
      },
      {
        id: 'r2',
        title: 'Prayer Two',
        requester: 'Bob',
        email: 'bob@example.com',
        status: 'answered',
        created_at: new Date().toISOString(),
        description: 'Second prayer',
        approval_status: 'approved',
        prayer_updates: []
      }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPrayers)
    });

    render(<PrayerSearch />);

    const input = screen.getByPlaceholderText(/Search by title, requester, email/i) as HTMLInputElement;

    // Press Enter with empty input (wildcard search)
    act(() => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    // Should show the prayers returned by wildcard search
    await waitFor(() => expect(screen.getByText(/Prayer One/)).toBeTruthy());
    await waitFor(() => expect(screen.getByText(/Prayer Two/)).toBeTruthy());
  });

  it('performs search and renders results when search term provided', async () => {
    const mockPrayer = {
      id: 'r1',
      title: 'Test Prayer Title',
      requester: 'Alice',
      email: 'alice@example.com',
      status: 'current',
      created_at: new Date().toISOString(),
      description: 'A test prayer',
      approval_status: 'pending',
      prayer_updates: []
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockPrayer])
    });

    render(<PrayerSearch />);

    const input = screen.getByPlaceholderText(/Search by title, requester, email/i) as HTMLInputElement;
    // Type a search term and press Enter
    act(() => {
      fireEvent.change(input, { target: { value: 'Alice' } });
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    // Expect the returned prayer title to be rendered
    await waitFor(() => expect(screen.getByText(/Test Prayer Title/)).toBeTruthy());
    // And the footer should indicate results were found (number is inside a child element)
    await waitFor(() => expect(screen.getByText(/Found:/)).toBeTruthy());
  });

  it('filters denied approval client-side when approvalFilter=denied', async () => {
    const mockPrayerWithDeniedUpdate = {
      id: 'r2',
      title: 'Prayer With Denied Update',
      requester: 'Bob',
      email: null,
      status: 'answered',
      created_at: new Date().toISOString(),
      description: '',
      approval_status: null,
      denial_reason: 'Not allowed',
      prayer_updates: [
        { id: 'u1', content: 'update', author: 'Bob', created_at: new Date().toISOString(), denial_reason: 'Not allowed', approval_status: 'denied' }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockPrayerWithDeniedUpdate])
    });

    render(<PrayerSearch />);

    // The component renders two select elements (status, approval). Grab the second combobox for approval
    const selects = screen.getAllByRole('combobox');
    const approvalSelect = selects[1] as HTMLSelectElement;

    // Change approval filter to 'denied' which triggers an auto-search
    act(() => {
      fireEvent.change(approvalSelect, { target: { value: 'denied' } });
    });

    // Should find the denied prayer via client-side filter
    await waitFor(() => expect(screen.getByText(/Prayer With Denied Update/)).toBeTruthy());
    // Footer indicates results were found
    await waitFor(() => expect(screen.getByText(/Found:/)).toBeTruthy());
  });
});
