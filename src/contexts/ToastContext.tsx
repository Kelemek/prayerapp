import React from 'react';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ToastContext = React.createContext<ToastContextType | null>(null);
