import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';

describe('PrayerSearch additional tests', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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
      denial_reason: null,
      description: 'Please pray',
      approval_status: 'pending',
      prayer_for: 'Family',
      prayer_updates: [
        { id: 'u1', content: 'Update A', author: 'Bob', created_at: now, denial_reason: 'Not appropriate', approval_status: 'denied' }
      ]
    };

    // Mock supabase to return the prayer above
    vi.doMock('../../lib/supabase', () => ({
      supabase: {
        from: (_table: string) => ({
          select: () => ({ order: () => ({ limit: async () => ({ data: [prayerWithDeniedUpdate], error: null }) }) })
        })
      }
    }));

  const { PrayerSearch: PS } = await import('../PrayerSearch');
  render(<PS />);

  // Select the approval filter to 'denied' which should trigger the search effect
  const selects = screen.getAllByRole('combobox');
  const approvalSelect = selects[1] as HTMLSelectElement;
  await waitFor(() => expect(approvalSelect).toBeTruthy());
  fireEvent.change(approvalSelect, { target: { value: 'denied' } });

  // Wait for the result footer to show Found: X prayer(s)
  await waitFor(() => expect(screen.getByText(/Found:/i)).toBeTruthy());
  });

  it('shows no-results UI when a search term is provided but supabase returns no prayers', async () => {
    // Mock supabase to return empty data
    vi.doMock('../../lib/supabase', () => ({
      supabase: {
        from: (_table: string) => ({
          select: () => {
            const chain: any = {};
            chain.or = () => chain;
            chain.eq = () => chain;
            chain.order = () => chain;
            chain.limit = async () => ({ data: [], error: null });
            return chain;
          }
        })
      }
    }));

  const { PrayerSearch: PS } = await import('../PrayerSearch');
  render(<PS />);

    // Type a search term and click the Search button
    const input = screen.getByPlaceholderText(/Search by title, requester, email/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'no-results-term' } });

    const searchButton = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(searchButton);

    await waitFor(() => expect(screen.getByText(/No prayers found/i)).toBeTruthy());
    expect(screen.getByText(/Try a different search term/i)).toBeTruthy();
  });
});
