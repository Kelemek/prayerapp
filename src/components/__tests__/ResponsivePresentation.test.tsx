import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResponsivePresentation } from '../ResponsivePresentation';
import * as PrayerPresentationModule from '../PrayerPresentation';
import * as MobilePresentationModule from '../MobilePresentation';

// Mock the child presentation components
vi.mock('../PrayerPresentation', () => ({
  PrayerPresentation: () => <div data-testid="prayer-presentation">Desktop Presentation</div>
}));

vi.mock('../MobilePresentation', () => ({
  MobilePresentation: () => <div data-testid="mobile-presentation">Mobile Presentation</div>
}));

describe('ResponsivePresentation Component', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    vi.clearAllMocks();
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('renders desktop presentation on desktop viewport', async () => {
    // Set desktop width (> 640px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<ResponsivePresentation />);

    await waitFor(() => {
      expect(screen.getByTestId('prayer-presentation')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('mobile-presentation')).not.toBeInTheDocument();
  });

  it('renders mobile presentation on mobile viewport', async () => {
    // Set mobile width (< 640px)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<ResponsivePresentation />);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-presentation')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('prayer-presentation')).not.toBeInTheDocument();
  });

  it('renders desktop presentation at exactly 640px (sm breakpoint)', async () => {
    // Set width at Tailwind sm breakpoint
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 640,
    });

    render(<ResponsivePresentation />);

    await waitFor(() => {
      expect(screen.getByTestId('prayer-presentation')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('mobile-presentation')).not.toBeInTheDocument();
  });

  it('listens for window resize events', async () => {
    // Start with desktop width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<ResponsivePresentation />);

    await waitFor(() => {
      expect(screen.getByTestId('prayer-presentation')).toBeInTheDocument();
    });

    // Resize to mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('mobile-presentation')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('prayer-presentation')).not.toBeInTheDocument();
  });

  it('switches from mobile to desktop on resize', async () => {
    // Start with mobile width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<ResponsivePresentation />);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-presentation')).toBeInTheDocument();
    });

    // Resize to desktop width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Trigger resize event
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('prayer-presentation')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('mobile-presentation')).not.toBeInTheDocument();
  });

  it('cleans up resize event listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { unmount } = render(<ResponsivePresentation />);

    await waitFor(() => {
      expect(screen.getByTestId('prayer-presentation')).toBeInTheDocument();
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('handles multiple resize events correctly', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    render(<ResponsivePresentation />);

    await waitFor(() => {
      expect(screen.getByTestId('prayer-presentation')).toBeInTheDocument();
    });

    // Trigger multiple resize events
    for (let i = 0; i < 3; i++) {
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }

    // Should still render desktop presentation
    expect(screen.getByTestId('prayer-presentation')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-presentation')).not.toBeInTheDocument();
  });

  it('uses correct breakpoint for mobile detection (< 640px)', async () => {
    // Test just below breakpoint
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 639,
    });

    render(<ResponsivePresentation />);

    await waitFor(() => {
      expect(screen.getByTestId('mobile-presentation')).toBeInTheDocument();
    });
  });

  it('exports component correctly', () => {
    expect(ResponsivePresentation).toBeDefined();
    expect(typeof ResponsivePresentation).toBe('function');
  });

  it('renders correct child component based on initial window size', async () => {
    // Test various viewport sizes
    const testCases = [
      { width: 320, expectedComponent: 'mobile-presentation' },
      { width: 375, expectedComponent: 'mobile-presentation' },
      { width: 639, expectedComponent: 'mobile-presentation' },
      { width: 640, expectedComponent: 'prayer-presentation' },
      { width: 768, expectedComponent: 'prayer-presentation' },
      { width: 1024, expectedComponent: 'prayer-presentation' },
      { width: 1920, expectedComponent: 'prayer-presentation' },
    ];

    for (const testCase of testCases) {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: testCase.width,
      });

      const { unmount } = render(<ResponsivePresentation />);

      await waitFor(() => {
        expect(screen.getByTestId(testCase.expectedComponent)).toBeInTheDocument();
      });

      unmount();
    }
  });
});
