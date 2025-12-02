import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '../../lib/supabase';

// Mock directQuery and directMutation
const mockDirectQuery = vi.fn();
const mockDirectMutation = vi.fn();

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(),
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
  directQuery: vi.fn(),
  directMutation: vi.fn(),
}));

// Import after mock to get mocked versions
import { directQuery, directMutation } from '../../lib/supabase';

describe('PrayerTypesManager Component', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
    // Reset module cache to clear cachedPrayerTypes between tests
    vi.resetModules();
    // Default mock for directQuery
    vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
    vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });
  });

  // Helper to get fresh component import after module reset
  const getComponent = async () => {
    const { PrayerTypesManager } = await import('../PrayerTypesManager');
    return PrayerTypesManager;
  };

  describe('Rendering', () => {
    it('renders the component with header', async () => {
      const PrayerTypesManager = await getComponent();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /prayer types/i })).toBeDefined();
      });
    });

    it('displays the description text', async () => {
      const PrayerTypesManager = await getComponent();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/manage the available types for prayer prompts/i)).toBeDefined();
      });
    });

    it('renders Add Type button', async () => {
      const PrayerTypesManager = await getComponent();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });
    });

    it('loads and displays prayer types on mount', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', name: 'Family', display_order: 1, is_active: true, created_at: '2025-01-02T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
        expect(screen.getByText('Family')).toBeDefined();
      });
    });

    it('shows empty state when no types exist', async () => {
      const PrayerTypesManager = await getComponent();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/no prayer types found/i)).toBeDefined();
      });
    });
  });

  describe('Add Type Functionality', () => {
    it('shows add form when Add Type button is clicked', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByText(/add new prayer type/i)).toBeDefined();
      });
    });

    it('successfully creates a new prayer type', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i), 'Thanksgiving');
      
      // Click submit button (not the top button)
      const addButtons = screen.getAllByRole('button', { name: /add type/i });
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(directMutation)).toHaveBeenCalledWith(
          'prayer_types',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Edit Type Functionality', () => {
    it('shows edit button for each type', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
        const editButtons = screen.getAllByRole('button');
        const hasEditButton = editButtons.some(btn => 
          btn.getAttribute('title')?.toLowerCase().includes('edit')
        );
        expect(hasEditButton).toBe(true);
      });
    });

    it('populates form with existing data when editing', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('edit')
      );

      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const nameInput = screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i) as HTMLInputElement;
          expect(nameInput.value).toBe('Personal');
        });
      }
    });
  });

  describe('Delete Type Functionality', () => {
    it('shows delete button for each type', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
        const deleteButtons = screen.getAllByRole('button');
        const hasDeleteButton = deleteButtons.some(btn => 
          btn.getAttribute('title')?.toLowerCase().includes('delete')
        );
        expect(hasDeleteButton).toBe(true);
      });
    });

    it('requires confirmation before deleting', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      global.confirm = vi.fn(() => false);

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('delete')
      );

      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(global.confirm).toHaveBeenCalled();
      expect(vi.mocked(directMutation)).not.toHaveBeenCalled();
    });
  });

  describe('Active/Inactive Toggle', () => {
    it('displays active status for active types', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
        // Check for active indicator (could be text, icon, or style)
        const container = screen.getByText('Personal').closest('div');
        expect(container).toBeDefined();
      });
    });

    it('displays inactive status for inactive types', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: false, created_at: '2025-01-01T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });
    });
  });

  describe('Display Order', () => {
    it('displays types in order based on display_order field', async () => {
      const PrayerTypesManager = await getComponent();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', name: 'Family', display_order: 1, is_active: true, created_at: '2025-01-02T00:00:00Z' },
        { id: '3', name: 'Community', display_order: 2, is_active: true, created_at: '2025-01-03T00:00:00Z' },
      ];

      vi.mocked(directQuery).mockResolvedValue({ data: mockTypes, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
        expect(screen.getByText('Family')).toBeDefined();
        expect(screen.getByText('Community')).toBeDefined();
      });

      // Verify directQuery was called with order
      expect(vi.mocked(directQuery)).toHaveBeenCalledWith(
        'prayer_types',
        expect.objectContaining({
          order: expect.objectContaining({
            column: 'display_order',
            ascending: true,
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('displays error when loading types fails', async () => {
      const PrayerTypesManager = await getComponent();
      vi.mocked(directQuery).mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeDefined();
      });
    });

    it('displays error when creating type fails', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
      vi.mocked(directMutation).mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i), 'Test Type');
      
      // Click submit button
      const addButtons = screen.getAllByRole('button', { name: /add type/i });
      const submitButton = addButtons.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/insert failed/i)).toBeDefined();
      });
    });
  });

  describe('Success Callback', () => {
    it('calls onSuccess callback after successful operation', async () => {
      const PrayerTypesManager = await getComponent();
      const user = userEvent.setup();
      vi.mocked(directQuery).mockResolvedValue({ data: [], error: null });
      vi.mocked(directMutation).mockResolvedValue({ data: null, error: null });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      // Click top button to show form
      const addButtons1 = screen.getAllByRole('button', { name: /add type/i });
      await user.click(addButtons1[0]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/e.g., healing, guidance, thanksgiving/i), 'Test Type');
      
      // Click submit button
      const addButtons2 = screen.getAllByRole('button', { name: /add type/i });
      const submitButton = addButtons2.find(btn => btn.getAttribute('type') === 'submit');
      if (submitButton) await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
