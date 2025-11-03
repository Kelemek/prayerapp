import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUserManagement } from './AdminUserManagement';

// Create a mock chain for supabase queries used in the component
const createMockChain = (resolveData: any = [], resolveError: any = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn().mockResolvedValue({ error: null }),
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ error: null })
    }
  }
}));

import { supabase } from '../lib/supabase';

describe('AdminUserManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays admin users', async () => {
    const admins = [
      { email: 'alice@example.com', name: 'Alice', created_at: new Date().toISOString(), last_sign_in_at: null }
    ];

    const mockChain = createMockChain(admins);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

  expect(screen.getByText(/Loading admins/i)).toBeTruthy();

  await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

  expect(screen.getByText('Alice')).toBeTruthy();
  expect(screen.getByText('alice@example.com')).toBeTruthy();
  });

  it('shows add admin form and validates input', async () => {
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

  // Wait for load to finish
  await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click Add Admin
    fireEvent.click(screen.getByRole('button', { name: /Add Admin/i }));

    // Form fields should be visible
    const nameInput = screen.getByPlaceholderText(/Admin's full name/i);
    const emailInput = screen.getByPlaceholderText(/admin@example.com/i);

    // Enter invalid email and submit
    fireEvent.change(nameInput, { target: { value: 'Bob' } });
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    fireEvent.click(screen.getByRole('button', { name: /Add & Send Invitation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeTruthy();
    });
  });
});
