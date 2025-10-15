import React, { useState } from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import { downloadPrintablePrayerList } from '../utils/printablePrayerList';

type TimeRange = 'week' | 'month' | 'year';

export const PrintPrayerList: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('week');

  const handlePrint = async (range: TimeRange) => {
    setIsPrinting(true);
    setIsOpen(false);
    setSelectedRange(range);
    
    // Open window immediately (Safari requires this to be synchronous with user click)
    const newWindow = window.open('', '_blank');
    
    try {
      await downloadPrintablePrayerList(range, newWindow);
    } catch (error) {
      console.error('Error printing prayer list:', error);
      if (newWindow) newWindow.close();
    } finally {
      setIsPrinting(false);
    }
  };

  const getRangeLabel = (range: TimeRange): string => {
    switch (range) {
      case 'week':
        return 'Last Week';
      case 'month':
        return 'Last Month';
      case 'year':
        return 'Last Year';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPrinting}
        className="flex items-center gap-1 sm:gap-2 bg-green-600 dark:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
        title="Print prayer list"
      >
        <Printer size={16} className={`sm:w-5 sm:h-5 ${isPrinting ? 'animate-spin' : ''}`} />
        <span className="hidden lg:inline">{isPrinting ? 'Generating...' : 'Print List'}</span>
        <span className="lg:hidden">{isPrinting ? '...' : 'Print'}</span>
        {!isPrinting && <ChevronDown size={14} className="sm:w-4 sm:h-4" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
            <button
              onClick={() => handlePrint('week')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span>Last Week</span>
                {selectedRange === 'week' && (
                  <span className="text-green-600 dark:text-green-400">✓</span>
                )}
              </div>
            </button>
            <button
              onClick={() => handlePrint('month')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span>Last Month</span>
                {selectedRange === 'month' && (
                  <span className="text-green-600 dark:text-green-400">✓</span>
                )}
              </div>
            </button>
            <button
              onClick={() => handlePrint('year')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span>Last Year</span>
                {selectedRange === 'year' && (
                  <span className="text-green-600 dark:text-green-400">✓</span>
                )}
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
