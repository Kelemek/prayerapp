import { Component } from 'react';
import type { ReactNode } from 'react';
import { logError } from '../lib/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    logError({
      message: 'React Error Boundary caught error',
      error,
      context: {
        tags: { type: 'error_boundary' },
        metadata: { componentStack: errorInfo.componentStack }
      }
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <p className="text-lg font-semibold">Something went wrong</p>
              <p className="text-sm mt-2">{this.state.error?.message || 'An unexpected error occurred'}</p>
            </div>
            <button
              onClick={this.handleReset}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              If this persists, try refreshing the page
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
