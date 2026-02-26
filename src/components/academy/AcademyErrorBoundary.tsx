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
            bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-xl
            p-8 max-w-md w-full text-center
            shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
          "
        >
          {/* Icons */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
              <Rocket className="w-7 h-7 text-white/30" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-heading font-semibold text-white mb-2">
            Houston, we have a problem
          </h2>

          <p className="text-body-lg text-white/45 mb-6">
            Something went wrong in the Academy module. Our team has been
            notified and is working on a fix.
          </p>

          {/* Dev error stack */}
          {isDev && this.state.error && (
            <div className="mb-6 text-left">
              <p className="text-micro text-red-400/70 uppercase tracking-wide mb-2">
                Error Details (Development)
              </p>
              <div className="bg-black/30 border border-white/5 rounded-lg p-3 overflow-auto max-h-40">
                <p className="text-small text-red-300 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-micro text-white/25 font-mono mt-2 whitespace-pre-wrap break-all">
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
