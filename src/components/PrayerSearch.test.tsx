import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrayerSearch } from './PrayerSearch';
import { supabase } from '../lib/supabase';

// Mock Supabase
let mockPrayerData: any[] = [];

vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => {
        // Create a fresh query builder for each call to from()
        const builder: any = {};
        builder.select = vi.fn(() => builder);
        builder.or = vi.fn(() => builder);
        builder.eq = vi.fn(() => builder);
        builder.order = vi.fn(() => builder);
        builder.limit = vi.fn(() => Promise.resolve({ data: mockPrayerData, error: null }));
        builder.in = vi.fn(() => Promise.resolve({ data: null, error: null }));
        return builder;
      }),
    },
  };
});

// Helper function to set mock data
const setMockPrayerData = (data: any[]) => {
  mockPrayerData = data;
};

describe('PrayerSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.confirm mock
    global.confirm = vi.fn(() => true);
    // Reset mock data
    setMockPrayerData([]);
  });

  describe('Rendering', () => {
    it('renders the search component with header', () => {
      render(<PrayerSearch />);
      
      expect(screen.getByRole('heading', { name: /prayer search & log/i })).toBeDefined();
    });

    it('displays the description text', () => {
      render(<PrayerSearch />);
      
      expect(screen.getByText(/search and filter prayers by title, requester, email, description, or denial reasons/i)).toBeDefined();
    });

    it('renders search input field', () => {
      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i) as HTMLInputElement;
      expect(searchInput).toBeDefined();
      expect(searchInput.type).toBe('text');
    });

    it('renders search button', () => {
      render(<PrayerSearch />);
      
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      expect(searchButton).toBeDefined();
    });

    it('displays warning message about permanent deletion', () => {
      render(<PrayerSearch />);
      
      expect(screen.getByText(/warning/i)).toBeDefined();
      expect(screen.getByText(/deleting prayers is permanent/i)).toBeDefined();
    });

    it('search button is enabled even when search term is empty (filters can be used)', () => {
      render(<PrayerSearch />);
      
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      // Search button is always enabled - validation happens on submit
      expect(searchButton).toHaveProperty('disabled', false);
    });
  });

  describe('Search Functionality', () => {
    it('allows typing in search input', async () => {
      const user = userEvent.setup();
      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i) as HTMLInputElement;
      
      await user.type(searchInput, 'John');
      
      expect(searchInput.value).toBe('John');
    });

    it('performs search when search button is clicked', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ];

      setMockPrayerData(mockPrayers);

      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'John');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined();
        expect(screen.getByText(/John Doe/)).toBeDefined();
      });
    });

    it('performs search when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        {
          id: '1',
          title: 'Test Prayer',
          requester: 'John Doe',
          email: 'john@example.com',
          status: 'current',
          approval_status: 'approved',
          created_at: '2025-01-01T00:00:00Z',
          prayer_updates: [],
        },
      ];

      setMockPrayerData(mockPrayers);

      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i);
      
      await user.type(searchInput, 'John{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined();
      });
    });

    it('displays "no prayers found" message when search returns empty', async () => {
      const user = userEvent.setup();

      setMockPrayerData([]);

      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/Search by title, requester, email, description, or denial reasons/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'NonexistentUser');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/no prayers found/i)).toBeDefined();
      });
    });
  });

  describe('Responsive Layout', () => {
    it('renders filter dropdowns with responsive grid layout', () => {
      render(<PrayerSearch />);
      
      const filterGrid = document.querySelector('.grid.grid-cols-1');
      expect(filterGrid).toBeDefined();
      expect(filterGrid?.className).toContain('lg:grid-cols-2');
    });

    it('renders prayer status and approval status dropdowns', () => {
      render(<PrayerSearch />);
      
      const prayerStatusLabel = screen.getByText('Prayer Status');
      const approvalStatusLabel = screen.getByText('Approval Status');
      
      expect(prayerStatusLabel).toBeDefined();
      expect(approvalStatusLabel).toBeDefined();
    });
  });
});
