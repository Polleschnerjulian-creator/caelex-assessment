"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import {
  formatShortcut,
  type ShortcutCategory,
} from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ShortcutCategory[];
}

export default function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  categories,
}: KeyboardShortcutsHelpProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-2xl max-h-[80vh] mx-4 bg-[#0F1629] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5">
                  <Keyboard className="w-5 h-5 text-white/70" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-sm text-white/50">
                    Quick navigation and actions
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((category) => (
                  <div key={category.name}>
                    <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
                      {category.name}
                    </h3>
                    <div className="space-y-2">
                      {category.shortcuts.map((shortcut, index) => (
                        <div
                          key={`${shortcut.key}-${index}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                          <span className="text-sm text-white/70">
                            {shortcut.description}
                          </span>
                          <KeyCombo shortcut={shortcut} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer tip */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 text-center">
                  Press <KeyBadge>Shift</KeyBadge> + <KeyBadge>?</KeyBadge> to
                  open this dialog anytime
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Key combination display
function KeyCombo({
  shortcut,
}: {
  shortcut: { key: string; modifiers?: string[] };
}) {
  const formatted = formatShortcut(shortcut as any);
  const parts = formatted.split(" + ");

  return (
    <div className="flex items-center gap-1">
      {parts.map((part, index) => (
        <span key={index} className="flex items-center gap-1">
          {index > 0 && <span className="text-white/20">+</span>}
          <KeyBadge>{part}</KeyBadge>
        </span>
      ))}
    </div>
  );
}

// Single key badge
function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-white/70 bg-white/10 border border-white/20 rounded shadow-sm">
      {children}
    </span>
  );
}

// Compact trigger button for the header
export function KeyboardShortcutsTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/50 hover:text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
      title="Keyboard Shortcuts (Shift + ?)"
    >
      <Keyboard className="w-4 h-4" />
      <span className="hidden sm:inline">Shortcuts</span>
      <span className="hidden sm:flex items-center gap-1">
        <KeyBadge>⇧</KeyBadge>
        <KeyBadge>?</KeyBadge>
      </span>
    </button>
  );
}
