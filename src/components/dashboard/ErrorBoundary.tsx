"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Dashboard ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === "development";

      return (
        <div
          className="flex items-center justify-center min-h-[400px] p-8"
          role="alert"
        >
          <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-xl p-8 max-w-md w-full text-center">
            <div className="flex items-center justify-center mb-5">
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl">
                <AlertTriangle
                  size={28}
                  className="text-red-500 dark:text-red-400"
                  aria-hidden="true"
                />
              </div>
            </div>

            <h2 className="text-[18px] font-medium text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-[14px] text-slate-500 dark:text-white/50 mb-6 leading-relaxed">
              An unexpected error occurred while rendering this section. Please
              try again or contact support if the issue persists.
            </p>

            {isDev && this.state.error && (
              <div className="mb-6 text-left bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-lg p-4 overflow-auto max-h-[200px]">
                <p className="font-mono text-[11px] text-red-600 dark:text-red-400 mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="font-mono text-[10px] text-slate-500 dark:text-white/30 whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/[0.15] text-white dark:text-white/90 font-mono text-[12px] px-5 py-2.5 rounded-lg transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
