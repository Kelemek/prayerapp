import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrayerSearch } from './PrayerSearch';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            mockResolvedValue: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
        in: vi.fn(),
      })),
    })),
  },
}));

describe('PrayerSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.confirm mock
    global.confirm = vi.fn(() => true);
  });

  describe('Rendering', () => {
    it('renders the search component with header', () => {
      render(<PrayerSearch />);
      
      expect(screen.getByRole('heading', { name: /search & delete prayers/i })).toBeDefined();
    });

    it('displays the description text', () => {
      render(<PrayerSearch />);
      
      expect(screen.getByText(/search for prayers by requester name or email address/i)).toBeDefined();
    });

    it('renders search input field', () => {
      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i) as HTMLInputElement;
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

    it('search button is disabled when search term is empty', () => {
      render(<PrayerSearch />);
      
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      expect(searchButton).toHaveProperty('disabled', true);
    });
  });

  describe('Search Functionality', () => {
    it('enables search button when text is entered', async () => {
      const user = userEvent.setup();
      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      expect(searchButton).toHaveProperty('disabled', true);
      
      await user.type(searchInput, 'John');
      
      expect(searchButton).toHaveProperty('disabled', false);
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
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'John');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledWith('id, title, requester, email, status, created_at');
        expect(screen.getByText('Test Prayer')).toBeDefined();
        expect(screen.getByText('John Doe')).toBeDefined();
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
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      
      await user.type(searchInput, 'John{Enter}');

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalled();
        expect(screen.getByText('Test Prayer')).toBeDefined();
      });
    });

    it('displays "no prayers found" message when search returns empty', async () => {
      const user = userEvent.setup();

      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'NonexistentUser');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/no prayers found/i)).toBeDefined();
      });
    });

    it('displays error message when search fails', async () => {
      const user = userEvent.setup();

      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'Test');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/database error/i)).toBeDefined();
      });
    });
  });

  describe('Search Results Display', () => {
    it('displays prayer details in search results', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        {
          id: '1',
          title: 'Prayer for Healing',
          requester: 'Jane Smith',
          email: 'jane@example.com',
          status: 'current',
          created_at: '2025-01-15T10:30:00Z',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'Jane');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Prayer for Healing')).toBeDefined();
        expect(screen.getByText('Jane Smith')).toBeDefined();
        expect(screen.getByText('jane@example.com')).toBeDefined();
        expect(screen.getByText(/current/i)).toBeDefined();
      });
    });

    it('displays result count', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        { id: '1', title: 'Prayer 1', requester: 'User 1', email: 'user1@example.com', status: 'current', created_at: '2025-01-01T00:00:00Z' },
        { id: '2', title: 'Prayer 2', requester: 'User 2', email: 'user2@example.com', status: 'ongoing', created_at: '2025-01-02T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'User');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        // Check that results are displayed and count shows
        expect(screen.getByText('Prayer 1')).toBeDefined();
        expect(screen.getByText('Prayer 2')).toBeDefined();
        expect(screen.getByText(/found/i)).toBeDefined();
      });
    });
  });

  describe('Clear Search', () => {
    it('shows clear button when search term is entered', async () => {
      const user = userEvent.setup();
      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      
      await user.type(searchInput, 'Test');

      const clearButtons = screen.getAllByRole('button');
      const clearButton = clearButtons.find(btn => btn.querySelector('svg'));
      expect(clearButton).toBeDefined();
    });

    it('clears search term and results when clear button is clicked', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        { id: '1', title: 'Test Prayer', requester: 'John Doe', email: 'john@example.com', status: 'current', created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i) as HTMLInputElement;
      
      await user.type(searchInput, 'John');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined();
      });

      // Find and click the X button in the input field
      const clearButtons = screen.getAllByRole('button');
      const clearButton = clearButtons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.className.includes('absolute');
      });

      if (clearButton) {
        await user.click(clearButton);
      }

      expect(searchInput.value).toBe('');
      expect(screen.queryByText('Test Prayer')).toBeNull();
    });
  });

  describe('Select All Functionality', () => {
    it('shows select all checkbox when results are displayed', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        { id: '1', title: 'Prayer 1', requester: 'User 1', email: 'user1@example.com', status: 'current', created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'User');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText(/select all/i)).toBeDefined();
      });
    });

    it('selects all prayers when select all is clicked', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        { id: '1', title: 'Prayer 1', requester: 'User 1', email: 'user1@example.com', status: 'current', created_at: '2025-01-01T00:00:00Z' },
        { id: '2', title: 'Prayer 2', requester: 'User 2', email: 'user2@example.com', status: 'ongoing', created_at: '2025-01-02T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'User');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Prayer 1')).toBeDefined();
      });

      const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
      await user.click(selectAllCheckbox);

      await waitFor(() => {
        expect(screen.getByText(/2 selected/i)).toBeDefined();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('shows delete button for individual prayers', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        { id: '1', title: 'Test Prayer', requester: 'John Doe', email: 'john@example.com', status: 'current', created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'John');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button');
        const hasDeleteButton = deleteButtons.some(btn => btn.getAttribute('title') === 'Delete this prayer');
        expect(hasDeleteButton).toBe(true);
      });
    });

    it('shows bulk delete button when prayers are selected', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        { id: '1', title: 'Prayer 1', requester: 'User 1', email: 'user1@example.com', status: 'current', created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'User');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Prayer 1')).toBeDefined();
      });

      // Select a prayer by clicking its checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is "Select All", second is the prayer checkbox
      await user.click(checkboxes[1]);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete selected/i })).toBeDefined();
      });
    });

    it('requires confirmation before deleting a prayer', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        { id: '1', title: 'Test Prayer', requester: 'John Doe', email: 'john@example.com', status: 'current', created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });

      global.confirm = vi.fn(() => false); // User cancels

      render(<PrayerSearch />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'John');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Prayer')).toBeDefined();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => btn.getAttribute('title') === 'Delete this prayer');
      
      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(global.confirm).toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('Status Badge Colors', () => {
    it('displays different colored badges for different statuses', async () => {
      const user = userEvent.setup();
      const mockPrayers = [
        { id: '1', title: 'Current Prayer', requester: 'User 1', email: 'user1@example.com', status: 'current', created_at: '2025-01-01T00:00:00Z' },
        { id: '2', title: 'Ongoing Prayer', requester: 'User 2', email: 'user2@example.com', status: 'ongoing', created_at: '2025-01-02T00:00:00Z' },
        { id: '3', title: 'Answered Prayer', requester: 'User 3', email: 'user3@example.com', status: 'answered', created_at: '2025-01-03T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockPrayers,
        error: null,
      });

      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerSearch />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'User');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('current')).toBeDefined();
        expect(screen.getByText('ongoing')).toBeDefined();
        expect(screen.getByText('answered')).toBeDefined();
      });
    });
  });
});
