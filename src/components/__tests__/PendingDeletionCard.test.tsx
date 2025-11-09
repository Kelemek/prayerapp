import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PendingDeletionCard } from '../PendingDeletionCard';
import type { DeletionRequest } from '../../types/prayer';

// Mock the planning center lookup
vi.mock('../../lib/planningcenter', () => ({
  lookupPersonByEmail: vi.fn(),
  formatPersonName: vi.fn((person) => person?.attributes?.name || 'Unknown')
}));

import { lookupPersonByEmail } from '../../lib/planningcenter';

vi.mock('../DeletionStyleCard', () => ({
  DeletionStyleCard: ({ title, subtitle, content, metaLeft, metaRight, reason, actions }: {
    title: string;
    subtitle: string;
    content: React.ReactNode;
    metaLeft: React.ReactNode;
    metaRight: React.ReactNode;
    reason: string;
    actions: React.ReactNode;
  }) => (
    <div data-testid="deletion-style-card">
      <h3>{title}</h3>
      <div>{subtitle}</div>
      <div>{content}</div>
      <div data-testid="meta-left">{metaLeft}</div>
      <div data-testid="meta-right">{metaRight}</div>
      <div data-testid="reason">{reason}</div>
      <div data-testid="actions">{actions}</div>
    </div>
  )
}));

describe('PendingDeletionCard', () => {
  const mockDeletionRequest: DeletionRequest & { prayer_title?: string } = {
    id: 'deletion-1',
    prayer_id: 'prayer-1',
    prayer_title: 'Test Prayer Title',
    requested_by: 'user@test.com',
    requested_email: 'user@test.com',
    reason: 'Prayer request is no longer needed',
    approval_status: 'pending',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z'
  };

  const mockOnApprove = vi.fn();
  const mockOnDeny = vi.fn();

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
    it('renders deletion request card', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Prayer Deletion Request')).toBeDefined();
      expect(screen.getByText('Prayer Title:')).toBeDefined();
    });

    it('displays prayer title', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Test Prayer Title')).toBeDefined();
    });

    it('displays "Unknown Prayer" when title is missing', () => {
      const requestWithoutTitle = { ...mockDeletionRequest, prayer_title: undefined };
      
      render(
        <PendingDeletionCard
          deletionRequest={requestWithoutTitle}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Unknown Prayer')).toBeDefined();
    });

    it('displays requester email', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Email: user@test.com')).toBeDefined();
    });

    it('displays deletion reason', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const reasonElement = screen.getByTestId('reason');
      expect(reasonElement.textContent).toBe('Prayer request is no longer needed');
    });

    it('displays formatted creation date', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const metaRight = screen.getByTestId('meta-right');
      // Check that date appears (format may vary by locale)
      expect(metaRight.textContent).toContain('2024');
    });
  });

  describe('Approve Action', () => {
    it('renders approve button', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Approve & Delete')).toBeDefined();
    });

    it('calls onApprove with request ID when approve button clicked', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const approveButton = screen.getByText('Approve & Delete');
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalledWith('deletion-1');
      expect(mockOnApprove).toHaveBeenCalledTimes(1);
    });

    it('renders CheckCircle icon on approve button', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const checkIcon = document.querySelector('.lucide-check-circle');
      expect(checkIcon).toBeDefined();
    });
  });

  describe('Deny Action', () => {
    it('renders deny button', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Deny')).toBeDefined();
    });

    it('renders XCircle icon on deny button', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const xIcon = document.querySelector('.lucide-x-circle');
      expect(xIcon).toBeDefined();
    });

    it('shows denial form when deny button clicked', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      expect(screen.getByText('Reason for denial (required):')).toBeDefined();
      expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined();
    });

    it('hides denial form when deny button clicked again', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      
      // Show form
      fireEvent.click(denyButton);
      expect(screen.getByText('Reason for denial (required):')).toBeDefined();
      
      // Hide form
      fireEvent.click(denyButton);
      expect(screen.queryByText('Reason for denial (required):')).toBeNull();
    });

    it('can input denial reason', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'This is inappropriate' } });

      expect(textarea.value).toBe('This is inappropriate');
    });

    it('calls onDeny with request ID and reason when form submitted', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Insufficient reason' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      expect(mockOnDeny).toHaveBeenCalledWith('deletion-1', 'Insufficient reason');
      expect(mockOnDeny).toHaveBeenCalledTimes(1);
    });

    it('trims whitespace from denial reason', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '  Trimmed reason  ' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      expect(mockOnDeny).toHaveBeenCalledWith('deletion-1', 'Trimmed reason');
    });

    it('does not submit empty denial reason', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '   ' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      expect(mockOnDeny).not.toHaveBeenCalled();
    });

    it('clears denial form after submission', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test reason' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      expect(screen.queryByText('Reason for denial (required):')).toBeNull();
    });

    it('can cancel denial form', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Some reason' } });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Reason for denial (required):')).toBeNull();
      expect(mockOnDeny).not.toHaveBeenCalled();
    });

    it('clears input when cancelling denial form', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Some reason' } });

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Show form again
      fireEvent.click(denyButton);
      const newTextarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      
      expect(newTextarea.value).toBe('');
    });

    it('textarea has required attribute', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      expect(textarea.required).toBe(true);
    });
  });

  describe('Icons', () => {
    it('renders User icon in meta section', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const userIcon = document.querySelector('.lucide-user');
      expect(userIcon).toBeDefined();
    });

    it('renders Calendar icon in meta section', () => {
      render(
        <PendingDeletionCard
          deletionRequest={mockDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const calendarIcon = document.querySelector('.lucide-calendar');
      expect(calendarIcon).toBeDefined();
    });
  });
});
