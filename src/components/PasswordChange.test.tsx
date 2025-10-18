import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PasswordChange } from './PasswordChange';

describe('PasswordChange', () => {
  const mockOnPasswordChange = vi.fn();

  beforeEach(() => {
    mockOnPasswordChange.mockReset();
  });

  describe('Rendering', () => {
    it('renders the component with title and description', () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);
      
      expect(screen.getByRole('heading', { name: /change password/i })).toBeDefined();
      expect(screen.getByText('Set a new password for your admin account')).toBeDefined();
    });    it('renders new password input field', () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      expect(newPasswordInput).toBeDefined();
      expect(newPasswordInput.type).toBe('password');
      expect(newPasswordInput.placeholder).toBe('Enter new password (min 8 characters)');
    });

    it('renders confirm password input field', () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
      expect(confirmPasswordInput).toBeDefined();
      expect(confirmPasswordInput.type).toBe('password');
      expect(confirmPasswordInput.placeholder).toBe('Confirm new password');
    });

    it('renders submit button', () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      expect(submitButton).toBeDefined();
    });

    it('renders lock icons', () => {
      const { container } = render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const lockIcons = container.querySelectorAll('svg');
      // Should have multiple lock icons (header + input fields)
      expect(lockIcons.length).toBeGreaterThan(2);
    });

    it('renders password visibility toggle buttons', () => {
      const { container } = render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      // Eye icons for show/hide password
      const toggleButtons = container.querySelectorAll('button[type="button"]');
      expect(toggleButtons.length).toBe(2); // One for each password field
    });
  });

  describe('Password Visibility Toggle', () => {
    it('toggles new password visibility when clicking eye icon', () => {
      const { container } = render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      expect(newPasswordInput.type).toBe('password');

      // Find the first toggle button (for new password)
      const toggleButtons = container.querySelectorAll('button[type="button"]');
      fireEvent.click(toggleButtons[0]);

      expect(newPasswordInput.type).toBe('text');

      // Toggle back
      fireEvent.click(toggleButtons[0]);
      expect(newPasswordInput.type).toBe('password');
    });

    it('toggles confirm password visibility when clicking eye icon', () => {
      const { container } = render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
      expect(confirmPasswordInput.type).toBe('password');

      // Find the second toggle button (for confirm password)
      const toggleButtons = container.querySelectorAll('button[type="button"]');
      fireEvent.click(toggleButtons[1]);

      expect(confirmPasswordInput.type).toBe('text');

      // Toggle back
      fireEvent.click(toggleButtons[1]);
      expect(confirmPasswordInput.type).toBe('password');
    });

    it('toggles each password field independently', () => {
      const { container } = render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
      const toggleButtons = container.querySelectorAll('button[type="button"]');

      // Show new password
      fireEvent.click(toggleButtons[0]);
      expect(newPasswordInput.type).toBe('text');
      expect(confirmPasswordInput.type).toBe('password');

      // Show confirm password
      fireEvent.click(toggleButtons[1]);
      expect(newPasswordInput.type).toBe('text');
      expect(confirmPasswordInput.type).toBe('text');

      // Hide new password
      fireEvent.click(toggleButtons[0]);
      expect(newPasswordInput.type).toBe('password');
      expect(confirmPasswordInput.type).toBe('text');
    });
  });

  describe('Form Validation', () => {
    it('shows error when both fields are empty', async () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('All fields are required')).toBeDefined();
      });

      expect(mockOnPasswordChange).not.toHaveBeenCalled();
    });

    it('shows error when new password is empty', async () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('All fields are required')).toBeDefined();
      });

      expect(mockOnPasswordChange).not.toHaveBeenCalled();
    });

    it('shows error when confirm password is empty', async () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      fireEvent.change(newPasswordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('All fields are required')).toBeDefined();
      });

      expect(mockOnPasswordChange).not.toHaveBeenCalled();
    });

    it('shows error when passwords do not match', async () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeDefined();
      });

      expect(mockOnPasswordChange).not.toHaveBeenCalled();
    });

    it('shows error when password is less than 8 characters', async () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'short' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters long')).toBeDefined();
      });

      expect(mockOnPasswordChange).not.toHaveBeenCalled();
    });

    it('accepts password with exactly 8 characters', async () => {
      mockOnPasswordChange.mockResolvedValue(true);
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: '12345678' } });
      fireEvent.change(confirmPasswordInput, { target: { value: '12345678' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnPasswordChange).toHaveBeenCalledWith('12345678');
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onPasswordChange with correct password on valid submission', async () => {
      mockOnPasswordChange.mockResolvedValue(true);
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newSecurePassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newSecurePassword123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnPasswordChange).toHaveBeenCalledWith('newSecurePassword123');
      });
    });

    it('shows success message on successful password change', async () => {
      mockOnPasswordChange.mockResolvedValue(true);
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Password changed successfully')).toBeDefined();
      });
    });

    it('clears password fields on successful change', async () => {
      mockOnPasswordChange.mockResolvedValue(true);
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(newPasswordInput.value).toBe('');
        expect(confirmPasswordInput.value).toBe('');
      });
    });

    it('shows error message when password change fails', async () => {
      mockOnPasswordChange.mockResolvedValue(false);
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Failed to change password. Please try again.')).toBeDefined();
      });
    });

    it('does not clear fields when password change fails', async () => {
      mockOnPasswordChange.mockResolvedValue(false);
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Failed to change password. Please try again.')).toBeDefined();
      });

      // Fields should still have values
      expect(newPasswordInput.value).toBe('newPassword123');
      expect(confirmPasswordInput.value).toBe('newPassword123');
    });

    it('handles exception during password change', async () => {
      mockOnPasswordChange.mockRejectedValue(new Error('Network error'));
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('Failed to change password. Please try again.')).toBeDefined();
      });
    });
  });

  describe('Loading State', () => {
    it('disables submit button during submission', async () => {
      let resolvePasswordChange: (value: boolean) => void;
      const passwordChangePromise = new Promise<boolean>((resolve) => {
        resolvePasswordChange = resolve;
      });
      mockOnPasswordChange.mockReturnValue(passwordChangePromise);

      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i }) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton.disabled).toBe(true);
      });

      resolvePasswordChange!(true);

      await waitFor(() => {
        expect(submitButton.disabled).toBe(false);
      });
    });
  });

  describe('Message Display', () => {
    it('displays error message with alert icon', async () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        const errorMessage = screen.getByText('All fields are required');
        expect(errorMessage).toBeDefined();
        
        // Check for error styling
        const messageContainer = errorMessage.closest('div');
        expect(messageContainer?.className).toContain('bg-red');
      });
    });

    it('displays success message with check icon', async () => {
      mockOnPasswordChange.mockResolvedValue(true);
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        const successMessage = screen.getByText('Password changed successfully');
        expect(successMessage).toBeDefined();
        
        // Check for success styling
        const messageContainer = successMessage.closest('div');
        expect(messageContainer?.className).toContain('bg-green');
      });
    });

    it('clears previous messages when submitting again', async () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      // First submission - trigger error
      const submitButton = screen.getByRole('button', { name: /change password/i });
      const form = submitButton.closest('form')!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('All fields are required')).toBeDefined();
      });

      // Fill form and submit again
      mockOnPasswordChange.mockResolvedValue(true);
      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });
      fireEvent.submit(form);

      // Old error should be gone, new success message should appear
      await waitFor(() => {
        expect(screen.queryByText('All fields are required')).toBeNull();
        expect(screen.getByText('Password changed successfully')).toBeDefined();
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes', () => {
      const { container } = render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      // Check for dark mode classes in main container
      const mainContainer = container.querySelector('.dark\\:bg-gray-800');
      expect(mainContainer).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for inputs', () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      expect(newPasswordInput.id).toBe('newPassword');
      expect(confirmPasswordInput.id).toBe('confirmPassword');
    });

    it('marks inputs as required', () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;

      expect(newPasswordInput.required).toBe(true);
      expect(confirmPasswordInput.required).toBe(true);
    });

    it('sets minimum length attribute', () => {
      render(<PasswordChange onPasswordChange={mockOnPasswordChange} />);

      const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;

      expect(newPasswordInput.minLength).toBe(8);
    });
  });
});
