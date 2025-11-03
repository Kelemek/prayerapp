import React, { useContext } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { ToastContext } from '../contexts/ToastContext';

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
});
