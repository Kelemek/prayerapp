import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PrayerStatus } from '../types/prayer';
import type { PrayerRequest } from '../types/prayer';

interface PrayerFormProps {
  onSubmit: (prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates'>) => Promise<any>;
  onCancel: () => void;
  isOpen: boolean;
}

export const PrayerForm: React.FC<PrayerFormProps> = ({ onSubmit, onCancel, isOpen }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requester: '',
    prayer_for: '',
    email: '',
    is_anonymous: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto-close form 6 seconds after successful submission
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        onCancel();
        setIsSubmitted(false);
        setShowSuccessMessage(false);
      }, 6000);
      
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.requester.trim() || !formData.prayer_for.trim()) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        ...formData,
        title: `Prayer for ${formData.prayer_for}`,
        status: PrayerStatus.ACTIVE
      });

      // Show success message and mark as submitted
      setShowSuccessMessage(true);
      setIsSubmitted(true);
      setFormData({
        title: '',
        description: '',
        requester: '',
        prayer_for: '',
        email: '',
        is_anonymous: false
      });
      
    } catch (error) {
      console.error('Failed to add prayer:', error);
      // Don't close form on error so user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full max-h-90vh overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">New Prayer Request</h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {showSuccessMessage && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div>
                  <p className="font-medium">Prayer request submitted successfully!</p>
                  <p className="text-sm text-green-600 dark:text-green-300">Your request is pending admin approval and will appear in the list once reviewed. You can submit another prayer request below.</p>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Requested By *
            </label>
            <input
              type="text"
              value={formData.requester}
              onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Name of person requesting prayer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prayer For *
            </label>
            <input
              type="text"
              value={formData.prayer_for}
              onChange={(e) => setFormData({ ...formData, prayer_for: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Who or what this prayer is for"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Optional email for updates"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="anonymous"
              checked={formData.is_anonymous}
              onChange={(e) => setFormData({ ...formData, is_anonymous: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-900 dark:border-white bg-white dark:bg-gray-800 rounded"
            />
            <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Make this prayer anonymous (your name will not be shown publicly)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prayer Request Details *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-24"
              placeholder="Describe the prayer request in detail"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting || isSubmitted}
              className="flex-1 bg-blue-600 dark:bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : (isSubmitted ? 'Submitted' : 'Submit Prayer Request')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitted}
              className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitted ? 'Closing...' : 'Done'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};