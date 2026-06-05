"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Generic right-edge slide-over for editing a program section (E3b).
 *
 * Visual contract:
 *  - Full-height panel anchored to the right (max-width 520px)
 *  - Semi-transparent backdrop, click-to-close
 *  - ESC closes
 *  - Trade-themed light surface (NOT the dark email canvas — this is in-app)
 *
 * The drawer doesn't own form state — it just provides chrome. The
 * caller renders the form as children, including its own submit + cancel
 * buttons. This keeps drawer logic generic across all 7 sections.
 */
interface EditSectionDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function EditSectionDrawer({
  open,
  onClose,
  title,
  description,
  children,
}: EditSectionDrawerProps) {
  // Close on ESC + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  if (typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-section-title"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
      />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-[520px] flex-col bg-trade-bg-panel text-trade-text-primary shadow-2xl ring-1 ring-trade-border">
        <header className="flex items-start justify-between gap-4 border-b border-trade-border-subtle px-6 py-5">
          <div>
            <h2
              id="edit-section-title"
              className="text-[16px] font-semibold tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[12.5px] leading-relaxed text-trade-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-trade-text-muted transition-colors hover:bg-trade-hover hover:text-trade-text-primary"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
