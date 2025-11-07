import React from 'react';

interface SkeletonLoaderProps {
  count?: number;
  type?: 'card' | 'list' | 'header';
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  count = 3, 
  type = 'card' 
}) => {
  if (type === 'card') {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <div 
            key={index} 
            className="prayer-card bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
            style={{ minHeight: '200px' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="skeleton h-6 w-3/4 mb-2"></div>
                <div className="skeleton h-4 w-1/2"></div>
              </div>
              <div className="skeleton h-8 w-24 rounded-full"></div>
            </div>
            
            {/* Content */}
            <div className="space-y-2 mb-4">
              <div className="skeleton h-4 w-full"></div>
              <div className="skeleton h-4 w-5/6"></div>
              <div className="skeleton h-4 w-4/6"></div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="skeleton h-4 w-32"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="skeleton h-16 w-full"></div>
        ))}
      </div>
    );
  }

  if (type === 'header') {
    return (
      <div className="mb-6">
        <div className="skeleton h-8 w-64 mb-2"></div>
        <div className="skeleton h-4 w-96"></div>
      </div>
    );
  }

  return null;
};
