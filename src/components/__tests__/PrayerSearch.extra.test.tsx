import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

// Mock supabase for chainable query behavior
vi.mock('../../lib/supabase', () => {
  const chain: any = {};
  chain.or = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.limit = async () => ({ data: [], error: null });

  return {
    supabase: {
      from: (_table: string) => ({
        select: () => chain
      })
    }
  };
});

import { PrayerSearch } from '../PrayerSearch';

describe('PrayerSearch component - extra tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('shows validation error when pressing Enter with no criteria', async () => {
    render(<PrayerSearch />);

    const input = screen.getByPlaceholderText(/Search by title, requester, email/i) as HTMLInputElement;

    // Press Enter with empty input
    await act(async () => {
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    await waitFor(() => expect(screen.getByText(/Please enter a search term or select a filter/i)).toBeTruthy());
  });

  it('performs search and renders results when search term provided', async () => {
    // Mock supabase to return one prayer result when chained
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

    // Re-mock module so our test can return the desired data
    vi.doMock('../../lib/supabase', () => {
      const chain: any = {};
      chain.or = () => chain;
      chain.eq = () => chain;
      chain.order = () => chain;
      chain.limit = async () => ({ data: [mockPrayer], error: null });

      return {
        supabase: {
          from: (_table: string) => ({ select: () => chain })
        }
      };
    });

    const { PrayerSearch: PS } = await import('../PrayerSearch');
    render(<PS />);

    const input = screen.getByPlaceholderText(/Search by title, requester, email/i) as HTMLInputElement;
    // Type a search term and press Enter
    await act(async () => {
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
      prayer_updates: [
        { id: 'u1', content: 'update', author: 'Bob', created_at: new Date().toISOString(), denial_reason: 'Not allowed', approval_status: 'denied' }
      ]
    };

    vi.doMock('../../lib/supabase', () => {
      const chain: any = {};
      chain.order = () => chain;
      chain.limit = async () => ({ data: [mockPrayerWithDeniedUpdate], error: null });

      return {
        supabase: {
          from: (_table: string) => ({ select: () => chain })
        }
      };
    });

    const { PrayerSearch: PS } = await import('../PrayerSearch');
    render(<PS />);

    // The component renders two select elements (status, approval). Grab the second combobox for approval
    const selects = screen.getAllByRole('combobox');
    const approvalSelect = selects[1] as HTMLSelectElement;

    // Change approval filter to 'denied' which triggers an auto-search
    await act(async () => {
      fireEvent.change(approvalSelect, { target: { value: 'denied' } });
    });

    // Should find the denied prayer via client-side filter
    await waitFor(() => expect(screen.getByText(/Prayer With Denied Update/)).toBeTruthy());
    // Footer indicates results were found
    await waitFor(() => expect(screen.getByText(/Found:/)).toBeTruthy());
  });
});
