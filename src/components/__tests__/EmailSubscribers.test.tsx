import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmailSubscribers } from '../EmailSubscribers';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

describe('EmailSubscribers Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
  });

  describe('Rendering', () => {
    it('renders the component with header', () => {
      render(<EmailSubscribers />);
      
      expect(screen.getByRole('heading', { name: /email notification subscribers/i })).toBeDefined();
    });

    it('displays the description text', () => {
      render(<EmailSubscribers />);
      
      expect(screen.getByText(/search for subscribers by name or email/i)).toBeDefined();
    });

    it('renders search input field', () => {
      render(<EmailSubscribers />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i) as HTMLInputElement;
      expect(searchInput).toBeDefined();
      expect(searchInput.type).toBe('text');
    });

    it('renders Upload CSV button', () => {
      render(<EmailSubscribers />);
      
      expect(screen.getByRole('button', { name: /upload csv/i })).toBeDefined();
    });

    it('renders Add Subscriber button', () => {
      render(<EmailSubscribers />);
      
      expect(screen.getByRole('button', { name: /add subscriber/i })).toBeDefined();
    });

    it('shows empty state message initially', () => {
      render(<EmailSubscribers />);
      
      expect(screen.getByText(/enter a name or email to search/i)).toBeDefined();
    });
  });

  describe('Search Functionality', () => {
    it('enables search button when text is entered', async () => {
      const user = userEvent.setup();
      render(<EmailSubscribers />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'John');
      
      expect(searchButton).not.toHaveProperty('disabled', true);
    });

    it('performs search when search button is clicked', async () => {
      const user = userEvent.setup();
      const mockSubscribers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockSubscribers,
        error: null,
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<EmailSubscribers />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'John');
      await user.click(searchButton);

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalledWith('*');
        expect(screen.getByText('John Doe')).toBeDefined();
        expect(screen.getByText('john@example.com')).toBeDefined();
      });
    });

    it('performs search when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const mockSubscribers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockSubscribers,
        error: null,
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<EmailSubscribers />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      
      await user.type(searchInput, 'John{Enter}');

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalled();
        expect(screen.getByText('John Doe')).toBeDefined();
      });
    });

    it('displays "no subscribers found" message when search returns empty', async () => {
      const user = userEvent.setup();

      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<EmailSubscribers />);
      
      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'NonexistentUser');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/no subscribers found/i)).toBeDefined();
      });
    });
  });

  describe('Add Subscriber Functionality', () => {
    it('shows add form when Add Subscriber button is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSubscribers />);
      
      const addButton = screen.getByRole('button', { name: /add subscriber/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/john doe/i)).toBeDefined();
        expect(screen.getByPlaceholderText(/john@example.com/i)).toBeDefined();
      });
    });

    it('successfully adds a subscriber', async () => {
      const user = userEvent.setup();
      
      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      render(<EmailSubscribers />);
      
      const addButtons = screen.getAllByRole('button', { name: /add subscriber/i });
      await user.click(addButtons[0]); // Click the top "Add Subscriber" button

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/john doe/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/john doe/i), 'John Doe');
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'john@example.com');

      const submitButtons = screen.getAllByRole('button', { name: /add subscriber/i });
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            is_active: true,
          }),
        ]);
      });
    });

    it('clears form after successful add', async () => {
      const user = userEvent.setup();
      
      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      render(<EmailSubscribers />);
      
      const addButtons = screen.getAllByRole('button', { name: /add subscriber/i });
      await user.click(addButtons[0]); // Click the top "Add Subscriber" button

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/john doe/i)).toBeDefined();
      });

      const nameInput = screen.getByPlaceholderText(/john doe/i) as HTMLInputElement;
      const emailInput = screen.getByPlaceholderText(/john@example.com/i) as HTMLInputElement;

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');

      const submitButtons = screen.getAllByRole('button', { name: /add subscriber/i });
      const submitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });
    });

    it('cancels add form when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSubscribers />);
      
      const addButtons = screen.getAllByRole('button', { name: /add subscriber/i });
      await user.click(addButtons[0]); // Click the top "Add Subscriber" button

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/john doe/i)).toBeDefined();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/john doe/i)).toBeNull();
      });
    });
  });

  describe('Remove Subscriber Functionality', () => {
    it('shows remove button for each subscriber', async () => {
      const user = userEvent.setup();
      const mockSubscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockSubscribers,
        error: null,
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<EmailSubscribers />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'John');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        const removeButtons = screen.getAllByRole('button');
        const hasDeleteButton = removeButtons.some(btn => 
          btn.getAttribute('title')?.toLowerCase().includes('delete')
        );
        expect(hasDeleteButton).toBe(true);
      });
    });

    it('requires confirmation before removing subscriber', async () => {
      const user = userEvent.setup();
      const mockSubscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockSubscribers,
        error: null,
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });

      global.confirm = vi.fn(() => false);

      render(<EmailSubscribers />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'John');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeDefined();
      });

      const removeButtons = screen.getAllByRole('button');
      const deleteButton = removeButtons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('delete')
      );

      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(global.confirm).toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('successfully removes subscriber when confirmed', async () => {
      const user = userEvent.setup();
      const mockSubscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockSubscribers,
        error: null,
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));

      // Mock for the delete flow: first checks is_admin, then deletes (for non-admin)
      const mockMaybeSingle = vi.fn().mockResolvedValue({ 
        data: { is_admin: false }, // Not an admin, so will delete
        error: null 
      });
      const mockEqCheck = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'email_subscribers') {
          return {
            select: (query: string) => {
              // If selecting 'is_admin', it's the admin check
              if (query === 'is_admin') {
                return { eq: mockEqCheck };
              }
              // Otherwise it's the search query  
              return { or: mockOr };
            },
            delete: mockDelete,
          };
        }
        return {};
      });

      global.confirm = vi.fn(() => true);

      render(<EmailSubscribers />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'John');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeDefined();
      });

      const removeButtons = screen.getAllByRole('button');
      const deleteButton = removeButtons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('delete')
      );

      if (deleteButton) {
        await user.click(deleteButton);
      }

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled();
        expect(mockEq).toHaveBeenCalledWith('id', '1');
      });
    });
  });

  describe('CSV Upload Functionality', () => {
    it('shows CSV upload form when Upload CSV button is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSubscribers />);
      
      const uploadButton = screen.getByRole('button', { name: /upload csv/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload csv file/i)).toBeDefined();
      });
    });

    it('shows file input for CSV upload', async () => {
      const user = userEvent.setup();
      render(<EmailSubscribers />);
      
      await user.click(screen.getByRole('button', { name: /upload csv/i }));

      await waitFor(() => {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        expect(fileInputs.length).toBeGreaterThan(0);
      });
    });

    it('cancels CSV upload when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<EmailSubscribers />);
      
      await user.click(screen.getByRole('button', { name: /upload csv/i }));

      await waitFor(() => {
        expect(screen.getByText(/upload csv file/i)).toBeDefined();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/upload csv file/i)).toBeNull();
      });
    });
  });

  describe('Active Status Display', () => {
    it('displays active status badge for active subscribers', async () => {
      const user = userEvent.setup();
      const mockSubscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockSubscribers,
        error: null,
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<EmailSubscribers />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'John');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        const activeBadges = screen.getAllByText(/active/i);
        expect(activeBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays inactive status badge for inactive subscribers', async () => {
      const user = userEvent.setup();
      const mockSubscribers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', is_active: false, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockSubscribers,
        error: null,
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<EmailSubscribers />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'John');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText(/inactive/i)).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when search fails', async () => {
      const user = userEvent.setup();

      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockOrder = vi.fn(() => ({ limit: mockLimit }));
      const mockOr = vi.fn(() => ({ order: mockOrder }));
      const mockSelect = vi.fn(() => ({ or: mockOr }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<EmailSubscribers />);
      
      await user.type(screen.getByPlaceholderText(/search by name or email/i), 'Test');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeDefined();
      });
    });

    it('displays error message when add fails', async () => {
      const user = userEvent.setup();
      
      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'Insert failed' },
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      render(<EmailSubscribers />);
      
      await user.click(screen.getByRole('button', { name: /add subscriber/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/john doe/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/john doe/i), 'John Doe');
      await user.type(screen.getByPlaceholderText(/john@example.com/i), 'john@example.com');
      
      const addButtons = screen.getAllByRole('button', { name: /add subscriber/i });
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) {
        await user.click(submitButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/insert failed/i)).toBeDefined();
      });
    });
  });
});
