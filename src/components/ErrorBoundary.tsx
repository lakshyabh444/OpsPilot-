import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed.error) {
        readable = `${parsed.error}${
          parsed.path ? ` (Operation: ${parsed.operationType} on ${parsed.path})` : ''
        }`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error) {
    console.error('OpsPilot ErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E2E8F0] rounded-2xl p-6 elevation-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[18px] font-semibold text-[#0F172A]">
                  Something went wrong
                </h1>
                <p className="text-[13px] text-[#475569] mt-1 leading-5">
                  OpsPilot encountered a data or permission error while syncing with the backend.
                </p>
                <div className="mt-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3 text-[12px] font-mono text-[#991B1B] break-words">
                  {this.state.message}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="h-9 px-4 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[13px] font-medium inline-flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reload Workspace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
