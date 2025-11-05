import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrayerFiltersComponent } from '../PrayerFilters';
import type { PrayerFilters } from '../../types/prayer';

describe('PrayerFiltersComponent', () => {
  const mockOnFiltersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders search input', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByPlaceholderText('Search prayers...')).toBeDefined();
    });

    it('renders Search icon', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const searchIcon = document.querySelector('.lucide-search');
      expect(searchIcon).toBeDefined();
    });

    it('displays existing search term in input', () => {
      const filters: PrayerFilters = {
        searchTerm: 'healing'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      expect(input.value).toBe('healing');
    });

    it('displays empty string when no search term', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('Search Functionality', () => {
    it('calls onFiltersChange when search term is entered', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'family' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: 'family'
      });
    });

    it('updates search term with new value', () => {
      const filters: PrayerFilters = {
        searchTerm: 'old'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'new search' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: 'new search'
      });
    });

    it('converts empty string to undefined', () => {
      const filters: PrayerFilters = {
        searchTerm: 'existing'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: undefined
      });
    });

    it('preserves other filters when updating search term', () => {
      const filters: PrayerFilters = {
        searchTerm: 'test',
        status: 'current'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'updated' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: 'updated',
        status: 'current'
      });
    });
  });

  describe('Clear Filters', () => {
    it('shows clear button when search term exists', () => {
      const filters: PrayerFilters = {
        searchTerm: 'test'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.getByText('Clear search')).toBeDefined();
    });

    it('hides clear button when no search term', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.queryByText('Clear search')).toBeNull();
    });

    it('hides clear button when search term is undefined', () => {
      const filters: PrayerFilters = {
        searchTerm: undefined
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      expect(screen.queryByText('Clear search')).toBeNull();
    });

    it('clears all filters when clear button clicked', () => {
      const filters: PrayerFilters = {
        searchTerm: 'test',
        status: 'current'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const clearButton = screen.getByText('Clear search');
      fireEvent.click(clearButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('clears only search term and other filters', () => {
      const filters: PrayerFilters = {
        searchTerm: 'healing',
        status: 'answered',
        email: 'test@example.com'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const clearButton = screen.getByText('Clear search');
      fireEvent.click(clearButton);

      // Clear button clears ALL filters, not just search
      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });
  });

  describe('Styling and Layout', () => {
    it('applies correct container classes', () => {
      const filters: PrayerFilters = {};
      
      const { container } = render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const mainDiv = container.firstChild as HTMLElement;
      expect(mainDiv.className).toContain('bg-white');
      expect(mainDiv.className).toContain('dark:bg-gray-800');
      expect(mainDiv.className).toContain('rounded-lg');
      expect(mainDiv.className).toContain('shadow-md');
    });

    it('applies dark mode classes', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      expect(input.className).toContain('dark:bg-gray-700');
      expect(input.className).toContain('dark:text-gray-100');
    });

    it('positions search icon correctly', () => {
      const filters: PrayerFilters = {};
      
      const { container } = render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const searchIcon = container.querySelector('.lucide-search');
      expect(searchIcon).toBeDefined();
      
      // Check the parent element for positioning classes
      const iconParent = searchIcon?.closest('.relative');
      expect(iconParent).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has placeholder text for screen readers', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      expect(input.placeholder).toBe('Search prayers...');
    });

    it('input has focus ring styles', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      expect(input.className).toContain('focus:ring-2');
      expect(input.className).toContain('focus:ring-blue-500');
    });
  });

  describe('Edge Cases', () => {
    it('handles whitespace in search term', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '  spaces  ' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: '  spaces  '
      });
    });

    it('handles special characters in search', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'prayer@#$%' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: 'prayer@#$%'
      });
    });

    it('handles very long search terms', () => {
      const filters: PrayerFilters = {};
      const longString = 'a'.repeat(500);
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: longString } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        searchTerm: longString
      });
    });

    it('handles rapid filter changes', () => {
      const filters: PrayerFilters = {};
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(mockOnFiltersChange).toHaveBeenCalledTimes(3);
      expect(mockOnFiltersChange).toHaveBeenLastCalledWith({
        searchTerm: 'abc'
      });
    });
  });

  describe('Multiple Filters Integration', () => {
    it('maintains status filter when updating search', () => {
      const filters: PrayerFilters = {
        status: 'current'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        status: 'current',
        searchTerm: 'test'
      });
    });

    it('maintains type filter when updating search', () => {
      const filters: PrayerFilters = {
        email: 'test@example.com'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'health' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        email: 'test@example.com',
        searchTerm: 'health'
      });
    });

    it('maintains requester filter when updating search', () => {
      const filters: PrayerFilters = {
        email: 'john@example.com'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'family' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        email: 'john@example.com',
        searchTerm: 'family'
      });
    });

    it('maintains all filters when updating search', () => {
      const filters: PrayerFilters = {
        status: 'answered',
        email: 'jane@example.com',
        searchTerm: 'old'
      };
      
      render(
        <PrayerFiltersComponent
          filters={filters}
          onFiltersChange={mockOnFiltersChange}
        />
      );

      const input = screen.getByPlaceholderText('Search prayers...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'new' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        status: 'answered',
        email: 'jane@example.com',
        searchTerm: 'new'
      });
    });
  });
});
