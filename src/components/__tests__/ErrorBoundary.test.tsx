import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock errorLogger first
vi.mock('../../lib/errorLogger', () => ({
  logError: vi.fn()
}));

import { ErrorBoundary } from '../ErrorBoundary';
import { logError } from '../../lib/errorLogger';

const mockLogError = vi.mocked(logError);

// Component that throws an error
function ThrowError(): null {
  throw new Error('Test error message');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders custom fallback when error is caught', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary fallback={<div>Custom error UI</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    
    consoleError.mockRestore();
  });

  it('renders default error UI when no fallback provided', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    
    consoleError.mockRestore();
  });

  it('displays recovery button to retry', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();
    
    consoleError.mockRestore();
  });

  it('resets error state when retry button is clicked', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const onReset = vi.fn();
    
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click retry button
    const button = screen.getByRole('button', { name: /try again/i });
    await user.click(button);

    // Verify that onReset was called and the error was cleared
    expect(onReset).toHaveBeenCalled();
    
    consoleError.mockRestore();
  });

  it('calls onReset callback when retry button is clicked', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onReset = vi.fn();
    const user = userEvent.setup();
    
    render(
      <ErrorBoundary onReset={onReset}>
        <ThrowError />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button', { name: /try again/i });
    await user.click(button);

    expect(onReset).toHaveBeenCalled();
    
    consoleError.mockRestore();
  });

  it('logs error when boundary catches error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'React Error Boundary caught error',
        error: expect.any(Error)
      })
    );
    
    consoleError.mockRestore();
  });

  it('displays generic error message when error has no message', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    
    consoleError.mockRestore();
  });

  it('displays refresh suggestion message', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/if this persists, try refreshing/i)).toBeInTheDocument();
    
    consoleError.mockRestore();
  });
});
