"use client";

import React from "react";
import { Rocket, AlertTriangle, RotateCcw } from "lucide-react";

// ─── Types ───

interface AcademyErrorBoundaryProps {
  children: React.ReactNode;
}

interface AcademyErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Component ───

export default class AcademyErrorBoundary extends React.Component<
  AcademyErrorBoundaryProps,
  AcademyErrorBoundaryState
> {
  constructor(props: AcademyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AcademyErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[AcademyErrorBoundary]", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = process.env.NODE_ENV === "development";

    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div
          className="
            bg-[var(--fill-medium)] backdrop-blur-xl border border-[var(--border-default)] rounded-xl
            p-8 max-w-md w-full text-center
            shadow-[var(--shadow-lg)]
          "
        >
          {/* Icons */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div className="w-14 h-14 bg-[var(--fill-light)] border border-[var(--border-default)] rounded-2xl flex items-center justify-center">
              <Rocket className="w-7 h-7 text-[var(--text-tertiary)]" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-heading font-semibold text-[var(--text-primary)] mb-2">
            Houston, we have a problem
          </h2>

          <p className="text-body-lg text-[var(--text-tertiary)] mb-6">
            Something went wrong in the Academy module. Our team has been
            notified and is working on a fix.
          </p>

          {/* Dev error stack */}
          {isDev && this.state.error && (
            <div className="mb-6 text-left">
              <p className="text-micro text-red-400/70 uppercase tracking-wide mb-2">
                Error Details (Development)
              </p>
              <div className="bg-black/30 border border-[var(--border-subtle)] rounded-lg p-3 overflow-auto max-h-40">
                <p className="text-small text-red-300 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-micro text-[var(--text-tertiary)] font-mono mt-2 whitespace-pre-wrap break-all">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={this.handleReset}
            className="
              inline-flex items-center gap-2
              bg-emerald-500 hover:bg-emerald-600 text-white
              rounded-lg px-6 py-2.5
              text-subtitle font-medium
              transition-all duration-200
            "
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }
}
