import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PendingUpdateCard } from '../PendingUpdateCard';
import type { PrayerUpdate } from '../../types/prayer';

describe('PendingUpdateCard', () => {
  const mockOnApprove = vi.fn();
  const mockOnDeny = vi.fn();
  const mockOnEdit = vi.fn();

  const mockUpdate: PrayerUpdate & { prayer_title?: string } = {
    id: 'update-123',
    prayer_id: 'prayer-456',
    prayer_title: 'Test Prayer Title',
    content: 'This is a test update for the prayer',
    author: 'John Doe',
    author_email: 'john@example.com',
    is_anonymous: false,
    created_at: '2025-10-18T10:00:00Z',
    approval_status: 'pending'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnApprove.mockResolvedValue(undefined);
    mockOnDeny.mockResolvedValue(undefined);
    mockOnEdit.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('renders the component with heading', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Prayer Update')).toBeDefined();
    });

    it('renders update content', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('This is a test update for the prayer')).toBeDefined();
    });

    it('renders prayer title when provided', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Update for: Test Prayer Title/i)).toBeDefined();
    });

    it('does not render prayer title section when not provided', () => {
      const updateWithoutTitle = { ...mockUpdate, prayer_title: undefined };
      render(
        <PendingUpdateCard
          update={updateWithoutTitle}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.queryByText(/Update for:/i)).toBeNull();
    });

    it('renders author name', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/By John Doe/i)).toBeDefined();
    });

    it('renders author email when provided', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Email: john@example.com/i)).toBeDefined();
    });

    it('does not render email when not provided', () => {
      const updateWithoutEmail = { ...mockUpdate, author_email: undefined };
      render(
        <PendingUpdateCard
          update={updateWithoutEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const emailTexts = screen.queryAllByText(/Email:/i);
      expect(emailTexts.length).toBe(0);
    });

    it('renders formatted date', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Submitted/i)).toBeDefined();
    });

    it('renders approve button', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByRole('button', { name: /approve/i })).toBeDefined();
    });

    it('renders deny button', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByRole('button', { name: /^deny$/i })).toBeDefined();
    });

    it('renders edit button when onEdit prop is provided', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByRole('button', { name: /^edit$/i })).toBeDefined();
    });

    it('does not render edit button when onEdit prop is not provided', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.queryByRole('button', { name: /^edit$/i })).toBeNull();
    });
  });

  describe('Approve Action', () => {
    it('calls onApprove when approve button is clicked', async () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledTimes(1);
        expect(mockOnApprove).toHaveBeenCalledWith('update-123');
      });
    });

    it('shows loading state when approving', async () => {
      mockOnApprove.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      expect(screen.getByText(/Approving.../i)).toBeDefined();
      
      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalled();
      });
    });

    it('disables buttons while approving', async () => {
      mockOnApprove.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      
      fireEvent.click(approveButton);

      expect((approveButton as HTMLButtonElement).disabled).toBe(true);
      expect((denyButton as HTMLButtonElement).disabled).toBe(true);
      
      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalled();
      });
    });
  });

  describe('Deny Action', () => {
    it('shows deny form when deny button is clicked', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      expect(screen.getByText(/Reason for denial/i)).toBeDefined();
    });

    it('hides deny form initially', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.queryByText(/Reason for denial/i)).toBeNull();
    });

    it('toggles deny form visibility', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      
      // Show form
      fireEvent.click(denyButton);
      expect(screen.getByText(/Reason for denial/i)).toBeDefined();
      
      // Hide form
      fireEvent.click(denyButton);
      expect(screen.queryByText(/Reason for denial/i)).toBeNull();
    });

    it('allows typing in denial reason textarea', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Inappropriate content' } });

      expect(textarea.value).toBe('Inappropriate content');
    });

    it('calls onDeny with reason when form is submitted', async () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: 'Invalid update' } });

      const submitButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnDeny).toHaveBeenCalledTimes(1);
        expect(mockOnDeny).toHaveBeenCalledWith('update-123', 'Invalid update');
      });
    });

    it('validates whitespace-only denial reason', async () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: '   ' } });

      const form = textarea.closest('form')!;
      fireEvent.submit(form);

      // Should not call onDeny with whitespace-only reason
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockOnDeny).not.toHaveBeenCalled();
    });

    it('hides deny form after submission', async () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: 'Test reason' } });

      const submitButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/Reason for denial/i)).toBeNull();
      });
    });

    it('does not submit with empty reason', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const submitButton = screen.getByRole('button', { name: /confirm denial/i }) as HTMLButtonElement;
      
      expect(submitButton.disabled).toBe(true);
    });

    it('does not submit with whitespace-only reason', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: '   ' } });

      const submitButton = screen.getByRole('button', { name: /confirm denial/i }) as HTMLButtonElement;
      
      expect(submitButton.disabled).toBe(true);
    });

    it('shows loading state when denying', async () => {
      mockOnDeny.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: 'Test' } });

      const submitButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(submitButton);

      expect(screen.getByText(/Denying.../i)).toBeDefined();
      
      await waitFor(() => {
        expect(mockOnDeny).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Functionality', () => {
    it('shows edit form when edit button is clicked', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      fireEvent.click(editButton);

      expect(screen.getByText(/Update Details/i)).toBeDefined();
      expect(screen.getByText(/^Author \*/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDefined();
    });

    it('hides header and action buttons when editing', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      fireEvent.click(editButton);

      expect(screen.queryByText('Prayer Update')).toBeNull();
      expect(screen.queryByRole('button', { name: /approve/i })).toBeNull();
    });

    it('populates edit form with current values', () => {
      const { container } = render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      fireEvent.click(editButton);

      const textareas = container.querySelectorAll('textarea');
      const inputs = container.querySelectorAll('input[type="text"]');
      
      // Find the textarea in the edit form (not the deny form)
      const contentTextarea = textareas[0] as HTMLTextAreaElement;
      const authorInput = inputs[0] as HTMLInputElement;

      expect(contentTextarea.value).toBe('This is a test update for the prayer');
      expect(authorInput.value).toBe('John Doe');
    });

    it('allows editing content and author', () => {
      const { container } = render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      fireEvent.click(editButton);

      const textareas = container.querySelectorAll('textarea');
      const inputs = container.querySelectorAll('input[type="text"]');
      
      const contentTextarea = textareas[0] as HTMLTextAreaElement;
      const authorInput = inputs[0] as HTMLInputElement;

      fireEvent.change(contentTextarea, { target: { value: 'Updated content' } });
      fireEvent.change(authorInput, { target: { value: 'Jane Smith' } });

      expect(contentTextarea.value).toBe('Updated content');
      expect(authorInput.value).toBe('Jane Smith');
    });

    it('saves edits when save button is clicked', async () => {
      const { container } = render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      fireEvent.click(editButton);

      const textareas = container.querySelectorAll('textarea');
      const inputs = container.querySelectorAll('input[type="text"]');
      
      const contentTextarea = textareas[0];
      const authorInput = inputs[0];

      fireEvent.change(contentTextarea, { target: { value: 'Edited content' } });
      fireEvent.change(authorInput, { target: { value: 'New Author' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith('update-123', {
          content: 'Edited content',
          author: 'New Author'
        });
      });
    });

    it('exits edit mode after saving changes', async () => {
      const { container } = render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      fireEvent.click(editButton);

      const textareas = container.querySelectorAll('textarea');
      const contentTextarea = textareas[0];
      fireEvent.change(contentTextarea, { target: { value: 'Edited' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalled();
        expect(screen.queryByText(/Update Details \*/i)).toBeNull();
      });
    });

    it('cancels editing when cancel button is clicked', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByRole('button', { name: /^edit$/i });
      fireEvent.click(editButton);

      expect(screen.getByText(/Update Details \*/i)).toBeDefined();

      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      const editCancelButton = cancelButtons[0]; // First cancel is for edit form
      fireEvent.click(editCancelButton);

      expect(screen.queryByText(/Update Details \*/i)).toBeNull();
      expect(screen.getByText('Prayer Update')).toBeDefined();
    });
  });

  describe('Dark Mode Support', () => {
    it('includes dark mode classes for container', () => {
      const { container } = render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('dark:bg-gray-800');
      expect(card.className).toContain('dark:border-gray-700');
    });

    it('includes dark mode classes for text', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const heading = screen.getByText('Prayer Update');
      expect(heading.className).toContain('dark:text-gray-100');
    });
  });

  describe('Icons', () => {
    it('renders approve icon', () => {
      const { container } = render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const checkIcon = container.querySelector('svg.lucide-check-circle');
      expect(checkIcon).toBeDefined();
    });

    it('renders deny icon', () => {
      const { container } = render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const xIcon = container.querySelector('svg.lucide-x-circle');
      expect(xIcon).toBeDefined();
    });

    it('renders edit icon when onEdit provided', () => {
      const { container } = render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editIcon = container.querySelector('svg.lucide-edit-2');
      expect(editIcon).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading for title', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const heading = screen.getByText('Prayer Update');
      expect(heading.tagName).toBe('H3');
    });

    it('textarea has required attribute in deny form', () => {
      render(
        <PendingUpdateCard
          update={mockUpdate}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i) as HTMLTextAreaElement;
      expect(textarea.required).toBe(true);
    });
  });
});
