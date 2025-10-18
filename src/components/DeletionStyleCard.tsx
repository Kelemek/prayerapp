import React from 'react';

interface DeletionStyleCardProps {
  title?: string;
  subtitle?: string;
  content?: React.ReactNode;
  metaLeft?: React.ReactNode; // e.g., requester + email
  metaRight?: React.ReactNode; // e.g., date
  reason?: string | null;
  actions?: React.ReactNode;
}

// Redesigned deletion card to match other admin cards (white/dark background, border, shadow)
export const DeletionStyleCard: React.FC<DeletionStyleCardProps> = ({
  title,
  content,
  metaLeft,
  metaRight,
  reason,
  actions
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>}

          {/* Content */}
          {content && (
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-300">{content}</p>
            </div>
          )}

          {/* Meta information */}
          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            {metaLeft}
            {metaRight}
          </div>

          {/* Reason block (neutral colors) */}
          {reason && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Reason for deletion:</div>
              <div className="text-sm bg-gray-50 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 p-3 rounded text-gray-700 dark:text-gray-200">{reason}</div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {actions && (
        <div className="flex flex-wrap gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};
