import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptManager } from './PromptManager';
import { supabase } from '../lib/supabase';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(),
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
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

describe('PromptManager Component', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.confirm = vi.fn(() => true);
  });

  describe('Rendering', () => {
    it('renders the component with header', async () => {
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /prayer prompts/i })).toBeDefined();
      });
    });

    it('displays the description text', async () => {
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/search for prayer prompts by title, type, or description/i)).toBeDefined();
      });
    });

    it('renders search input field', async () => {
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search prompts/i);
        expect(searchInput).toBeDefined();
      });
    });

    it('renders Upload CSV button', async () => {
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload csv/i })).toBeDefined();
      });
    });

    it('renders Add Prompt button', async () => {
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ order: mockOrder }));

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add prompt/i })).toBeDefined();
      });
    });

    it('loads prayer types on mount', async () => {
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
          { id: '2', name: 'Family', display_order: 1, is_active: true },
        ],
        error: null,
      });

      const mockPromptsOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      const mockSelect = vi.fn((fields) => {
        if (fields === '*') {
          return { 
            eq: vi.fn(() => ({ order: mockTypesOrder }))
          };
        }
        return { order: mockPromptsOrder };
      });

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalled();
      });
    });
  });

  describe('Search Functionality', () => {
    it('performs search when search button is clicked', async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: '1',
          title: 'Gratitude Prayer',
          type: 'Personal',
          description: 'Give thanks',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockPrompts,
        error: null,
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search prompts/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'Gratitude');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Gratitude Prayer')).toBeDefined();
      });
    });

    it('performs search when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: '1',
          title: 'Gratitude Prayer',
          type: 'Personal',
          description: 'Give thanks',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockPrompts,
        error: null,
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search prompts/i);
      
      await user.type(searchInput, 'Gratitude{Enter}');

      await waitFor(() => {
        expect(mockOr).toHaveBeenCalled();
      });
    });

    it('displays "no prompts found" message when search returns empty', async () => {
      const user = userEvent.setup();

      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/search prompts/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      
      await user.type(searchInput, 'NonexistentPrompt');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/no prayer prompts found/i)).toBeDefined();
      });
    });
  });

  describe('Prayer Type Filter', () => {
    it.skip('displays prayer type filter dropdown', async () => {
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ 
        eq: vi.fn(() => ({ order: mockTypesOrder }))
      }));

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        const filterElements = screen.getAllByRole('combobox');
        expect(filterElements.length).toBeGreaterThan(0);
      });
    });

    it('filters prompts by selected prayer type', async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: '1',
          title: 'Personal Prayer',
          type: 'Personal',
          description: 'Personal desc',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockPrompts,
        error: null,
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
          { id: '2', name: 'Family', display_order: 1, is_active: true },
        ],
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      // Trigger search to get results
      await user.type(screen.getByPlaceholderText(/search prompts/i), 'Prayer');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(mockOr).toHaveBeenCalled();
      });
    });
  });

  describe('Add Prompt Functionality', () => {
    it('shows add form when Add Prompt button is clicked', async () => {
      const user = userEvent.setup();
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ 
        eq: vi.fn(() => ({ order: mockTypesOrder }))
      }));

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add prompt/i })).toBeDefined();
      });

      // Click the top Add Prompt button (not the submit button)
      const addButtons = screen.getAllByRole('button', { name: /add prompt/i });
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/add new prayer prompt/i)).toBeDefined();
      });
    });

    it.skip('validates required fields when submitting', async () => {
      const user = userEvent.setup();
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ 
        eq: vi.fn(() => ({ order: mockTypesOrder }))
      }));

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add prompt/i })).toBeDefined();
      });

      // Click the top Add Prompt button
      const addButtons1 = screen.getAllByRole('button', { name: /add prompt/i });
      await user.click(addButtons1[0]);

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /add prompt/i });
        expect(saveButton).toBeDefined();
      });

      // Click the submit button in the form
      const addButtons2 = screen.getAllByRole('button', { name: /add prompt/i });
      const submitBtn = addButtons2.find(btn => btn.getAttribute('type') === 'submit');
      if (submitBtn) await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/please fill in all fields/i)).toBeDefined();
      });
    });

    it('successfully creates a new prompt', async () => {
      const user = userEvent.setup();
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => ({ 
          eq: vi.fn(() => ({ order: mockTypesOrder }))
        })),
        insert: mockInsert,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add prompt/i })).toBeDefined();
      });

      // Click the top Add Prompt button
      const addButtons1 = screen.getAllByRole('button', { name: /add prompt/i });
      await user.click(addButtons1[0]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/pray for those in need/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/pray for those in need/i), 'New Prompt');
      await user.type(screen.getByPlaceholderText(/write a prayer or meditation prompt/i), 'Test description');
      
      // Click the submit button in the form
      const addButtons2 = screen.getAllByRole('button', { name: /add prompt/i });
      const submitBtn = addButtons2.find(btn => btn.getAttribute('type') === 'submit');
      if (submitBtn) await user.click(submitBtn);

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Prompt',
            description: 'Test description',
          })
        );
      });
    });
  });

  describe('Edit Prompt Functionality', () => {
    it('shows edit button for each prompt', async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: '1',
          title: 'Test Prompt',
          type: 'Personal',
          description: 'Test desc',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockPrompts,
        error: null,
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), 'Test');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Prompt')).toBeDefined();
        const editButtons = screen.getAllByRole('button');
        const hasEditButton = editButtons.some(btn => 
          btn.getAttribute('title')?.toLowerCase().includes('edit')
        );
        expect(hasEditButton).toBe(true);
      });
    });

    it('populates form with existing data when editing', async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: '1',
          title: 'Test Prompt',
          type: 'Personal',
          description: 'Test description',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockPrompts,
        error: null,
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), 'Test');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Prompt')).toBeDefined();
      });

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => 
        btn.getAttribute('title')?.toLowerCase().includes('edit')
      );

      if (editButton) {
        await user.click(editButton);

        await waitFor(() => {
          const titleInput = screen.getByPlaceholderText(/pray for those in need/i) as HTMLInputElement;
          expect(titleInput.value).toBe('Test Prompt');
        });
      }
    });
  });

  describe('Delete Prompt Functionality', () => {
    it('shows delete button for each prompt', async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: '1',
          title: 'Test Prompt',
          type: 'Personal',
          description: 'Test desc',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockPrompts,
        error: null,
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), 'Test');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Prompt')).toBeDefined();
        const deleteButtons = screen.getAllByRole('button');
        const hasDeleteButton = deleteButtons.some(btn => 
          btn.getAttribute('title')?.toLowerCase().includes('delete')
        );
        expect(hasDeleteButton).toBe(true);
      });
    });

    it('requires confirmation before deleting', async () => {
      const user = userEvent.setup();
      const mockPrompts = [
        {
          id: '1',
          title: 'Test Prompt',
          type: 'Personal',
          description: 'Test desc',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      const mockLimit = vi.fn().mockResolvedValue({
        data: mockPrompts,
        error: null,
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn(() => ({ eq: mockEq }));

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
        delete: mockDelete,
      }));

      global.confirm = vi.fn(() => false);

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), 'Test');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Prompt')).toBeDefined();
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

  describe('CSV Upload Functionality', () => {
    it('shows CSV upload form when Upload CSV button is clicked', async () => {
      const user = userEvent.setup();
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ 
        eq: vi.fn(() => ({ order: mockTypesOrder }))
      }));

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload csv/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /upload csv/i }));

      await waitFor(() => {
        expect(screen.getByText(/upload csv file/i)).toBeDefined();
      });
    });

    it.skip('cancels CSV upload when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ 
        eq: vi.fn(() => ({ order: mockTypesOrder }))
      }));

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload csv/i })).toBeDefined();
      });

      await user.click(screen.getByRole('button', { name: /upload csv/i }));

      await waitFor(() => {
        expect(screen.getByText(/upload csv file/i)).toBeDefined();
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText(/upload csv file/i)).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it.skip('displays error message when loading prayer types fails', async () => {
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockSelect = vi.fn(() => ({ 
        eq: vi.fn(() => ({ order: mockTypesOrder }))
      }));

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeDefined();
      });
    });

    it.skip('displays error message when search fails', async () => {
      const user = userEvent.setup();

      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Search failed' },
      });

      // Chain: .or() -> .order() -> .order() -> .limit()
      const mockOrder2 = vi.fn(() => ({ limit: mockLimit }));
      const mockOrder1 = vi.fn(() => ({ order: mockOrder2 }));
      const mockOr = vi.fn(() => ({ order: mockOrder1 }));

      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => ({
        select: vi.fn(() => {
          if (table === 'prayer_types') {
            return { 
              eq: vi.fn(() => ({ order: mockTypesOrder }))
            };
          }
          return { or: mockOr };
        }),
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search prompts/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/search prompts/i), 'Test');
      await user.click(screen.getByRole('button', { name: /^search$/i }));

      await waitFor(() => {
        expect(screen.getByText(/search failed/i)).toBeDefined();
      });
    });
  });

  describe('Success Callback', () => {
    it('calls onSuccess callback after successful operation', async () => {
      const user = userEvent.setup();
      const mockTypesOrder = vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Personal', display_order: 0, is_active: true },
        ],
        error: null,
      });

      const mockSelect = vi.fn(() => ({ 
        eq: vi.fn(() => ({ order: mockTypesOrder }))
      }));

      const mockInsert = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockImplementation((_table: string) => ({
        select: mockSelect,
        insert: mockInsert,
      }));

      render(<PromptManager onSuccess={mockOnSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add prompt/i })).toBeDefined();
      });

      // Click the top Add Prompt button
      const addButtons1 = screen.getAllByRole('button', { name: /add prompt/i });
      await user.click(addButtons1[0]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/pray for those in need/i)).toBeDefined();
      });

      await user.type(screen.getByPlaceholderText(/pray for those in need/i), 'Test Prompt');
      await user.type(screen.getByPlaceholderText(/write a prayer or meditation prompt/i), 'Test desc');
      
      // Click the submit button in the form
      const addButtons2 = screen.getAllByRole('button', { name: /add prompt/i });
      const submitBtn = addButtons2.find(btn => btn.getAttribute('type') === 'submit');
      if (submitBtn) await user.click(submitBtn);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
