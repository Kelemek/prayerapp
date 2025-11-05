import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PendingPreferenceChangeCard } from '../PendingPreferenceChangeCard';
import * as planningCenterModule from '../../lib/planningcenter';

// Mock the planningcenter module
vi.mock('../../lib/planningcenter', () => ({
  lookupPersonByEmail: vi.fn(),
  formatPersonName: vi.fn((person) => `${person.attributes.first_name} ${person.attributes.last_name}`),
}));

describe('PendingPreferenceChangeCard', () => {
  const mockChange = {
    id: 'change-123',
    name: 'John Doe',
    email: 'john@example.com',
    receive_new_prayer_notifications: true,
    created_at: '2024-01-15T10:30:00Z',
  };

  const mockOnApprove = vi.fn();
  const mockOnDeny = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(planningCenterModule.lookupPersonByEmail).mockResolvedValue({ people: [], count: 0 });
  });

  describe('Rendering', () => {
    it('renders the component with header', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText('Preference Change Request')).toBeDefined();
    });

    it('displays user name', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText('John Doe')).toBeDefined();
    });

    it('displays user email', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText('john@example.com')).toBeDefined();
    });

    it('displays formatted submission date', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText(/Submitted.*Jan.*15.*2024/i)).toBeDefined();
    });

    it('shows opt-in preference correctly', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText('Wants to receive new prayer notifications')).toBeDefined();
    });

    it('shows opt-out preference correctly', () => {
      const optOutChange = { ...mockChange, receive_new_prayer_notifications: false };
      
      render(
        <PendingPreferenceChangeCard
          change={optOutChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText('Wants to opt out of new prayer notifications')).toBeDefined();
    });

    it('renders approve and deny buttons', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByRole('button', { name: /approve/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /deny/i })).toBeDefined();
    });

    it('does not show deny form initially', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.queryByText('Reason for denial (required):')).toBeNull();
    });
  });

  describe('Planning Center Integration', () => {
    it('calls lookupPersonByEmail on mount', async () => {
      const mockLookup = vi.mocked(planningCenterModule.lookupPersonByEmail);
      mockLookup.mockResolvedValue({ people: [], count: 0 });
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      await waitFor(() => {
        expect(mockLookup).toHaveBeenCalledWith('john@example.com');
      });
    });

    it('shows loading state while checking Planning Center', () => {
      const mockLookup = vi.mocked(planningCenterModule.lookupPersonByEmail);
      mockLookup.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText('Checking Planning Center...')).toBeDefined();
    });

    it('displays Planning Center person when found', async () => {
      const mockLookup = vi.mocked(planningCenterModule.lookupPersonByEmail);
      mockLookup.mockResolvedValue({
        people: [{
          id: 'pc-123',
          type: 'Person',
          attributes: {
            first_name: 'John',
            last_name: 'Doe',
            name: 'John Doe',
            avatar: 'https://example.com/avatar.jpg',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        }],
        count: 1,
      });
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/Planning Center: John Doe/i)).toBeDefined();
      });
    });

    it('displays "Not in Planning Center" when person not found', async () => {
      const mockLookup = vi.mocked(planningCenterModule.lookupPersonByEmail);
      mockLookup.mockResolvedValue({ people: [], count: 0 });
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Not in Planning Center')).toBeDefined();
      });
    });

    it('displays error when Planning Center lookup fails', async () => {
      const mockLookup = vi.mocked(planningCenterModule.lookupPersonByEmail);
      mockLookup.mockRejectedValue(new Error('API Error'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Error checking PC')).toBeDefined();
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('does not lookup if email is missing', async () => {
      const mockLookup = vi.mocked(planningCenterModule.lookupPersonByEmail);
      const changeWithoutEmail = { ...mockChange, email: '' };
      
      render(
        <PendingPreferenceChangeCard
          change={changeWithoutEmail}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      await waitFor(() => {
        expect(mockLookup).not.toHaveBeenCalled();
      });
    });
  });

  describe('Approve Functionality', () => {
    it('calls onApprove when approve button is clicked', async () => {
      mockOnApprove.mockResolvedValue(undefined);
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);
      
      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith('change-123');
      });
    });

    it('shows "Approving..." text while processing', async () => {
      let resolveApprove: () => void;
      mockOnApprove.mockImplementation(() => new Promise(resolve => {
        resolveApprove = () => resolve(undefined);
      }));
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Approving...')).toBeDefined();
      });
      
      resolveApprove!();
      
      await waitFor(() => {
        expect(screen.queryByText('Approving...')).toBeNull();
      });
    });

    it('disables approve button while processing', async () => {
      let resolveApprove: () => void;
      mockOnApprove.mockImplementation(() => new Promise(resolve => {
        resolveApprove = () => resolve(undefined);
      }));
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /approving/i });
        expect(button).toHaveProperty('disabled', true);
      });
      
      resolveApprove!();
      
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /approve/i });
        expect(button).toHaveProperty('disabled', false);
      });
    });

    it('disables deny button while processing approval', async () => {
      let resolveApprove: () => void;
      mockOnApprove.mockImplementation(() => new Promise(resolve => {
        resolveApprove = () => resolve(undefined);
      }));
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);
      
      await waitFor(() => {
        const denyButton = screen.getByRole('button', { name: /deny/i });
        expect(denyButton).toHaveProperty('disabled', true);
      });
      
      resolveApprove!();
    });
  });

  describe('Deny Form', () => {
    it('shows deny form when deny button is clicked', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      expect(screen.getByText('Reason for denial (required):')).toBeDefined();
    });

    it('hides deny form when deny button is clicked again', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      expect(screen.getByText('Reason for denial (required):')).toBeDefined();
      
      fireEvent.click(denyButton);
      expect(screen.queryByText('Reason for denial (required):')).toBeNull();
    });

    it('renders textarea for denial reason', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const textarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i);
      expect(textarea).toBeDefined();
    });

    it('updates denial reason when typing', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const textarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Invalid request' } });
      
      expect(textarea.value).toBe('Invalid request');
    });

    it('renders confirm denial and cancel buttons', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      expect(screen.getByRole('button', { name: /confirm denial/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDefined();
    });

    it('closes form and clears reason when cancel is clicked', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const textarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Invalid request' } });
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('Reason for denial (required):')).toBeNull();
      
      // Open again and check textarea is empty
      fireEvent.click(denyButton);
      const newTextarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i) as HTMLTextAreaElement;
      expect(newTextarea.value).toBe('');
    });
  });

  describe('Deny Functionality', () => {
    it('shows alert when trying to deny without reason', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const form = screen.getByText('Reason for denial (required):').closest('form')!;
      fireEvent.submit(form);
      
      expect(alertSpy).toHaveBeenCalledWith('Please provide a reason for denial');
      expect(mockOnDeny).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('shows alert when trying to deny with whitespace-only reason', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const textarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i);
      fireEvent.change(textarea, { target: { value: '   ' } });
      
      const form = screen.getByText('Reason for denial (required):').closest('form')!;
      fireEvent.submit(form);
      
      expect(alertSpy).toHaveBeenCalled();
      expect(mockOnDeny).not.toHaveBeenCalled();
      
      alertSpy.mockRestore();
    });

    it('calls onDeny with id and reason when form is submitted', async () => {
      mockOnDeny.mockResolvedValue(undefined);
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const textarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i);
      fireEvent.change(textarea, { target: { value: 'Duplicate request' } });
      
      const confirmButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnDeny).toHaveBeenCalledWith('change-123', 'Duplicate request');
      });
    });

    it('shows "Denying..." text while processing', async () => {
      let resolveDeny: () => void;
      mockOnDeny.mockImplementation(() => new Promise(resolve => {
        resolveDeny = () => resolve(undefined);
      }));
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const textarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i);
      fireEvent.change(textarea, { target: { value: 'Invalid' } });
      
      const confirmButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Denying...')).toBeDefined();
      });
      
      resolveDeny!();
      
      await waitFor(() => {
        expect(screen.queryByText('Denying...')).toBeNull();
      });
    });

    it('closes form and clears reason after successful denial', async () => {
      mockOnDeny.mockResolvedValue(undefined);
      
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const textarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i);
      fireEvent.change(textarea, { target: { value: 'Invalid' } });
      
      const confirmButton = screen.getByRole('button', { name: /confirm denial/i });
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockOnDeny).toHaveBeenCalled();
      });
      
      await waitFor(() => {
        expect(screen.queryByText('Reason for denial (required):')).toBeNull();
      });
    });

    it('disables confirm button when reason is empty', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const confirmButton = screen.getByRole('button', { name: /confirm denial/i });
      expect(confirmButton).toHaveProperty('disabled', true);
    });

    it('enables confirm button when reason is provided', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const textarea = screen.getByPlaceholderText(/Explain why this preference change request is being denied/i);
      fireEvent.change(textarea, { target: { value: 'Invalid' } });
      
      const confirmButton = screen.getByRole('button', { name: /confirm denial/i });
      expect(confirmButton).toHaveProperty('disabled', false);
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes to card', () => {
      const { container } = render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const card = container.firstChild;
      expect(card).toHaveProperty('className');
      expect((card as HTMLElement).className).toContain('dark:bg-gray-800');
      expect((card as HTMLElement).className).toContain('dark:border-gray-700');
    });

    it('applies dark mode classes to deny form', () => {
      render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      const denyButton = screen.getByRole('button', { name: /^deny$/i });
      fireEvent.click(denyButton);
      
      const form = screen.getByText('Reason for denial (required):').closest('form');
      expect(form?.className).toContain('dark:bg-red-900/20');
      expect(form?.className).toContain('dark:border-red-800');
    });
  });

  describe('Icons', () => {
    it('displays user icon', () => {
      const { container } = render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      // Check for multiple SVG elements (icons)
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(2); // User, Mail, Clock, CheckCircle, etc.
    });

    it('displays checkmark icon for opt-in preference', () => {
      const { container } = render(
        <PendingPreferenceChangeCard
          change={mockChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText('Wants to receive new prayer notifications')).toBeDefined();
      // CheckCircle icon should be present
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('displays X icon for opt-out preference', () => {
      const optOutChange = { ...mockChange, receive_new_prayer_notifications: false };
      const { container } = render(
        <PendingPreferenceChangeCard
          change={optOutChange}
          onApprove={mockOnApprove}
          onDeny={mockOnDeny}
        />
      );
      
      expect(screen.getByText('Wants to opt out of new prayer notifications')).toBeDefined();
      // XCircle icon should be present
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
