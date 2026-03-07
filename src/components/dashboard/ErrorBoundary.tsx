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
          <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-8 max-w-md w-full text-center">
            <div className="flex items-center justify-center mb-5">
              <div className="p-3 bg-[var(--accent-danger-soft)]/10 rounded-xl">
                <AlertTriangle
                  size={28}
                  className="text-[var(--accent-danger)]"
                  aria-hidden="true"
                />
              </div>
            </div>

            <h2 className="text-heading font-medium text-[var(--text-primary)] mb-2">
              Something went wrong
            </h2>
            <p className="text-body-lg text-[var(--text-secondary)] mb-6 leading-relaxed">
              An unexpected error occurred while rendering this section. Please
              try again or contact support if the issue persists.
            </p>

            {isDev && this.state.error && (
              <div className="mb-6 text-left bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-lg p-4 overflow-auto max-h-[200px]">
                <p className="font-mono text-caption text-[var(--accent-danger)] mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="font-mono text-micro text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 bg-[var(--text-primary)] hover:bg-[var(--text-primary)]:bg-[var(--surface-sunken)] text-white text-small px-5 py-2.5 rounded-lg transition-all"
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
