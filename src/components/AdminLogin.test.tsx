import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminLogin } from './AdminLogin';
import * as useAdminAuth from '../hooks/useAdminAuthHook';

// Mock the useAdminAuth hook
vi.mock('../hooks/useAdminAuthHook', () => ({
  useAdminAuth: vi.fn(),
}));

describe('AdminLogin Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAdminAuth.useAdminAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
    });
  });

  it('renders login form with all elements', () => {
    render(<AdminLogin />);
    
    expect(screen.getByText('Admin Portal')).toBeDefined();
    expect(screen.getByText('Sign in to manage prayer requests')).toBeDefined();
    expect(screen.getByPlaceholderText('Email Address')).toBeDefined();
    expect(screen.getByPlaceholderText('Password')).toBeDefined();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  it('updates email input when typing', async () => {
    const user = userEvent.setup();
    render(<AdminLogin />);
    
    const emailInput = screen.getByPlaceholderText('Email Address') as HTMLInputElement;
    await user.type(emailInput, 'admin@example.com');
    
    expect(emailInput.value).toBe('admin@example.com');
  });

  it('updates password input when typing', async () => {
    const user = userEvent.setup();
    render(<AdminLogin />);
    
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement;
    await user.type(passwordInput, 'password123');
    
    expect(passwordInput.value).toBe('password123');
  });

  it('calls login function with correct credentials on submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(true);
    
    render(<AdminLogin />);
    
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@example.com', 'password123');
    });
  });

  it('shows error message when login fails', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(false);
    
    render(<AdminLogin />);
    
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeDefined();
    });
  });

  it('shows error message when login throws exception', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Network error'));
    
    render(<AdminLogin />);
    
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Login failed. Please try again.')).toBeDefined();
    });
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
    
    render(<AdminLogin />);
    
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    
    await waitFor(() => {
      expect((submitButton as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it('shows loading text while submitting', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
    
    render(<AdminLogin />);
    
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(screen.getByText('Signing in...')).toBeDefined();
    
    await waitFor(() => {
      expect(screen.queryByText('Signing in...')).toBeNull();
    });
  });

  it('clears error message when retrying login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    
    render(<AdminLogin />);
    
    const emailInput = screen.getByPlaceholderText('Email Address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // First attempt - fails
    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeDefined();
    });
    
    // Second attempt - should clear error
    await user.clear(passwordInput);
    await user.type(passwordInput, 'correctpassword');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Invalid email or password')).toBeNull();
    });
  });
});
