"use client";

/**
 * usePanelWidth — resizable panel width with localStorage persistence.
 *
 * Drag-handle on the panel's left edge calls `startDrag(e)` from a
 * mouseDown event. Uses document-level listeners so the drag continues
 * smoothly outside the handle. Final width persists to localStorage on
 * mouseup — not during drag, to avoid thrashing storage.
 *
 * Brief: "Width: 420px default, drag handle on left edge expands to
 *  360–640px, width persists per user in localStorage."
 */

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "caelex.transparency.panel.width";
const MIN_WIDTH = 360;
const MAX_WIDTH = 640;
const DEFAULT_WIDTH = 420;

function clamp(n: number) {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, n));
}

export function usePanelWidth() {
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef<number>(DEFAULT_WIDTH);

  // Load from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const n = parseInt(raw, 10);
      if (Number.isFinite(n)) setWidth(clamp(n));
    } catch {
      /* no-op — private mode, quota, etc. */
    }
  }, []);

  // Document-level drag listeners (attach on drag start, detach on end).
  useEffect(() => {
    if (dragStartX.current === null) return;

    const onMove = (e: MouseEvent) => {
      if (dragStartX.current === null) return;
      // Panel is docked RIGHT — dragging the left edge LEFT widens it.
      const delta = dragStartX.current - e.clientX;
      setWidth(clamp(dragStartWidth.current + delta));
    };
    const onUp = () => {
      if (dragStartX.current === null) return;
      dragStartX.current = null;
      try {
        localStorage.setItem(STORAGE_KEY, String(width));
      } catch {
        /* ignore */
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [width]);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStartX.current = e.clientX;
      dragStartWidth.current = width;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  const reset = useCallback(() => {
    setWidth(DEFAULT_WIDTH);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    width,
    startDrag,
    reset,
    min: MIN_WIDTH,
    max: MAX_WIDTH,
    default: DEFAULT_WIDTH,
  };
}
