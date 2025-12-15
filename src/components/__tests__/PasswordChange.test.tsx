import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordChange } from '../PasswordChange';
import userEvent from '@testing-library/user-event';

describe('PasswordChange Component', () => {
  const mockOnPasswordChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the password change form', () => {
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('shows password as hidden by default', () => {
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  it('includes proper ARIA labels and icons', () => {
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    // Check for lock icons
    const lockIcons = document.querySelectorAll('svg');
    expect(lockIcons.length).toBeGreaterThan(0);

    // Check for proper form labels
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('toggles new password visibility when eye icon is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const toggleButtons = screen.getAllByRole('button');
    // Find the toggle button for new password (first toggle button)
    const newPasswordToggle = toggleButtons.find(btn => 
      btn.type === 'button' && 
      btn !== screen.getByRole('button', { name: /change password/i })
    ) || toggleButtons[0];
    
    expect(newPasswordInput).toHaveAttribute('type', 'password');
    
    await user.click(newPasswordToggle);
    expect(newPasswordInput).toHaveAttribute('type', 'text');
    
    await user.click(newPasswordToggle);
    expect(newPasswordInput).toHaveAttribute('type', 'password');
  });

  it('toggles confirm password visibility when eye icon is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const toggleButtons = screen.getAllByRole('button');
    // Find the toggle button for confirm password (second toggle button)
    const submitButton = screen.getByRole('button', { name: /change password/i });
    const toggleBtns = toggleButtons.filter(btn => btn !== submitButton);
    const confirmPasswordToggle = toggleBtns[1];
    
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    await user.click(confirmPasswordToggle);
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    
    await user.click(confirmPasswordToggle);
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  it('shows error when fields are empty', async () => {
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const submitButton = screen.getByRole('button', { name: /change password/i });
    // Simulate form submission by triggering the submit event directly
    const form = submitButton.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
    
    expect(mockOnPasswordChange).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'differentPassword123');

    const submitButton = screen.getByRole('button', { name: /change password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    
    expect(mockOnPasswordChange).not.toHaveBeenCalled();
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    await user.type(newPasswordInput, 'short');
    await user.type(confirmPasswordInput, 'short');

    const submitButton = screen.getByRole('button', { name: /change password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    });
    
    expect(mockOnPasswordChange).not.toHaveBeenCalled();
  });

  it('successfully changes password when valid inputs are provided', async () => {
    const user = userEvent.setup();
    mockOnPasswordChange.mockResolvedValue(true);
    
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    await user.type(newPasswordInput, 'newPassword123');
    await user.type(confirmPasswordInput, 'newPassword123');

    const submitButton = screen.getByRole('button', { name: /change password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
    });
    
    expect(mockOnPasswordChange).toHaveBeenCalledWith('newPassword123');
    expect(newPasswordInput).toHaveValue('');
    expect(confirmPasswordInput).toHaveValue('');
  });

  it('shows error when password change fails', async () => {
    const user = userEvent.setup();
    mockOnPasswordChange.mockResolvedValue(false);
    
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    await user.type(newPasswordInput, 'newPassword123');
    await user.type(confirmPasswordInput, 'newPassword123');

    const submitButton = screen.getByRole('button', { name: /change password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to change password. Please try again.')).toBeInTheDocument();
    });
    
    expect(mockOnPasswordChange).toHaveBeenCalledWith('newPassword123');
  });

  it('shows error when password change throws an error', async () => {
    const user = userEvent.setup();
    mockOnPasswordChange.mockRejectedValue(new Error('Network error'));
    
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    await user.type(newPasswordInput, 'newPassword123');
    await user.type(confirmPasswordInput, 'newPassword123');

    const submitButton = screen.getByRole('button', { name: /change password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to change password. Please try again.')).toBeInTheDocument();
    });
    
    expect(mockOnPasswordChange).toHaveBeenCalledWith('newPassword123');
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup();
    let resolvePasswordChange: (value: boolean) => void;
    const passwordChangePromise = new Promise<boolean>((resolve) => {
      resolvePasswordChange = resolve;
    });
    mockOnPasswordChange.mockReturnValue(passwordChangePromise);
    
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    await user.type(newPasswordInput, 'newPassword123');
    await user.type(confirmPasswordInput, 'newPassword123');

    const submitButton = screen.getByRole('button', { name: /change password/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolvePasswordChange!(true);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('clears previous error messages when submitting again', async () => {
    const user = userEvent.setup();
    render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

    // First submission with error - trigger form submit directly
    const submitButton = screen.getByRole('button', { name: /change password/i });
    const form = submitButton.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });

    // Second submission
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

    await user.type(newPasswordInput, 'newPassword123');
    await user.type(confirmPasswordInput, 'newPassword123');

    mockOnPasswordChange.mockResolvedValue(true);
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('All fields are required')).not.toBeInTheDocument();
      expect(screen.getByText('Password changed successfully')).toBeInTheDocument();
    });
  });
});
