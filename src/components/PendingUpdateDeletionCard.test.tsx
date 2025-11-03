import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PendingUpdateDeletionCard } from './PendingUpdateDeletionCard';

// Mock the Planning Center lookup
vi.mock('../lib/planningcenter', () => ({
  lookupPersonByEmail: vi.fn().mockResolvedValue({ people: [], count: 0 }),
  formatPersonName: vi.fn((person) => `${person.attributes.first_name} ${person.attributes.last_name}`),
}));

vi.mock('./DeletionStyleCard', () => ({
  DeletionStyleCard: ({ title, subtitle, content, metaLeft, metaRight, reason, actions }: {
    title: string;
    subtitle: string;
    content: React.ReactNode;
    metaLeft: React.ReactNode;
    metaRight: React.ReactNode;
    reason: string | null | undefined;
    actions: React.ReactNode;
  }) => (
    <div data-testid="deletion-style-card">
      <h3>{title}</h3>
      <div>{subtitle}</div>
      <div data-testid="content">{content}</div>
      <div data-testid="meta-left">{metaLeft}</div>
      <div data-testid="meta-right">{metaRight}</div>
      {reason && <div data-testid="reason">{reason}</div>}
      <div data-testid="actions">{actions}</div>
    </div>
  )
}));

describe('PendingUpdateDeletionCard', () => {
  const mockUpdateDeletionRequest = {
    id: 'update-deletion-1',
    update_id: 'update-1',
    reason: 'Update contains incorrect information',
    requested_by: 'John Doe',
    requested_email: 'john@example.com',
    approval_status: 'pending' as const,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    prayer_updates: {
      id: 'update-1',
      prayer_id: 'prayer-1',
      content: 'This is the update content that needs to be deleted',
      author: 'Jane Smith',
      author_email: 'jane@example.com',
      created_at: '2024-01-10T09:00:00Z',
      prayers: {
        title: 'Prayer for Healing',
        prayer_for: 'Sarah Johnson'
      }
    }
  };

  const mockOnApprove = vi.fn();
  const mockOnDeny = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders update deletion request card', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Update Deletion Request')).toBeDefined();
      expect(screen.getByText('Update for:')).toBeDefined();
    });

    it('displays prayer title', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Prayer for Healing')).toBeDefined();
    });

    it('displays "Unknown Prayer" when prayer data is missing', () => {
      const requestWithoutPrayer = {
        ...mockUpdateDeletionRequest,
        prayer_updates: {
          ...mockUpdateDeletionRequest.prayer_updates,
          prayers: undefined
        }
      };
      
      render(
        <PendingUpdateDeletionCard
          deletionRequest={requestWithoutPrayer}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Unknown Prayer')).toBeDefined();
    });

    it('displays update content', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('This is the update content that needs to be deleted')).toBeDefined();
    });

    it('displays update author and email', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/By: Jane Smith — jane@example.com/)).toBeDefined();
    });

    it('displays requester name', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Requested by: John Doe/)).toBeDefined();
    });

    it('displays requester email', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Email: john@example.com/)).toBeDefined();
    });

    it('displays deletion reason', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const reasonElement = screen.getByTestId('reason');
      expect(reasonElement.textContent).toBe('Update contains incorrect information');
    });

    it('displays formatted creation date', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const metaRight = screen.getByTestId('meta-right');
      // Check that date appears (format may vary by locale)
      expect(metaRight.textContent).toContain('2024');
    });

    it('handles missing requester email gracefully', () => {
      const requestWithoutEmail = {
        ...mockUpdateDeletionRequest,
        requested_email: null
      };
      
      render(
        <PendingUpdateDeletionCard
          deletionRequest={requestWithoutEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText(/Requested by: John Doe/)).toBeDefined();
      expect(screen.queryByText(/Email:/)).toBeNull();
    });

    it('handles missing update author email gracefully', () => {
      const requestWithoutAuthorEmail = {
        ...mockUpdateDeletionRequest,
        prayer_updates: {
          ...mockUpdateDeletionRequest.prayer_updates,
          author_email: undefined
        }
      };
      
      render(
        <PendingUpdateDeletionCard
          deletionRequest={requestWithoutAuthorEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('By: Jane Smith')).toBeDefined();
      expect(screen.queryByText(/jane@example.com/)).toBeNull();
    });
  });

  describe('Approve Action', () => {
    it('renders approve button', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Approve & Delete')).toBeDefined();
    });

    it('calls onApprove with request ID when approve button clicked', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const approveButton = screen.getByText('Approve & Delete');
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalledWith('update-deletion-1');
      expect(mockOnApprove).toHaveBeenCalledTimes(1);
    });

    it('renders CheckCircle icon on approve button', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
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
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Deny')).toBeDefined();
    });

    it('renders XCircle icon on deny button', () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const xIcon = document.querySelector('.lucide-x-circle');
      expect(xIcon).toBeDefined();
    });

    it('shows denial form when deny button clicked', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);

      await waitFor(() => {
        expect(screen.getByText('Reason for denial (required):')).toBeDefined();
        expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined();
      });
    });

    it('hides denial form when deny button clicked again', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      
      // Show form
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByText('Reason for denial (required):')).toBeDefined());
      
      // Hide form
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.queryByText('Reason for denial (required):')).toBeNull());
    });

    it('can input denial reason', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined());

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'This update is still relevant' } });

      await waitFor(() => expect(textarea.value).toBe('This update is still relevant'));
    });

    it('calls onDeny with request ID and reason when form submitted', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined());

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Update information is accurate' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnDeny).toHaveBeenCalledWith('update-deletion-1', 'Update information is accurate');
        expect(mockOnDeny).toHaveBeenCalledTimes(1);
      });
    });

    it('trims whitespace from denial reason', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined());

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '  Trimmed reason  ' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      await waitFor(() => expect(mockOnDeny).toHaveBeenCalledWith('update-deletion-1', 'Trimmed reason'));
    });

    it('does not submit empty denial reason', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined());

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      await waitFor(() => expect(mockOnDeny).not.toHaveBeenCalled());
    });

    it('does not submit whitespace-only denial reason', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined());

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '   ' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      await waitFor(() => expect(mockOnDeny).not.toHaveBeenCalled());
    });

    it('clears denial form after successful submission', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined());

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Denial reason' } });

      const confirmButton = screen.getByText('Confirm Denial');
      fireEvent.click(confirmButton);

      // Form should be hidden after submission
      await waitFor(() => expect(screen.queryByText('Reason for denial (required):')).toBeNull());
    });

    it('hides denial form when cancel button clicked', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
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

      await waitFor(() => {
        expect(screen.queryByText('Reason for denial (required):')).toBeNull();
        expect(mockOnDeny).not.toHaveBeenCalled();
      });
    });

    it('clears textarea when cancel button clicked', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      
      // First time: enter text and cancel
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined());
      const textarea1 = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea1, { target: { value: 'Some reason' } });
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Second time: textarea should be empty
      fireEvent.click(denyButton);
      await waitFor(() => {
        const textarea2 = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
        expect(textarea2.value).toBe('');
      });
    });

    it('disables confirm button when denial reason is empty', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByText('Confirm Denial')).toBeDefined());

      const confirmButton = screen.getByText('Confirm Denial') as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(true);
    });

    it('enables confirm button when denial reason is provided', async () => {
      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      const denyButton = screen.getByText('Deny');
      fireEvent.click(denyButton);
      await waitFor(() => expect(screen.getByPlaceholderText('Explain why this deletion request is being denied...')).toBeDefined());

      const textarea = screen.getByPlaceholderText('Explain why this deletion request is being denied...') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Valid reason' } });

      await waitFor(() => {
        const confirmButton = screen.getByText('Confirm Denial') as HTMLButtonElement;
        expect(confirmButton.disabled).toBe(false);
      });
    });
  });

  describe('Planning Center Integration', () => {
    it('shows "Checking Planning Center..." while loading', async () => {
      const { lookupPersonByEmail } = await import('../lib/planningcenter');
      vi.mocked(lookupPersonByEmail).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ people: [], count: 0 }), 1000))
      );

      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      expect(screen.getByText('Checking Planning Center...')).toBeDefined();
    });

    it('shows Planning Center person when found', async () => {
      const { lookupPersonByEmail, formatPersonName } = await import('../lib/planningcenter');
      const mockPerson = {
        id: '123',
        type: 'Person',
        attributes: {
          first_name: 'John',
          last_name: 'Doe',
          name: 'John Doe',
          avatar: '',
          status: 'active',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      };
      
      vi.mocked(lookupPersonByEmail).mockResolvedValue({ people: [mockPerson], count: 1 });
      vi.mocked(formatPersonName).mockReturnValue('John Doe');

      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Planning Center: John Doe/)).toBeDefined();
      });
    });

    it('shows "Not in Planning Center" when person not found', async () => {
      const { lookupPersonByEmail } = await import('../lib/planningcenter');
      vi.mocked(lookupPersonByEmail).mockResolvedValue({ people: [], count: 0 });

      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Not in Planning Center')).toBeDefined();
      });
    });

    it('shows error message when PC lookup fails', async () => {
      const { lookupPersonByEmail } = await import('../lib/planningcenter');
      vi.mocked(lookupPersonByEmail).mockRejectedValue(new Error('API Error'));

      render(
        <PendingUpdateDeletionCard
          deletionRequest={mockUpdateDeletionRequest}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('(PC lookup failed)')).toBeDefined();
      });
    });

    it('does not attempt PC lookup when email is missing', async () => {
      const { lookupPersonByEmail } = await import('../lib/planningcenter');
      const requestWithoutEmail = {
        ...mockUpdateDeletionRequest,
        requested_email: null,
        prayer_updates: {
          ...mockUpdateDeletionRequest.prayer_updates,
          author_email: undefined
        }
      };

      render(
        <PendingUpdateDeletionCard
          deletionRequest={requestWithoutEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );

      await waitFor(() => {
        expect(lookupPersonByEmail).not.toHaveBeenCalled();
      });
    });
  });
});
