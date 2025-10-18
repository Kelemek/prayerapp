import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PendingPrayerCard } from './PendingPrayerCard';
import type { PrayerRequest } from '../types/prayer';
import { PrayerStatus } from '../types/prayer';

describe('PendingPrayerCard', () => {
  const mockPrayer: PrayerRequest = {
    id: 'prayer-1',
    title: 'Prayer for John',
    description: 'Please pray for healing and strength',
    requester: 'Jane Doe',
    prayer_for: 'John',
    email: 'jane@test.com',
    status: PrayerStatus.CURRENT,
    is_anonymous: false,
    date_requested: '2024-01-15T10:30:00Z',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  };

  const mockOnApprove = vi.fn();
  const mockOnDeny = vi.fn();
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnApprove.mockResolvedValue(undefined);
    mockOnDeny.mockResolvedValue(undefined);
    mockOnEdit.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('renders prayer card with title', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Prayer for John')).toBeDefined();
    });

    it('displays prayer description', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Please pray for healing and strength')).toBeDefined();
    });

    it('displays requester name', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText(/Jane Doe/)).toBeDefined();
    });

    it('displays email when provided', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText(/Email: jane@test.com/)).toBeDefined();
    });

    it('does not display email section when email is null', () => {
      const prayerWithoutEmail = { ...mockPrayer, email: null };
      
      render(
        <PendingPrayerCard
          prayer={prayerWithoutEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.queryByText(/Email:/)).toBeNull();
    });

    it('displays anonymous badge when is_anonymous is true', () => {
      const anonymousPrayer = { ...mockPrayer, is_anonymous: true };
      
      render(
        <PendingPrayerCard
          prayer={anonymousPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('(Anonymous Request)')).toBeDefined();
    });

    it('displays formatted date', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText(/Requested/)).toBeDefined();
      expect(screen.getByText(/2024/)).toBeDefined();
    });

    it('displays prayer status', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText(/Status: current/)).toBeDefined();
    });
  });

  describe('Approve Action', () => {
    it('renders approve button', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Approve')).toBeDefined();
    });

    it('calls onApprove when approve button clicked', async () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith('prayer-1');
      });
    });

    it('shows loading state during approval', async () => {
      let resolveApprove: (value: void | PromiseLike<void>) => void;
      mockOnApprove.mockReturnValue(new Promise((resolve) => {
        resolveApprove = resolve;
      }));

      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText('Approving...')).toBeDefined();
      });

      resolveApprove!();
    });

    it('handles approval error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnApprove.mockRejectedValue(new Error('Approval failed'));

      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to approve prayer:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Deny Action', () => {
    it('renders deny button', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Deny')).toBeDefined();
    });

    it('shows deny form when deny button clicked', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      expect(screen.getByText('Reason for denial (required):')).toBeDefined();
      expect(screen.getByPlaceholderText('Explain why this prayer request cannot be approved...')).toBeDefined();
    });

    it('hides deny form when deny button clicked again', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      
      fireEvent.click(denyButton);
      expect(screen.getByText('Reason for denial (required):')).toBeDefined();
      
      fireEvent.click(denyButton);
      expect(screen.queryByText('Reason for denial (required):')).toBeNull();
    });

    it('can input deny reason', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this prayer request cannot be approved...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Inappropriate content' } });

      expect(textarea.value).toBe('Inappropriate content');
    });

    it('calls onDeny with reason when form submitted', async () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this prayer request cannot be approved...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Not appropriate' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnDeny).toHaveBeenCalledWith('prayer-1', 'Not appropriate');
      });
    });

    it('does not submit empty deny reason', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const confirmButton = screen.getByText('Confirm Denial') as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(true);
    });

    it('can cancel deny form', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this prayer request cannot be approved...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Some reason' } });

      const cancelButton = screen.getAllByText('Cancel')[0];
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Reason for denial (required):')).toBeNull();
    });

    it('clears deny reason when form is cancelled', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this prayer request cannot be approved...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Some reason' } });

      const cancelButton = screen.getAllByText('Cancel')[0];
      fireEvent.click(cancelButton);

      fireEvent.click(denyButton);
      const newTextarea = screen.getByPlaceholderText('Explain why this prayer request cannot be approved...') as HTMLTextAreaElement;
      expect(newTextarea.value).toBe('');
    });

    it('shows loading state during denial', async () => {
      let resolveDeny: (value: void | PromiseLike<void>) => void;
      mockOnDeny.mockReturnValue(new Promise((resolve) => {
        resolveDeny = resolve;
      }));

      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this prayer request cannot be approved...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test reason' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Denying...')).toBeDefined();
      });

      resolveDeny!();
    });

    it('handles denial error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnDeny.mockRejectedValue(new Error('Denial failed'));

      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this prayer request cannot be approved...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test reason' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to deny prayer:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edit Action', () => {
    it('renders edit button', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Edit')).toBeDefined();
    });

    it('shows edit form when edit button clicked', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(screen.getByText('Prayer Request Details *')).toBeDefined();
      expect(screen.getByText('Requester *')).toBeDefined();
      expect(screen.getByText('Prayer For *')).toBeDefined();
      expect(screen.getByText('Email Address')).toBeDefined();
    });

    it('populates edit form with existing prayer data', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const descriptionField = screen.getByDisplayValue('Please pray for healing and strength') as HTMLTextAreaElement;
      const requesterField = screen.getByDisplayValue('Jane Doe') as HTMLInputElement;
      const prayerForField = screen.getByDisplayValue('John') as HTMLInputElement;
      const emailField = screen.getByDisplayValue('jane@test.com') as HTMLInputElement;

      expect(descriptionField).toBeDefined();
      expect(requesterField).toBeDefined();
      expect(prayerForField).toBeDefined();
      expect(emailField).toBeDefined();
    });

    it('can edit prayer description', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const descriptionField = screen.getByDisplayValue('Please pray for healing and strength') as HTMLTextAreaElement;
      fireEvent.change(descriptionField, { target: { value: 'Updated prayer request' } });

      expect(descriptionField.value).toBe('Updated prayer request');
    });

    it('can edit requester name', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const requesterField = screen.getByDisplayValue('Jane Doe') as HTMLInputElement;
      fireEvent.change(requesterField, { target: { value: 'John Smith' } });

      expect(requesterField.value).toBe('John Smith');
    });

    it('can edit prayer_for field', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const prayerForField = screen.getByDisplayValue('John') as HTMLInputElement;
      fireEvent.change(prayerForField, { target: { value: 'Sarah' } });

      expect(prayerForField.value).toBe('Sarah');
    });

    it('calls onEdit with updated data when form submitted', async () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const descriptionField = screen.getByDisplayValue('Please pray for healing and strength') as HTMLTextAreaElement;
      fireEvent.change(descriptionField, { target: { value: 'Updated description' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith('prayer-1', {
          title: 'Prayer for John',
          description: 'Updated description',
          requester: 'Jane Doe',
          prayer_for: 'John',
          email: 'jane@test.com'
        });
      });
    });

    it('updates title when prayer_for changes', async () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const prayerForField = screen.getByDisplayValue('John') as HTMLInputElement;
      fireEvent.change(prayerForField, { target: { value: 'Sarah' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith('prayer-1', expect.objectContaining({
          title: 'Prayer for Sarah',
          prayer_for: 'Sarah'
        }));
      });
    });

    it('converts empty email to null', async () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const emailField = screen.getByDisplayValue('jane@test.com') as HTMLInputElement;
      fireEvent.change(emailField, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith('prayer-1', expect.objectContaining({
          email: null
        }));
      });
    });

    it('can cancel editing', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const descriptionField = screen.getByDisplayValue('Please pray for healing and strength') as HTMLTextAreaElement;
      fireEvent.change(descriptionField, { target: { value: 'Changed but cancelled' } });

      const cancelButton = screen.getAllByText('Cancel')[0];
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Prayer Request Details *')).toBeNull();
      expect(screen.getByText('Please pray for healing and strength')).toBeDefined();
    });

    it('resets form data when edit is cancelled', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const descriptionField = screen.getByDisplayValue('Please pray for healing and strength') as HTMLTextAreaElement;
      fireEvent.change(descriptionField, { target: { value: 'Changed' } });

      const cancelButton = screen.getAllByText('Cancel')[0];
      fireEvent.click(cancelButton);

      fireEvent.click(screen.getByText('Edit'));
      
      const resetDescriptionField = screen.getByDisplayValue('Please pray for healing and strength') as HTMLTextAreaElement;
      expect(resetDescriptionField).toBeDefined();
    });

    it('shows loading state during edit save', async () => {
      let resolveEdit: (value: void | PromiseLike<void>) => void;
      mockOnEdit.mockReturnValue(new Promise((resolve) => {
        resolveEdit = resolve;
      }));

      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeDefined();
      });

      resolveEdit!();
    });

    it('handles edit error gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockOnEdit.mockRejectedValue(new Error('Edit failed'));

      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to edit prayer:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('does not submit edit with empty required fields', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const descriptionField = screen.getByDisplayValue('Please pray for healing and strength') as HTMLTextAreaElement;
      fireEvent.change(descriptionField, { target: { value: '' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('hides action buttons while editing', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      expect(screen.getByText('Approve')).toBeDefined();
      expect(screen.getByText('Deny')).toBeDefined();

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(screen.queryByText('Approve')).toBeNull();
      expect(screen.queryByText('Deny')).toBeNull();
    });
  });

  describe('Icons', () => {
    it('renders User icon', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const userIcon = document.querySelector('.lucide-user');
      expect(userIcon).toBeDefined();
    });

    it('renders Calendar icon', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const calendarIcon = document.querySelector('.lucide-calendar');
      expect(calendarIcon).toBeDefined();
    });

    it('renders CheckCircle icon on approve button', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const checkIcon = document.querySelector('.lucide-check-circle');
      expect(checkIcon).toBeDefined();
    });

    it('renders XCircle icon on deny button', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const xIcon = document.querySelector('.lucide-x-circle');
      expect(xIcon).toBeDefined();
    });

    it('renders Edit2 icon on edit button', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const editIcon = document.querySelector('.lucide-edit-2');
      expect(editIcon).toBeDefined();
    });

    it('renders MessageCircle icon when email is present', () => {
      render(
        <PendingPrayerCard
          prayer={mockPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
          onEdit={mockOnEdit}
        />
      );

      const messageIcon = document.querySelector('.lucide-message-circle');
      expect(messageIcon).toBeDefined();
    });
  });
});
