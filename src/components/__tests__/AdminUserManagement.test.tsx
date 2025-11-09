import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminUserManagement } from '../AdminUserManagement';

// Create a mock chain for supabase queries used in the component
const createMockChain = (resolveData: any = [], resolveError: any = null) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    }),
  };
  // Make select and eq return the chain for chaining
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  return chain;
};

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ error: null })
    }
  }
}));

import { supabase } from '../../lib/supabase';

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

  it('handles loading errors gracefully', async () => {
    const mockChain = createMockChain(null, { message: 'Database error' });
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load admin users/i)).toBeTruthy();
    });
  });

  it('shows empty state when no admins exist', async () => {
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    expect(screen.getByText(/No admin users found/i)).toBeTruthy();
  });

  it('successfully adds a new admin', async () => {
    const mockChain = createMockChain([]);
    const upsertChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(upsertChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click Add Admin
    fireEvent.click(screen.getByRole('button', { name: /Add Admin/i }));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Admin's full name/i), { target: { value: 'Bob Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/admin@example.com/i), { target: { value: 'bob@example.com' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Add & Send Invitation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Admin added successfully/i)).toBeTruthy();
    });
  });

  it('prevents adding admin with existing email', async () => {
    const existingAdmin = { email: 'existing@example.com', name: 'Existing', created_at: new Date().toISOString() };
    const mockChain = createMockChain([]);
    const upsertChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: existingAdmin, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(upsertChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click Add Admin
    fireEvent.click(screen.getByRole('button', { name: /Add Admin/i }));

    // Fill form with existing email
    fireEvent.change(screen.getByPlaceholderText(/Admin's full name/i), { target: { value: 'Bob Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/admin@example.com/i), { target: { value: 'existing@example.com' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Add & Send Invitation/i }));

    await waitFor(() => {
      expect(screen.getByText(/This email is already an admin/i)).toBeTruthy();
    });
  });

  it('handles add admin database error', async () => {
    const mockChain = createMockChain([]);
    const upsertChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(upsertChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click Add Admin
    fireEvent.click(screen.getByRole('button', { name: /Add Admin/i }));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Admin's full name/i), { target: { value: 'Bob Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/admin@example.com/i), { target: { value: 'bob@example.com' } });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Add & Send Invitation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to add admin user/i)).toBeTruthy();
    });
  });

  it('validates required fields in add admin form', async () => {
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click Add Admin
    fireEvent.click(screen.getByRole('button', { name: /Add Admin/i }));

    // Try to submit empty form
    fireEvent.click(screen.getByRole('button', { name: /Add & Send Invitation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Email and name are required/i)).toBeTruthy();
    });
  });

  it('cancels add admin form', async () => {
    const mockChain = createMockChain([]);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click Add Admin
    fireEvent.click(screen.getByRole('button', { name: /Add Admin/i }));

    // Form should be visible
    expect(screen.getByText(/Add New Admin/i)).toBeTruthy();

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Form should be hidden
    expect(screen.queryByText(/Add New Admin/i)).toBeNull();
  });

  it('shows delete confirmation and cancels', async () => {
    const admins = [
      { email: 'alice@example.com', name: 'Alice', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: true },
      { email: 'bob@example.com', name: 'Bob', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: false }
    ];

    const mockChain = createMockChain(admins);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click delete button for first admin
    const deleteButtons = screen.getAllByTitle(/Remove admin access/i);
    fireEvent.click(deleteButtons[0]);

    // Should show confirmation
    expect(screen.getByText(/Remove admin access?/i)).toBeTruthy();

    // Click cancel
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Confirmation should be hidden
    expect(screen.queryByText(/Remove admin access?/i)).toBeNull();
  });

  it('successfully deletes an admin', async () => {
    const admins = [
      { email: 'alice@example.com', name: 'Alice', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: true },
      { email: 'bob@example.com', name: 'Bob', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: false }
    ];

    const mockChain = createMockChain(admins);
    const updateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: admins, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      }),
    };
    // Make select and eq return the chain
    updateChain.select.mockReturnValue(updateChain);
    updateChain.eq.mockReturnValue(updateChain);
    vi.mocked(supabase.from).mockReturnValue(updateChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click delete button for first admin
    const deleteButtons = screen.getAllByTitle(/Remove admin access/i);
    fireEvent.click(deleteButtons[0]);

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Admin access removed for alice@example\.com/i)).toBeTruthy();
    });
  });

  it('prevents deleting the last admin', async () => {
    const admins = [
      { email: 'alice@example.com', name: 'Alice', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: true }
    ];

    const mockChain = createMockChain(admins);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Delete button should be disabled
    const deleteButton = screen.getByTitle(/Cannot delete the last admin/i);
    expect(deleteButton).toBeDisabled();
  });

  it('handles delete admin error', async () => {
    const admins = [
      { email: 'alice@example.com', name: 'Alice', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: true },
      { email: 'bob@example.com', name: 'Bob', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: false }
    ];

    const mockChain = createMockChain(admins);
    const updateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: admins, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } })
      }),
    };
    // Make select and eq return the chain
    updateChain.select.mockReturnValue(updateChain);
    updateChain.eq.mockReturnValue(updateChain);
    vi.mocked(supabase.from).mockReturnValue(updateChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click delete button for first admin
    const deleteButtons = screen.getAllByTitle(/Remove admin access/i);
    fireEvent.click(deleteButtons[0]);

    // Click confirm
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to remove admin access/i)).toBeTruthy();
    });
  });

  it('toggles receive admin emails setting', async () => {
    const admins = [
      { email: 'alice@example.com', name: 'Alice', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: false }
    ];

    const mockChain = createMockChain(admins);
    const updateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: admins, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(updateChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click the toggle button (XCircle icon for not receiving emails)
    const toggleButton = screen.getByTitle(/Not receiving admin emails/i);
    fireEvent.click(toggleButton);

    // Should reload admins
    await waitFor(() => {
      expect(vi.mocked(supabase.from)).toHaveBeenCalled();
    });
  });

  it('handles toggle email preference error', async () => {
    const admins = [
      { email: 'alice@example.com', name: 'Alice', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: false }
    ];

    const mockChain = createMockChain(admins);
    const updateChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: admins, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
      }),
    };
    // Make select and eq return the chain
    updateChain.select.mockReturnValue(updateChain);
    updateChain.eq.mockReturnValue(updateChain);
    vi.mocked(supabase.from).mockReturnValue(updateChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Click the toggle button
    const toggleButton = screen.getByTitle(/Not receiving admin emails/i);
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to update email preference/i)).toBeTruthy();
    });
  });

  it('displays admin summary correctly', async () => {
    const admins = [
      { email: 'alice@example.com', name: 'Alice', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: true },
      { email: 'bob@example.com', name: 'Bob', created_at: new Date().toISOString(), last_sign_in_at: null, receive_admin_emails: false }
    ];

    const mockChain = createMockChain(admins);
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    const summaryElement = screen.getByText(/receiving email notifications/);
    expect(summaryElement).toBeTruthy();
    expect(summaryElement.textContent).toContain('1');
    expect(summaryElement.textContent).toContain('of');
    expect(summaryElement.textContent).toContain('2');
    expect(summaryElement.textContent).toContain('admins');
  });

  it('dismisses success message', async () => {
    const mockChain = createMockChain([]);
    const upsertChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(upsertChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => expect(screen.queryByText(/Loading admins/i)).toBeNull());

    // Trigger success message by adding admin
    fireEvent.click(screen.getByRole('button', { name: /Add Admin/i }));
    fireEvent.change(screen.getByPlaceholderText(/Admin's full name/i), { target: { value: 'Bob Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/admin@example.com/i), { target: { value: 'bob@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Add & Send Invitation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Admin added successfully/i)).toBeTruthy();
    });

    // Click the X to dismiss - find by the X icon in the success message
    const successMessage = screen.getByText(/Admin added successfully/i).closest('div');
    const dismissButton = successMessage?.querySelector('button');
    if (dismissButton) {
      fireEvent.click(dismissButton);
      expect(screen.queryByText(/Admin added successfully/i)).toBeNull();
    }
  });

  it('dismisses error message', async () => {
    const mockChain = createMockChain(null, { message: 'Database error' });
    vi.mocked(supabase.from).mockReturnValue(mockChain as any);

    render(<AdminUserManagement />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load admin users/i)).toBeTruthy();
    });

    // Click the X to dismiss - find by the X icon in the error message
    const errorMessage = screen.getByText(/Failed to load admin users/i).closest('div');
    const dismissButton = errorMessage?.querySelector('button');
    if (dismissButton) {
      fireEvent.click(dismissButton);
      expect(screen.queryByText(/Failed to load admin users/i)).toBeNull();
    }
  });
});
