import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PrayerStatus } from '../types/prayer';
import type { PrayerRequest } from '../types/prayer';
import { getUserInfo, saveUserInfo } from '../utils/userInfoStorage';
import { useVerification } from '../hooks/useVerification';
import { VerificationDialog } from './VerificationDialog';

interface PrayerFormProps {
  onSubmit: (prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates'>) => Promise<void>;
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Email verification
  const { isEnabled, requestCode, verifyCode } = useVerification();
  const [verificationState, setVerificationState] = useState<{
    isOpen: boolean;
    codeId: string | null;
    expiresAt: string | null;
    email: string;
  }>({
    isOpen: false,
    codeId: null,
    expiresAt: null,
    email: ''
  });

  // Load saved user info when component mounts
  useEffect(() => {
    const userInfo = getUserInfo();
    if (userInfo.firstName || userInfo.lastName || userInfo.email) {
      setFirstName(userInfo.firstName);
      setLastName(userInfo.lastName);
      setFormData(prev => ({
        ...prev,
        email: userInfo.email
      }));
    }
  }, []);

  // Auto-close form 5 seconds after successful submission
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        onCancel();
        setIsSubmitted(false);
        setShowSuccessMessage(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isSubmitted, onCancel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !firstName.trim() || !lastName.trim() || !formData.prayer_for.trim() || !formData.email.trim()) return;

    try {
      setIsSubmitting(true);
      
      // Concatenate first and last name
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      
      // Save user info to localStorage for future use
      saveUserInfo(firstName, lastName, formData.email);

      // Prepare the prayer data
      const prayerData = {
        ...formData,
        requester: fullName,
        title: `Prayer for ${formData.prayer_for}`,
        status: PrayerStatus.CURRENT
      };

      // Check if email verification is required
      if (isEnabled) {
        // Request verification code
        const { codeId, expiresAt } = await requestCode(
          formData.email,
          'prayer_submission',
          prayerData
        );
        
        // Show verification dialog
        setVerificationState({
          isOpen: true,
          codeId,
          expiresAt,
          email: formData.email
        });
      } else {
        // No verification required, submit directly
        await submitPrayer(prayerData);
      }
      
    } catch (error) {
      console.error('Failed to initiate prayer submission:', error);
      setIsSubmitting(false);
    }
  };

  const submitPrayer = async (prayerData: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates'>) => {
    try {
      await onSubmit(prayerData);

      // Show success message and mark as submitted
      setShowSuccessMessage(true);
      setIsSubmitted(true);
      
      // Clear form but keep name and email for next time
      setFormData(prev => ({
        title: '',
        description: '',
        requester: prayerData.requester,
        prayer_for: '',
        email: prev.email,
        is_anonymous: false
      }));
      // Keep firstName and lastName filled
      
    } catch (error) {
      console.error('Failed to add prayer:', error);
      throw error; // Re-throw so verification dialog knows submission failed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerified = async (actionData: any) => {
    try {
      await submitPrayer(actionData);
      
      // Close verification dialog
      setVerificationState({
        isOpen: false,
        codeId: null,
        expiresAt: null,
        email: ''
      });
    } catch (error) {
      console.error('Failed to submit verified prayer:', error);
      // Don't close verification dialog on error
      throw error;
    }
  };

  const handleVerificationCancel = () => {
    setVerificationState({
      isOpen: false,
      codeId: null,
      expiresAt: null,
      email: ''
    });
    setIsSubmitting(false);
  };

  const handleResendCode = async () => {
    try {
      if (!formData.email) return;

      // Concatenate first and last name
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Prepare the prayer data
      const prayerData = {
        ...formData,
        requester: fullName,
        title: `Prayer for ${formData.prayer_for}`,
        status: PrayerStatus.CURRENT
      };

      // Request new verification code
      const { codeId, expiresAt } = await requestCode(
        formData.email,
        'prayer_submission',
        prayerData
      );
      
      // Update verification state with new code
      setVerificationState(prev => ({
        ...prev,
        codeId,
        expiresAt
      }));
    } catch (error) {
      console.error('Failed to resend verification code:', error);
      throw error;
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
                  <p className="text-sm text-green-600 dark:text-green-300">Your request is pending admin approval and will appear in the list once reviewed.</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Your email address"
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

      {/* Email Verification Dialog */}
      {verificationState.isOpen && verificationState.codeId && verificationState.expiresAt && (
        <VerificationDialog
          isOpen={verificationState.isOpen}
          codeId={verificationState.codeId}
          expiresAt={verificationState.expiresAt}
          email={verificationState.email}
          onVerified={handleVerified}
          onClose={handleVerificationCancel}
          onResend={handleResendCode}
        />
      )}
    </div>
  );
};