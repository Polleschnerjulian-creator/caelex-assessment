"use client";

/**
 * InDocTOC — in-document table of contents with scroll-spy.
 *
 * Client component (needs IntersectionObserver + click handling). Renders a
 * <nav> with a small eyebrow title and a vertical list of in-page anchor
 * links. The section currently in view is highlighted (scroll-spy) and
 * marked aria-current="location".
 *
 * STRICTLY MONOCHROME: black / white / gray-* only — zero other hues.
 * Type sizes come from the shared SCHOLAR_TYPE tokens (existing
 * tailwind.config.ts semantic scale) — never ad-hoc text-[Npx].
 *
 * Scroll-spy: a single IntersectionObserver watches every `#id` target.
 * The topmost intersecting section becomes active; if none intersect
 * (e.g. between sections) the last-seen active id is kept so the nav never
 * goes blank. The observer is torn down on unmount and rebuilt when the
 * item set changes.
 *
 * Motion: smooth scroll under motion-safe only; prefers-reduced-motion →
 * instant jump. Native hash anchoring is preserved (we do NOT preventDefault
 * the default-modified clicks, and we still update location.hash).
 *
 * WCAG 2.4.7: focus-visible ring on every link ✓
 * WCAG 2.5.8: py-1 + leading gives ≥24px target height ✓
 * WCAG 1.4.3: gray-900 (active) ≈ 15:1, gray-600 (idle) ≈ 5.7:1 on white ✓
 * WCAG 2.3.3 / 2.3.x: honors prefers-reduced-motion (motion-safe:) ✓
 */

import { useEffect, useRef, useState } from "react";

import { SCHOLAR_TYPE } from "./scholar-type";

export interface InDocTOCItem {
  id: string;
  label: string;
}

export function InDocTOC({
  items,
  title = "Inhalt",
  className,
}: {
  items: InDocTOCItem[];
  title?: string;
  className?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // Hold the latest active id without re-subscribing the observer.
  const activeIdRef = useRef<string | null>(null);

  // ─── Scroll-spy via IntersectionObserver ───────────────────────────
  useEffect(() => {
    if (items.length === 0) return;
    if (typeof IntersectionObserver === "undefined") return;

    // Track per-id intersection so we can resolve the topmost visible one.
    const visible = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting);
        }

        // Topmost visible section wins, following document order.
        let next: string | null = null;
        for (const item of items) {
          if (visible.get(item.id)) {
            next = item.id;
            break;
          }
        }

        // Between sections: keep the last-seen active id (no blank state).
        if (next === null) next = activeIdRef.current;

        if (next !== activeIdRef.current) {
          activeIdRef.current = next;
          setActiveId(next);
        }
      },
      {
        // Bias the active line toward the section near the top of the viewport.
        rootMargin: "0px 0px -65% 0px",
        threshold: 0,
      },
    );

    const observed: Element[] = [];
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) {
        observer.observe(el);
        observed.push(el);
      }
    }

    return () => {
      observer.disconnect();
      observed.length = 0;
    };
  }, [items]);

  // ─── Smooth-scroll on click, respecting reduced-motion + native hash ─
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    // Let modified clicks (new tab/window) and non-primary buttons behave
    // natively — do not hijack them.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = document.getElementById(id);
    if (!target) return; // fall back to native hash anchoring

    event.preventDefault();

    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    target.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });

    // Preserve native hash semantics (deep-linking + back/forward) without a
    // second jarring jump.
    if (typeof history !== "undefined" && history.replaceState) {
      history.replaceState(null, "", "#" + id);
    } else {
      window.location.hash = id;
    }

    // Move focus to the target for keyboard + screen-reader users.
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });

    // Reflect the new active state immediately (observer will confirm).
    activeIdRef.current = id;
    setActiveId(id);
  }

  // Nothing to show — render nothing (per spec).
  if (items.length === 0) return null;

  return (
    <nav aria-label="Inhaltsverzeichnis" className={className ?? undefined}>
      <p className={`mb-2 ${SCHOLAR_TYPE.eyebrow}`}>{title}</p>
      <ul className="flex flex-col">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={"#" + item.id}
                onClick={(event) => handleClick(event, item.id)}
                aria-current={isActive ? "location" : undefined}
                className={
                  "block py-1 text-body-lg leading-snug rounded-md " +
                  "motion-safe:transition-colors motion-safe:duration-200 " +
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F8FA] " +
                  (isActive
                    ? "font-semibold text-gray-900"
                    : "text-gray-600 hover:text-gray-900")
                }
              >
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
