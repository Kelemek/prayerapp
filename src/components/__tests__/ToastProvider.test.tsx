import React, { useContext } from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider } from '../ToastProvider';
import { ToastContext } from '../../contexts/ToastContext';

describe('ToastProvider', () => {
  it('shows a toast and allows manual removal', async () => {
    const TestChild: React.FC = () => {
      const ctx = useContext(ToastContext);

      return (
        <div>
            <button onClick={() => ctx!.showToast('Hello world', 'success')}>Show Toast</button>
          </div>
      );
    };

    render(
      <ToastProvider>
        <TestChild />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText(/Show Toast/i));

    // Toast should be visible
    expect(screen.getByText(/Hello world/i)).toBeTruthy();

    // Manual close: find the close button inside the toast itself
    const toastContainer = screen.getByText(/Hello world/i).closest('div');
    const closeButton = within(toastContainer!).getByRole('button');
    fireEvent.click(closeButton);

    // After clicking close the toast should be removed
    expect(screen.queryByText(/Hello world/i)).toBeNull();

    // (Auto-remove is handled via timeout inside the provider; we verify manual removal.)
  });

  it('auto-dismisses toast after 5 seconds', async () => {
  const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const TestChild: React.FC = () => {
      const ctx = useContext(ToastContext);

      return (
        <div>
            <button onClick={() => ctx!.showToast('Auto remove', 'info')}>Show Auto</button>
          </div>
      );
    };

    render(
      <ToastProvider>
        <TestChild />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText(/Show Auto/i));

    // Toast should be visible
    expect(screen.getByText(/Auto remove/i)).toBeTruthy();

    // Ensure a timer was scheduled and invoke its callback to simulate expiry
    expect(setTimeoutSpy).toHaveBeenCalled();
    const lastCall = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
    const timerCallback = lastCall && lastCall[0];
    if (typeof timerCallback === 'function') {
      timerCallback();
    }

    await waitFor(() => {
      expect(screen.queryByText(/Auto remove/i)).toBeNull();
    });

    setTimeoutSpy.mockRestore();
  });

  it('renders multiple toasts and applies correct styles for types', async () => {
    const TestChild: React.FC = () => {
      const ctx = useContext(ToastContext);

      return (
        <div>
            <button onClick={() => ctx!.showToast('First', 'success')}>Show First</button>
            <button onClick={() => ctx!.showToast('Second', 'error')}>Show Second</button>
          </div>
      );
    };

    render(
      <ToastProvider>
        <TestChild />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText(/Show First/i));
    fireEvent.click(screen.getByText(/Show Second/i));

    // Both toasts should be visible
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();

    // Check styling for success (green) and error (red)
    const firstToast = screen.getByText('First').closest('div');
    const secondToast = screen.getByText('Second').closest('div');

    expect(firstToast?.className).toContain('bg-green-100');
    expect(secondToast?.className).toContain('bg-red-100');
  });
});
