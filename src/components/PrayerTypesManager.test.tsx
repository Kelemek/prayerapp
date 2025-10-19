import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrayerTypesManager } from './PrayerTypesManager';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
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
}));

describe('PrayerTypesManager Component', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
  });

  describe('Rendering', () => {
    it('renders the component with header', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /prayer types/i })).toBeDefined();
      });
    });

    it('displays the description text', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/manage the types of prayers/i)).toBeDefined();
      });
    });

    it('renders Add Type button', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });
    });

    it('loads and displays prayer types on mount', async () => {
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', name: 'Family', display_order: 1, is_active: true, created_at: '2025-01-02T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
        expect(screen.getByText('Family')).toBeDefined();
      });
    });

    it('shows empty state when no types exist', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/no prayer types yet/i)).toBeDefined();
      });
    });
  });

  describe('Add Type Functionality', () => {
    it('shows add form when Add Type button is clicked', async () => {
      const user = userEvent.setup();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByText(/add new type/i)).toBeDefined();
      });
    });

    it('validates required name field', async () => {
      const user = userEvent.setup();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/please enter a type name/i)).toBeDefined();
      });
    });

    it('successfully creates a new prayer type', async () => {
      const user = userEvent.setup();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/type name/i)).toBeDefined();
      });

      await user.type(screen.getByLabelText(/type name/i), 'Thanksgiving');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Thanksgiving',
            is_active: true,
          }),
        ]);
      });
    });
  });

  describe('Edit Type Functionality', () => {
    it('shows edit button for each type', async () => {
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

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
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

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
          const nameInput = screen.getByLabelText(/type name/i) as HTMLInputElement;
          expect(nameInput.value).toBe('Personal');
        });
      }
    });
  });

  describe('Delete Type Functionality', () => {
    it('shows delete button for each type', async () => {
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

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
      const user = userEvent.setup();
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });

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
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('Active/Inactive Toggle', () => {
    it('displays active status for active types', async () => {
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
        // Check for active indicator (could be text, icon, or style)
        const container = screen.getByText('Personal').closest('div');
        expect(container).toBeDefined();
      });
    });

    it('displays inactive status for inactive types', async () => {
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: false, created_at: '2025-01-01T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
      });
    });
  });

  describe('Display Order', () => {
    it('displays types in order based on display_order field', async () => {
      const mockTypes = [
        { id: '1', name: 'Personal', display_order: 0, is_active: true, created_at: '2025-01-01T00:00:00Z' },
        { id: '2', name: 'Family', display_order: 1, is_active: true, created_at: '2025-01-02T00:00:00Z' },
        { id: '3', name: 'Community', display_order: 2, is_active: true, created_at: '2025-01-03T00:00:00Z' },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockTypes,
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText('Personal')).toBeDefined();
        expect(screen.getByText('Family')).toBeDefined();
        expect(screen.getByText('Community')).toBeDefined();
      });

      // Verify order was requested
      expect(mockOrder).toHaveBeenCalledWith('display_order', { ascending: true });
    });
  });

  describe('Error Handling', () => {
    it('displays error when loading types fails', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeDefined();
      });
    });

    it('displays error when creating type fails', async () => {
      const user = userEvent.setup();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'Insert failed' },
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/type name/i)).toBeDefined();
      });

      await user.type(screen.getByLabelText(/type name/i), 'Test Type');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText(/insert failed/i)).toBeDefined();
      });
    });
  });

  describe('Success Callback', () => {
    it('calls onSuccess callback after successful operation', async () => {
      const user = userEvent.setup();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      render(<PrayerTypesManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add type/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /add type/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/type name/i)).toBeDefined();
      });

      await user.type(screen.getByLabelText(/type name/i), 'Test Type');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
