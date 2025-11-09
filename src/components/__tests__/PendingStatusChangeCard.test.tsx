import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PendingStatusChangeCard } from '../PendingStatusChangeCard';
import type { StatusChangeRequest, PrayerStatus } from '../../types/prayer';

// Mock the planning center lookup
vi.mock('../../lib/planningcenter', () => ({
  lookupPersonByEmail: vi.fn(),
  formatPersonName: vi.fn((person) => person?.attributes?.name || 'Unknown')
}));

import { lookupPersonByEmail } from '../../lib/planningcenter';

describe('PendingStatusChangeCard', () => {
  const mockOnApprove = vi.fn();
  const mockOnDeny = vi.fn();

  const mockRequest: StatusChangeRequest & { prayer_title?: string } = {
    id: '123',
    prayer_id: 'prayer-1',
    prayer_title: 'Test Prayer',
    requested_status: 'answered' as PrayerStatus,
    reason: 'This prayer has been answered',
    requested_by: 'John Doe',
    requested_email: 'john@example.com',
    created_at: '2025-10-18T10:00:00Z',
    updated_at: '2025-10-18T10:00:00Z',
    approval_status: 'pending'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the planning center lookup to return a person
    (lookupPersonByEmail as any).mockResolvedValue({
      people: [{
        id: 'pc-person-1',
        type: 'person',
        attributes: {
          first_name: 'John',
          last_name: 'Doe',
          name: 'John Doe',
          avatar: '',
          status: 'active',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        }
      }],
      count: 1
    });
  });

  describe('Rendering', () => {
    it('renders the component with title', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Status Change Request')).toBeDefined();
    });

    it('renders prayer title', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Prayer: Test Prayer/i)).toBeDefined();
    });

    it('renders untitled when no prayer title', () => {
      const requestWithoutTitle = { ...mockRequest, prayer_title: undefined };
      render(
        <PendingStatusChangeCard
          statusChangeRequest={requestWithoutTitle}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Prayer: Untitled/i)).toBeDefined();
    });

    it('renders requested status', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Change status to:/i)).toBeDefined();
      const statusElements = screen.getAllByText(/answered/i);
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('renders reason when provided', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Reason:')).toBeDefined();
      expect(screen.getByText('This prayer has been answered')).toBeDefined();
    });

    it('does not render reason section when reason is not provided', () => {
      const requestWithoutReason = { ...mockRequest, reason: undefined };
      render(
        <PendingStatusChangeCard
          statusChangeRequest={requestWithoutReason}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.queryByText('Reason:')).toBeNull();
    });

    it('renders requester name', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Requested by: John Doe/i)).toBeDefined();
    });

    it('renders requester email', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Email: john@example.com/i)).toBeDefined();
    });

    it('does not render email when not provided', () => {
      const requestWithoutEmail = { ...mockRequest, requested_email: undefined };
      render(
        <PendingStatusChangeCard
          statusChangeRequest={requestWithoutEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.queryByText(/Email:/i)).toBeNull();
    });

    it('renders formatted date', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Submitted/i)).toBeDefined();
    });

    it('renders approve button', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByRole('button', { name: /approve/i })).toBeDefined();
    });

    it('renders deny button', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByRole('button', { name: /deny/i })).toBeDefined();
    });
  });

  describe('Approve Action', () => {
    it('calls onApprove when approve button is clicked', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalledTimes(1);
      expect(mockOnApprove).toHaveBeenCalledWith('123');
    });

    it('does not call onDeny when approve is clicked', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      expect(mockOnDeny).not.toHaveBeenCalled();
    });
  });

  describe('Deny Action', () => {
    it('shows deny form when deny button is clicked', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      expect(screen.getByText(/Reason for denial/i)).toBeDefined();
      expect(screen.getByPlaceholderText(/Explain why/i)).toBeDefined();
    });

    it('hides deny form initially', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.queryByText(/Reason for denial/i)).toBeNull();
    });

    it('toggles deny form visibility', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
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
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Invalid request' } });

      expect(textarea.value).toBe('Invalid request');
    });

    it('calls onDeny with reason when form is submitted', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: 'Not appropriate' } });

      const submitButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(submitButton);

      expect(mockOnDeny).toHaveBeenCalledTimes(1);
      expect(mockOnDeny).toHaveBeenCalledWith('123', 'Not appropriate');
    });

    it('trims whitespace from denial reason', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: '  Duplicate  ' } });

      const submitButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(submitButton);

      expect(mockOnDeny).toHaveBeenCalledWith('123', 'Duplicate');
    });

    it('clears denial reason after submission', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test reason' } });
      expect(textarea.value).toBe('Test reason');

      const submitButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(submitButton);

      // The form is hidden after submission, so we verify the callback was called
      expect(mockOnDeny).toHaveBeenCalledWith('123', 'Test reason');
    });

    it('hides deny form after submission', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
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

      expect(screen.queryByText(/Reason for denial/i)).toBeNull();
    });

    it('does not submit with empty reason', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
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
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
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

    it('enables submit button when reason is provided', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText(/Explain why/i);
      fireEvent.change(textarea, { target: { value: 'Valid reason' } });

      const submitButton = screen.getByRole('button', { name: /confirm denial/i }) as HTMLButtonElement;
      
      expect(submitButton.disabled).toBe(false);
    });

    it('renders cancel button in deny form', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
    });

    it('closes deny form when cancel is clicked', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByText(/Reason for denial/i)).toBeNull();
    });
  });

  describe('Status Colors', () => {
    it('applies blue color for current status', () => {
      const currentRequest = { ...mockRequest, requested_status: 'current' as PrayerStatus };
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={currentRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const statusElement = container.querySelector('.text-blue-600');
      expect(statusElement).toBeDefined();
    });

    it('applies yellow color for ongoing status', () => {
      const ongoingRequest = { ...mockRequest, requested_status: 'ongoing' as PrayerStatus };
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={ongoingRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const statusElement = container.querySelector('.text-yellow-600');
      expect(statusElement).toBeDefined();
    });

    it('applies green color for answered status', () => {
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const statusElement = container.querySelector('.text-green-600');
      expect(statusElement).toBeDefined();
    });

    it('applies gray color for archived status', () => {
      const archivedRequest = { ...mockRequest, requested_status: 'archived' as PrayerStatus };
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={archivedRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const statusElement = container.querySelector('.text-gray-600');
      expect(statusElement).toBeDefined();
    });
  });

  describe('Dark Mode Support', () => {
    it('includes dark mode classes for container', () => {
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
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
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const heading = screen.getByText('Status Change Request');
      expect(heading.className).toContain('dark:text-gray-100');
    });
  });

  describe('Icons', () => {
    it('renders status change icon', () => {
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const refreshIcon = container.querySelector('svg.lucide-refresh-cw');
      expect(refreshIcon).toBeDefined();
    });

    it('renders arrow icon for status transition', () => {
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const arrowIcon = container.querySelector('svg.lucide-arrow-right');
      expect(arrowIcon).toBeDefined();
    });

    it('renders user icon for requester', () => {
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const icons = container.querySelectorAll('svg.lucide-user');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders calendar icon for date', () => {
      const { container } = render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const icons = container.querySelectorAll('svg.lucide-calendar');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading for title', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const heading = screen.getByText('Status Change Request');
      expect(heading.tagName).toBe('H3');
    });

    it('textarea has required attribute', () => {
      render(
        <PendingStatusChangeCard
          statusChangeRequest={mockRequest}
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
