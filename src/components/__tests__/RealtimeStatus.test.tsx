import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RealtimeStatus } from '../RealtimeStatus';

vi.mock('../../lib/supabase', () => ({
  directQuery: vi.fn()
}));

import { directQuery } from '../../lib/supabase';

describe('RealtimeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (vi.isFakeTimers()) {
      vi.useRealTimers();
    }
  });

  it('renders connected status when connection succeeds', async () => {
    vi.mocked(directQuery).mockResolvedValue({ error: null, data: [] });

    render(<RealtimeStatus />);

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders offline status when connection fails', async () => {
    vi.mocked(directQuery).mockResolvedValue({ error: new Error('Connection failed') as any, data: null });

    render(<RealtimeStatus />);

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders offline status when directQuery throws error', async () => {
    vi.mocked(directQuery).mockRejectedValue(new Error('Network error'));

    render(<RealtimeStatus />);

    await waitFor(() => {
      expect(screen.getByText('Offline')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays Wifi icon when connected', async () => {
    vi.mocked(directQuery).mockResolvedValue({ error: null, data: [] });

    const { container } = render(<RealtimeStatus />);

    await waitFor(() => {
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls directQuery on mount', async () => {
    vi.mocked(directQuery).mockResolvedValue({ error: null, data: [] });

    render(<RealtimeStatus />);

    await waitFor(() => {
      expect(directQuery).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('sets up interval to check connection periodically', async () => {
    vi.useFakeTimers();
    vi.mocked(directQuery).mockResolvedValue({ error: null, data: [] });

    render(<RealtimeStatus />);

    // Initial call on mount
    expect(directQuery).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    // Should have been called again after the interval
    expect(directQuery).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('cleans up interval on unmount', async () => {
    vi.useFakeTimers();
    vi.mocked(directQuery).mockResolvedValue({ error: null, data: [] });

    const { unmount } = render(<RealtimeStatus />);

    expect(directQuery).toHaveBeenCalledTimes(1);

    unmount();

    vi.advanceTimersByTime(30000);

    // directQuery should only have been called once (on mount)
    expect(directQuery).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('has appropriate styling for connected state', async () => {
    vi.mocked(directQuery).mockResolvedValue({ error: null, data: [] });

    const { container } = render(<RealtimeStatus />);

    await waitFor(() => {
      const div = container.querySelector('div');
      expect(div).toHaveClass('text-green-600');
    }, { timeout: 3000 });
  });

  it('has appropriate styling for offline state', async () => {
    vi.mocked(directQuery).mockResolvedValue({ error: new Error('Failed') as any, data: null });

    const { container } = render(<RealtimeStatus />);

    await waitFor(() => {
      const div = container.querySelector('div');
      expect(div).toHaveClass('text-red-600');
    }, { timeout: 3000 });
  });
});
