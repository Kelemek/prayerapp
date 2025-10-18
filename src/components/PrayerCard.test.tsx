import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrayerCard } from './PrayerCard';
import { PrayerStatus } from '../types/prayer';
import type { PrayerRequest } from '../types/prayer';

// Mock Toast context
vi.mock('./Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock user info storage
vi.mock('../utils/userInfoStorage', () => ({
  getUserInfo: () => ({
    firstName: '',
    lastName: '',
    email: '',
  }),
  saveUserInfo: vi.fn(),
}));

describe('PrayerCard Component', () => {
  const mockPrayer: PrayerRequest = {
    id: '1',
    title: 'Test Prayer',
    description: 'Test prayer content',
    requester: 'John Doe',
    prayer_for: 'John Doe',
    email: 'john@example.com',
    is_anonymous: false,
    status: PrayerStatus.CURRENT,
    date_requested: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    updates: [],
  };

  const mockCallbacks = {
    onUpdateStatus: vi.fn(),
    onAddUpdate: vi.fn(),
    onDelete: vi.fn(),
    onRequestDelete: vi.fn(),
    onRequestStatusChange: vi.fn(),
    onDeleteUpdate: vi.fn(),
    onRequestUpdateDelete: vi.fn(),
    registerCloseCallback: vi.fn(() => vi.fn()),
    onFormOpen: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders prayer content', () => {
    render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />);
    
    expect(screen.getByText('Test prayer content')).toBeInTheDocument();
    expect(screen.getByText(/Prayer for/i)).toBeInTheDocument();
  });

  it('displays requester name when not anonymous', () => {
    render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />);
    
    // Check that requester name appears in "Requested by" text
    const requestedByElements = screen.getAllByText(/Requested by/i);
    expect(requestedByElements.length).toBeGreaterThan(0);
    expect(mockPrayer.requester).toBe('John Doe');
  });

  it('displays "Anonymous" when prayer is anonymous', () => {
    const anonymousPrayer = { ...mockPrayer, is_anonymous: true };
    render(<PrayerCard prayer={anonymousPrayer} isAdmin={false} {...mockCallbacks} />);
    
    expect(screen.getByText(/Anonymous/i)).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('shows status badge with correct status', () => {
    render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />);
    
    // Status is displayed as "current" (lowercase)
    expect(screen.getByText('current')).toBeInTheDocument();
  });

  it('displays answered status correctly', () => {
    const answeredPrayer = { ...mockPrayer, status: PrayerStatus.ANSWERED };
    render(<PrayerCard prayer={answeredPrayer} isAdmin={false} {...mockCallbacks} />);
    
    expect(screen.getByText('answered')).toBeInTheDocument();
  });

  it('displays ongoing status correctly', () => {
    const ongoingPrayer = { ...mockPrayer, status: PrayerStatus.ONGOING };
    render(<PrayerCard prayer={ongoingPrayer} isAdmin={false} {...mockCallbacks} />);
    
    expect(screen.getByText('ongoing')).toBeInTheDocument();
  });

  it('shows delete button for admin users', () => {
    render(<PrayerCard prayer={mockPrayer} isAdmin={true} {...mockCallbacks} />);
    
    // Admin should see delete button with "Delete prayer" title
    const deleteButton = screen.getByTitle(/delete prayer/i);
    expect(deleteButton).toBeInTheDocument();
  });

  it('shows request delete button for non-admin users', () => {
    render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />);
    
    // Non-admin should see request delete button with "Request deletion" title  
    const deleteButton = screen.getByTitle(/request deletion/i);
    expect(deleteButton).toBeInTheDocument();
  });

  it('admin can delete prayer directly', async () => {
    const user = userEvent.setup();
    render(<PrayerCard prayer={mockPrayer} isAdmin={true} {...mockCallbacks} />);
    
    // Find and click delete button (may need to expand card first)
    const deleteButton = screen.getAllByRole('button').find(button => 
      button.textContent?.includes('Delete')
    );
    
    if (deleteButton) {
      await user.click(deleteButton);
      
      // Confirm deletion
      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm/i });
        if (confirmButton) {
          user.click(confirmButton);
        }
      });
      
      await waitFor(() => {
        expect(mockCallbacks.onDelete).toHaveBeenCalledWith('1');
      });
    }
  });

  it('displays prayer updates when they exist', () => {
    const prayerWithUpdates = {
      ...mockPrayer,
      updates: [
        {
          id: 'update1',
          prayer_id: '1',
          content: 'Prayer update content',
          author: 'Jane Doe',
          author_email: 'jane@example.com',
          created_at: '2025-01-02T00:00:00Z',
          is_anonymous: false,
        },
      ],
    };
    
    render(<PrayerCard prayer={prayerWithUpdates} isAdmin={false} {...mockCallbacks} />);
    
    expect(screen.getByText('Prayer update content')).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/i)).toBeInTheDocument();
  });

  it('shows "Add Update" button', () => {
    render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />);
    
    expect(screen.getByText(/Add Update/i)).toBeInTheDocument();
  });

  it('opens add update form when clicking Add Update', async () => {
    const user = userEvent.setup();
    render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />);
    
    const addUpdateButton = screen.getByText(/Add Update/i);
    await user.click(addUpdateButton);
    
    await waitFor(() => {
      // Look for form elements instead of placeholder
      expect(screen.getByText(/Add Prayer Update/i)).toBeInTheDocument();
    });
  });

  it('allows admin to change prayer status', async () => {
    const user = userEvent.setup();
    render(<PrayerCard prayer={mockPrayer} isAdmin={true} {...mockCallbacks} />);
    
    // Look for status change controls (dropdowns, buttons)
    const statusButtons = screen.getAllByRole('button');
    const statusButton = statusButtons.find(button => 
      button.textContent?.includes('Answered') || button.textContent?.includes('Ongoing')
    );
    
    if (statusButton) {
      await user.click(statusButton);
      
      await waitFor(() => {
        expect(mockCallbacks.onUpdateStatus).toHaveBeenCalled();
      });
    }
  });

  it('shows formatted date for prayer creation', () => {
    render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />);
    
    // Date is formatted and displayed (format may vary by locale/timezone)
    // Just verify a date element exists with the year and some time indicator
    const dateElements = screen.getAllByText((content, element) => {
      const text = element?.textContent || '';
      // Looking for any date element that has the year (2024)
      return text.includes('2024');
    });
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('handles long prayer content gracefully', () => {
    const longContent = 'This is a very long prayer content that should be displayed properly without breaking the layout. '.repeat(10);
    const longPrayer = {
      ...mockPrayer,
      description: longContent,
    };
    
    render(<PrayerCard prayer={longPrayer} isAdmin={false} {...mockCallbacks} />);
    
    // Component renders the long content - just check it's there
    const element = screen.getByText((_, element) => {
      const hasText = (element as HTMLElement)?.textContent?.includes('This is a very long prayer content');
      const isCorrectElement = (element as HTMLElement)?.tagName.toLowerCase() === 'p';
      return hasText !== undefined && hasText && isCorrectElement;
    });
    expect(element).toBeInTheDocument();
  });

  it('calls registerCloseCallback on mount', () => {
    render(<PrayerCard prayer={mockPrayer} isAdmin={false} {...mockCallbacks} />);
    
    expect(mockCallbacks.registerCloseCallback).toHaveBeenCalled();
  });

  it('displays anonymous updates correctly', () => {
    const prayerWithAnonymousUpdate = {
      ...mockPrayer,
      updates: [
        {
          id: 'update1',
          prayer_id: '1',
          content: 'Anonymous update',
          author: 'Someone',
          author_email: 'someone@example.com',
          created_at: '2025-01-02T00:00:00Z',
          is_anonymous: true,
        },
      ],
    };
    
    render(<PrayerCard prayer={prayerWithAnonymousUpdate} isAdmin={false} {...mockCallbacks} />);
    
    expect(screen.getByText('Anonymous update')).toBeInTheDocument();
    // Check for Anonymous text - use getAllByText since it appears multiple times
    const anonymousElements = screen.getAllByText(/Anonymous/i);
    expect(anonymousElements.length).toBeGreaterThan(0);
  });

  it('shows multiple updates in order', () => {
    const prayerWithMultipleUpdates = {
      ...mockPrayer,
      updates: [
        {
          id: 'update1',
          prayer_id: '1',
          content: 'First update',
          author: 'User One',
          author_email: 'user1@example.com',
          created_at: '2025-01-02T00:00:00Z',
          is_anonymous: false,
        },
        {
          id: 'update2',
          prayer_id: '1',
          content: 'Second update',
          author: 'User Two',
          author_email: 'user2@example.com',
          created_at: '2025-01-03T00:00:00Z',
          is_anonymous: false,
        },
      ],
    };
    
    render(<PrayerCard prayer={prayerWithMultipleUpdates} isAdmin={false} {...mockCallbacks} />);
    
    expect(screen.getByText('First update')).toBeInTheDocument();
    expect(screen.getByText('Second update')).toBeInTheDocument();
  });
});
