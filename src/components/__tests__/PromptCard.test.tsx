import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptCard } from '../PromptCard';
import type { PrayerPrompt } from '../../types/prayer';
import { PrayerType } from '../../types/prayer';

describe('PromptCard', () => {
  const mockPrompt: PrayerPrompt = {
    id: 'prompt-1',
    title: 'Prayer for Healing',
    description: 'Pray for physical and emotional healing for those who are sick or suffering.',
    type: PrayerType.HEALING,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockOnDelete = vi.fn();
  const mockOnTypeClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders prompt title', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
        />
      );
      
      expect(screen.getByText('Prayer for Healing')).toBeDefined();
    });

    it('renders prompt description', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
        />
      );
      
      expect(screen.getByText('Pray for physical and emotional healing for those who are sick or suffering.')).toBeDefined();
    });

    it('renders lightbulb icon', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
        />
      );
      
      const lightbulbIcon = document.querySelector('.lucide-lightbulb');
      expect(lightbulbIcon).toBeDefined();
    });

    it('renders type badge with correct text', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
          onTypeClick={mockOnTypeClick}
        />
      );
      
      expect(screen.getByText('Healing')).toBeDefined();
    });

    it('renders tag icon in type badge', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
          onTypeClick={mockOnTypeClick}
        />
      );
      
      const tagIcon = document.querySelector('.lucide-tag');
      expect(tagIcon).toBeDefined();
    });
  });

  describe('Type Badge Interaction', () => {
    it('calls onTypeClick when type badge is clicked', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
          onTypeClick={mockOnTypeClick}
        />
      );
      
      const typeBadge = screen.getByText('Healing');
      fireEvent.click(typeBadge);
      
      expect(mockOnTypeClick).toHaveBeenCalledWith('Healing');
      expect(mockOnTypeClick).toHaveBeenCalledTimes(1);
    });

    it('displays default styling when type is not selected', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
          onTypeClick={mockOnTypeClick}
          isTypeSelected={false}
        />
      );
      
      const typeBadge = screen.getByText('Healing').closest('button');
      expect(typeBadge?.className).toContain('bg-indigo-100');
      expect(typeBadge?.className).not.toContain('bg-yellow-500');
    });

    it('displays selected styling when type is selected', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
          onTypeClick={mockOnTypeClick}
          isTypeSelected={true}
        />
      );
      
      const typeBadge = screen.getByText('Healing').closest('button');
      expect(typeBadge?.className).toContain('bg-yellow-500');
      expect(typeBadge?.className).not.toContain('bg-indigo-100');
    });

    it('shows filter title when type is not selected', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
          onTypeClick={mockOnTypeClick}
          isTypeSelected={false}
        />
      );
      
      const typeBadge = screen.getByText('Healing').closest('button');
      expect(typeBadge?.getAttribute('title')).toBe('Filter by Healing');
    });

    it('shows remove filter title when type is selected', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
          onTypeClick={mockOnTypeClick}
          isTypeSelected={true}
        />
      );
      
      const typeBadge = screen.getByText('Healing').closest('button');
      expect(typeBadge?.getAttribute('title')).toBe('Remove Healing filter');
    });

    it('does not crash when onTypeClick is not provided', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
        />
      );
      
      const typeBadge = screen.getByText('Healing');
      expect(() => fireEvent.click(typeBadge)).not.toThrow();
    });
  });

  describe('Admin Delete Functionality', () => {
    it('shows delete button when user is admin', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );
      
      const deleteButton = screen.getByTitle('Delete prompt');
      expect(deleteButton).toBeDefined();
    });

    it('does not show delete button when user is not admin', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
          onDelete={mockOnDelete}
        />
      );
      
      const deleteButton = screen.queryByTitle('Delete prompt');
      expect(deleteButton).toBeNull();
    });

    it('does not show delete button when onDelete is not provided', () => {
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={true}
        />
      );
      
      const deleteButton = screen.queryByTitle('Delete prompt');
      expect(deleteButton).toBeNull();
    });

    it('shows confirmation dialog when delete button is clicked', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );
      
      const deleteButton = screen.getByTitle('Delete prompt');
      fireEvent.click(deleteButton);
      
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this prayer prompt?');
      
      confirmSpy.mockRestore();
    });

    it('calls onDelete when deletion is confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockOnDelete.mockResolvedValue(undefined);
      
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );
      
      const deleteButton = screen.getByTitle('Delete prompt');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('prompt-1');
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
      });
      
      confirmSpy.mockRestore();
    });

    it('does not call onDelete when deletion is cancelled', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );
      
      const deleteButton = screen.getByTitle('Delete prompt');
      fireEvent.click(deleteButton);
      
      expect(mockOnDelete).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });

    it('handles delete errors gracefully', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Delete failed');
      mockOnDelete.mockRejectedValue(error);
      
      render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={true}
          onDelete={mockOnDelete}
        />
      );
      
      const deleteButton = screen.getByTitle('Delete prompt');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting prompt:', error);
      });
      
      confirmSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Styling and Layout', () => {
    it('applies correct container classes', () => {
      const { container } = render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
        />
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('bg-white');
      expect(card.className).toContain('rounded-lg');
      expect(card.className).toContain('shadow-md');
    });

    it('applies dark mode classes', () => {
      const { container } = render(
        <PromptCard 
          prompt={mockPrompt} 
          isAdmin={false}
        />
      );
      
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('dark:bg-gray-800');
    });

    it('preserves whitespace in description', () => {
      const multiLinePrompt: PrayerPrompt = {
        ...mockPrompt,
        description: 'Line 1\nLine 2\nLine 3'
      };
      
      const { container } = render(
        <PromptCard 
          prompt={multiLinePrompt} 
          isAdmin={false}
        />
      );
      
      const description = container.querySelector('.whitespace-pre-wrap');
      expect(description).toBeDefined();
      expect(description?.textContent).toContain('Line 1');
      expect(description?.textContent).toContain('Line 2');
      expect(description?.textContent).toContain('Line 3');
    });
  });

  describe('Different Prompt Types', () => {
    it('renders correctly with different type', () => {
      const familyPrompt: PrayerPrompt = {
        id: 'prompt-2',
        title: 'Prayer for Family',
        description: 'Pray for family unity and relationships.',
        type: PrayerType.FAMILY,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z'
      };
      
      render(
        <PromptCard 
          prompt={familyPrompt} 
          isAdmin={false}
          onTypeClick={mockOnTypeClick}
        />
      );
      
      expect(screen.getByText('Family')).toBeDefined();
      
      const typeBadge = screen.getByText('Family');
      fireEvent.click(typeBadge);
      
      expect(mockOnTypeClick).toHaveBeenCalledWith('Family');
    });
  });
});
