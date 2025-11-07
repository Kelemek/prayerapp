import React from 'react';
import { Lightbulb, Tag } from 'lucide-react';
import type { PrayerPrompt } from '../types/prayer';

interface PromptCardProps {
  prompt: PrayerPrompt;
  isAdmin: boolean;
  onDelete?: (id: string) => Promise<void>;
  onTypeClick?: (type: string) => void;
  isTypeSelected?: boolean;
}

export const PromptCard: React.FC<PromptCardProps> = ({ 
  prompt, 
  isAdmin,
  onDelete,
  onTypeClick,
  isTypeSelected = false
}) => {
  const handleDelete = async () => {
    if (!isAdmin || !onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this prayer prompt?')) {
      try {
        await onDelete(prompt.id);
      } catch (error) {
        console.error('Error deleting prompt:', error);
      }
    }
  };

  return (
    <div className="prompt-card bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <Lightbulb className="text-yellow-500 dark:text-yellow-400" size={24} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {prompt.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {/* Type Badge */}
          <button
            onClick={() => onTypeClick?.(prompt.type)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              isTypeSelected
                ? 'bg-yellow-500 text-white shadow-md hover:bg-yellow-600'
                : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800'
            }`}
            title={isTypeSelected ? `Remove ${prompt.type} filter` : `Filter by ${prompt.type}`}
          >
            <Tag size={14} />
            {prompt.type}
          </button>
          {isAdmin && onDelete && (
            <button
              onClick={handleDelete}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              title="Delete prompt"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
        {prompt.description}
      </p>
    </div>
  );
};
