import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrintPrayerList } from '../PrintPrayerList';
import * as printablePrayerListModule from '../../utils/printablePrayerList';

// Mock the printablePrayerList module
vi.mock('../../utils/printablePrayerList', () => ({
  downloadPrintablePrayerList: vi.fn(),
}));

describe('PrintPrayerList', () => {
  let mockWindow: any;
  const originalWindowOpen = window.open;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock window.open
    mockWindow = {
      close: vi.fn(),
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    };
    window.open = vi.fn(() => mockWindow);
  });

  afterEach(() => {
    window.open = originalWindowOpen;
  });

  describe('Rendering', () => {
    it('renders the print button', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      expect(printButton).toBeDefined();
    });

    it('displays print icon', () => {
      const { container } = render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      const svg = printButton.querySelector('svg');
      expect(svg).toBeDefined();
    });

    it('shows "Print" text on larger screens', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      expect(printButton.textContent).toContain('Print');
    });

    it('does not show dropdown menu initially', () => {
      render(<PrintPrayerList />);
      
      expect(screen.queryByText('Last Week')).toBeNull();
      expect(screen.queryByText('Last Month')).toBeNull();
      expect(screen.queryByText('Last Year')).toBeNull();
    });
  });

  describe('Dropdown Menu', () => {
    it('opens dropdown when print button is clicked', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      expect(screen.getByText('Last Week')).toBeDefined();
      expect(screen.getByText('Last Month')).toBeDefined();
      expect(screen.getByText('Last Year')).toBeDefined();
    });

    it('closes dropdown when print button is clicked again', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      expect(screen.getByText('Last Week')).toBeDefined();
      
      fireEvent.click(printButton);
      expect(screen.queryByText('Last Week')).toBeNull();
    });

    it('closes dropdown when clicking outside', () => {
      const { container } = render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      expect(screen.getByText('Last Week')).toBeDefined();
      
      // Click the overlay (fixed div with inset-0 and z-10)
      const overlay = container.querySelector('.fixed.inset-0.z-10');
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      expect(screen.queryByText('Last Week')).toBeNull();
    });

    it('displays checkmark next to selected range (week by default)', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week').parentElement;
      expect(weekOption?.textContent).toContain('✓');
    });
  });

  describe('Print Functionality', () => {
    it('calls downloadPrintablePrayerList with "week" when Last Week is clicked', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      mockDownload.mockResolvedValue(undefined);
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalledWith('week', mockWindow);
      });
    });

    it('calls downloadPrintablePrayerList with "month" when Last Month is clicked', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      mockDownload.mockResolvedValue(undefined);
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const monthOption = screen.getByText('Last Month');
      fireEvent.click(monthOption);
      
      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalledWith('month', mockWindow);
      });
    });

    it('calls downloadPrintablePrayerList with "year" when Last Year is clicked', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      mockDownload.mockResolvedValue(undefined);
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const yearOption = screen.getByText('Last Year');
      fireEvent.click(yearOption);
      
      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalledWith('year', mockWindow);
      });
    });

    it('opens a new window when printing', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      mockDownload.mockResolvedValue(undefined);
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      await waitFor(() => {
        expect(window.open).toHaveBeenCalledWith('', '_blank');
      });
    });

    it('closes dropdown after selecting a time range', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      mockDownload.mockResolvedValue(undefined);
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      // Dropdown should close immediately (not wait for print to complete)
      expect(screen.queryByText('Last Week')).toBeNull();
    });

    it('updates selected range after printing', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      mockDownload.mockResolvedValue(undefined);
      
      render(<PrintPrayerList />);
      
      // Open dropdown and select month
      let printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const monthOption = screen.getByText('Last Month');
      fireEvent.click(monthOption);
      
      await waitFor(() => {
        expect(mockDownload).toHaveBeenCalled();
      });
      
      // Open dropdown again and check that month is now selected
      printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const monthOptionAgain = screen.getByText('Last Month').parentElement;
      expect(monthOptionAgain?.textContent).toContain('✓');
    });
  });

  describe('Loading State', () => {
    it('shows "Generating..." text while printing', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      let resolveDownload: () => void;
      mockDownload.mockImplementation(() => new Promise(resolve => {
        resolveDownload = () => resolve(undefined);
      }));
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      await waitFor(() => {
        expect(screen.getByText(/generating/i)).toBeDefined();
      });
      
      // Resolve the promise
      resolveDownload!();
      
      await waitFor(() => {
        expect(screen.queryByText(/generating/i)).toBeNull();
      });
    });

    it('disables button while printing', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      let resolveDownload: () => void;
      mockDownload.mockImplementation(() => new Promise(resolve => {
        resolveDownload = () => resolve(undefined);
      }));
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /generating/i });
        expect(button).toHaveProperty('disabled', true);
      });
      
      // Resolve the promise
      resolveDownload!();
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /print/i });
        expect(button).toHaveProperty('disabled', false);
      });
    });

    it('shows spinner animation while printing', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      let resolveDownload: () => void;
      mockDownload.mockImplementation(() => new Promise(resolve => {
        resolveDownload = () => resolve(undefined);
      }));
      
      const { container } = render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      await waitFor(() => {
        const svg = container.querySelector('.animate-spin');
        expect(svg).toBeDefined();
      });
      
      // Resolve the promise
      resolveDownload!();
      
      await waitFor(() => {
        const svg = container.querySelector('.animate-spin');
        expect(svg).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('closes window when print fails', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      mockDownload.mockRejectedValue(new Error('Print failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      await waitFor(() => {
        expect(mockWindow.close).toHaveBeenCalled();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('logs error to console when print fails', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      const error = new Error('Print failed');
      mockDownload.mockRejectedValue(error);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error printing prayer list:', error);
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('resets loading state after error', async () => {
      const mockDownload = vi.mocked(printablePrayerListModule.downloadPrintablePrayerList);
      mockDownload.mockRejectedValue(new Error('Print failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekOption = screen.getByText('Last Week');
      fireEvent.click(weekOption);
      
      await waitFor(() => {
        expect(mockWindow.close).toHaveBeenCalled();
      });
      
      // Should show "Print" again, not "Generating..."
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /print/i });
        expect(button).toHaveProperty('disabled', false);
      });
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive classes to button', () => {
      const { container } = render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      expect(printButton.className).toContain('sm:px-4');
      expect(printButton.className).toContain('sm:text-base');
    });

    it('has different text display for mobile and desktop', () => {
      const { container } = render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      const hiddenOnMobile = printButton.querySelector('.lg\\:hidden');
      const hiddenOnDesktop = printButton.querySelector('.hidden.lg\\:inline');
      
      expect(hiddenOnMobile).toBeDefined();
      expect(hiddenOnDesktop).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has proper title attribute', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      expect(printButton.getAttribute('title')).toBe('Print');
    });

    it('button has proper disabled state styling', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      expect(printButton.className).toContain('disabled:opacity-50');
      expect(printButton.className).toContain('disabled:cursor-not-allowed');
    });

    it('menu options are keyboard accessible', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekButton = screen.getByText('Last Week').closest('button');
      const monthButton = screen.getByText('Last Month').closest('button');
      const yearButton = screen.getByText('Last Year').closest('button');
      
      expect(weekButton).toBeDefined();
      expect(monthButton).toBeDefined();
      expect(yearButton).toBeDefined();
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      expect(printButton.className).toContain('dark:bg-green-600');
      expect(printButton.className).toContain('dark:hover:bg-green-700');
    });

    it('dropdown menu has dark mode styles', () => {
      const { container } = render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      // Find the dropdown container div (not the inner flex div)
      const dropdown = container.querySelector('.absolute.left-0.mt-2');
      expect(dropdown?.className).toContain('dark:bg-gray-800');
      expect(dropdown?.className).toContain('dark:border-gray-700');
    });

    it('dropdown options have dark mode hover states', () => {
      render(<PrintPrayerList />);
      
      const printButton = screen.getByRole('button', { name: /print/i });
      fireEvent.click(printButton);
      
      const weekButton = screen.getByText('Last Week').closest('button');
      expect(weekButton?.className).toContain('dark:text-gray-300');
      expect(weekButton?.className).toContain('dark:hover:bg-gray-700');
    });
  });
});
