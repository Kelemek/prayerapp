import React from 'react';
import { Search, Filter } from 'lucide-react';
import type { PrayerFilters } from '../types/prayer';

interface PrayerFiltersProps {
  filters: PrayerFilters;
  onFiltersChange: (filters: PrayerFilters) => void;
}

export const PrayerFiltersComponent: React.FC<PrayerFiltersProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  const updateFilter = (key: keyof PrayerFilters, value: string | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-6 transition-colors">
      
      <div className="grid grid-cols-1 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search prayers..."
              value={filters.searchTerm || ''}
              onChange={(e) => updateFilter('searchTerm', e.target.value || undefined)}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Clear Filters */}
      {filters.searchTerm && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={() => onFiltersChange({})}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
};