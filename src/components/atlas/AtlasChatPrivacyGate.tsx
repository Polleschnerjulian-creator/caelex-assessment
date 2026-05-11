"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * AtlasChatPrivacyGate — informed-consent wrapper for any Atlas chat
 * surface that ships user input to Anthropic / OpenAI.
 *
 * Compliance-Audit 2026-05 closed the gap between the comprehensive
 * DPA § 10a Berufsgeheimnis-Annex and the actual UI: text input had
 * NO friction warning lawyers about § 203 StGB exposure when pasting
 * client-identifying material. Voice input already had this gate
 * (`AIMode.tsx::startListening`); this component mirrors it for text
 * and lives next to every chat input.
 *
 * Usage: wrap or render alongside any chat input. The component
 * exposes `gateInputBefore(submit)` which intercepts the first submit
 * per-device, shows the modal, and only forwards the submit after
 * acknowledgement is recorded in localStorage.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  hasCurrentConsent,
  writeConsent,
  getCopy,
  CONSENT_VERSION,
} from "@/lib/atlas/chat-privacy-consent";

interface AtlasChatPrivacyGateProps {
  /** UI language — "de" | "en" | "fr" | "es". Falls back to "en". */
  language: string;
  /** Render the persistent banner above the chat input area. Default true. */
  showBanner?: boolean;
  /** Optional className passed to the outer banner element. */
  bannerClassName?: string;
}

/**
 * Renders the persistent banner. The modal is rendered separately so
 * it can be triggered programmatically from the parent's submit
 * handler. Use the `useChatPrivacyGate` hook for the gate logic.
 */
export function AtlasChatPrivacyBanner({
  language,
  bannerClassName,
}: Omit<AtlasChatPrivacyGateProps, "showBanner">) {
  const copy = getCopy(language);
  return (
    <div
      role="note"
      className={bannerClassName}
      style={
        bannerClassName
          ? undefined
          : {
              fontSize: "11px",
              lineHeight: 1.4,
              padding: "6px 12px",
              borderRadius: "6px",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              color: "rgba(180, 130, 50, 0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }
      }
    >
      <span>{copy.banner.text}</span>
      <Link
        href="/legal/privacy"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: "inherit",
          textDecoration: "underline",
          opacity: 0.85,
          flexShrink: 0,
        }}
      >
        {copy.banner.learnMore} →
      </Link>
    </div>
  );
}

/**
 * Modal — overlay shown on first submit per device. Calls onAccept when
 * the user clicks "Understood", onCancel when they back out.
 */
export function AtlasChatPrivacyModal({
  language,
  onAccept,
  onCancel,
}: {
  language: string;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const copy = getCopy(language);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="atlas-privacy-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 15, 30, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          maxWidth: "560px",
          width: "100%",
          background: "rgba(15, 23, 42, 0.96)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "28px",
          color: "rgba(226, 232, 240, 0.95)",
          boxShadow:
            "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)",
        }}
      >
        <h2
          id="atlas-privacy-modal-title"
          style={{
            fontSize: "18px",
            fontWeight: 600,
            margin: "0 0 12px",
            color: "rgba(248, 250, 252, 1)",
          }}
        >
          {copy.modal.title}
        </h2>
        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.6,
            margin: "0 0 16px",
            color: "rgba(203, 213, 225, 0.9)",
          }}
        >
          {copy.modal.intro}
        </p>
        <ul
          style={{
            fontSize: "13px",
            lineHeight: 1.6,
            margin: "0 0 16px",
            paddingLeft: "20px",
            color: "rgba(203, 213, 225, 0.9)",
          }}
        >
          {copy.modal.bullets.map((bullet, i) => (
            <li key={i} style={{ marginBottom: "8px" }}>
              {bullet}
            </li>
          ))}
        </ul>
        <p
          style={{
            fontSize: "11px",
            lineHeight: 1.5,
            margin: "0 0 24px",
            padding: "10px 12px",
            borderRadius: "6px",
            background: "rgba(16, 185, 129, 0.06)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            color: "rgba(110, 231, 183, 0.95)",
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          }}
        >
          {copy.modal.routing}
        </p>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "9px 16px",
              fontSize: "13px",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "rgba(203, 213, 225, 0.9)",
              cursor: "pointer",
            }}
          >
            {copy.modal.cancel}
          </button>
          <button
            type="button"
            onClick={onAccept}
            style={{
              padding: "9px 18px",
              fontSize: "13px",
              fontWeight: 500,
              borderRadius: "6px",
              background: "rgb(16, 185, 129)",
              border: "1px solid rgba(16, 185, 129, 1)",
              color: "white",
              cursor: "pointer",
            }}
          >
            {copy.modal.accept}
          </button>
        </div>
        <p
          style={{
            fontSize: "10px",
            color: "rgba(148, 163, 184, 0.7)",
            margin: "16px 0 0",
            textAlign: "right",
          }}
        >
          v{CONSENT_VERSION}
        </p>
      </div>
    </div>
  );
}

/**
 * Hook returning a callback-driven gate. Pass the queued submit fn to
 * `gate(submit)` — if consent is already recorded, the submit fires
 * synchronously and `gate` returns true. If not, the submit is
 * queued and the modal opens; on accept the modal calls the queued
 * submit; on cancel it discards it.
 */
export function useChatPrivacyGate(language: string): {
  modalOpen: boolean;
  needsConsent: boolean;
  /** Pass the queued submit. Returns true if cleared & ran sync, false if queued. */
  gate: (submit: () => void) => boolean;
  /** Programmatic accept — runs the queued submit + writes consent. */
  accept: () => void;
  /** Programmatic cancel — discards the queued submit. */
  cancel: () => void;
} {
  const [needsConsent, setNeedsConsent] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  /* Use a ref for the pending submit so the latest closure is used
     when accept() fires — useState would tear if accept races a
     re-render. */
  const pendingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setNeedsConsent(!hasCurrentConsent());
  }, []);

  const gate = useCallback((submit: () => void): boolean => {
    if (hasCurrentConsent()) {
      submit();
      return true;
    }
    pendingRef.current = submit;
    setModalOpen(true);
    return false;
  }, []);

  const accept = useCallback(() => {
    writeConsent(language);
    setNeedsConsent(false);
    setModalOpen(false);
    const queued = pendingRef.current;
    pendingRef.current = null;
    if (queued) queued();
  }, [language]);

  const cancel = useCallback(() => {
    setModalOpen(false);
    pendingRef.current = null;
  }, []);

  return {
    modalOpen,
    needsConsent,
    gate,
    accept,
    cancel,
  };
}
