"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * useVoiceRecorder — browser audio capture for Atlas voice-input.
 *
 * Wraps the MediaRecorder API into a React-friendly state machine:
 *   idle → requesting → recording → transcribing → idle
 *
 * Permission UX handles two common errors:
 *   - NotAllowedError       → user denied microphone permission
 *   - NotFoundError         → no microphone hardware
 *   …plus generic "Sprachaufnahme nicht möglich" for everything else.
 *
 * The recorder POSTs the recorded blob to /api/atlas/transcribe and
 * returns the transcribed text via the `transcript` state. The caller
 * (typically ChatInput) reads that and inserts into its textarea.
 *
 * Browser support: MediaRecorder is supported in all modern browsers
 * (Safari 14.1+, Chrome 47+, Firefox 25+). We feature-detect the
 * preferred mime type per-browser (Safari prefers mp4 in older
 * versions; WebM/Opus is the universal modern default).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "transcribing";

export interface UseVoiceRecorder {
  state: RecorderState;
  /** Last transcript returned by /api/atlas/transcribe. Cleared on
   *  the next `start()`. Caller decides when to read + consume it. */
  transcript: string | null;
  /** Friendly German error string if anything failed; null otherwise.
   *  Cleared on the next `start()`. */
  error: string | null;
  /** Feature availability:
   *    - "ready"       → recorder usable
   *    - "unsupported" → no MediaRecorder / getUserMedia in browser
   *    - "no-backend"  → /api/atlas/transcribe returned 503 (no API key
   *                       configured server-side). Mic button should be
   *                       disabled with a tooltip pointing operators at
   *                       the env-var setup. */
  availability: "ready" | "unsupported" | "no-backend";
  /** Bytes captured so far in the current recording (for UI hint). */
  bytes: number;
  /** Seconds since recording started (rough wall-clock). */
  seconds: number;
  start: () => Promise<void>;
  stop: () => void;
  /** Caller calls this after consuming `transcript` to reset. */
  reset: () => void;
}

/* Detect a supported audio mimetype. WebM/Opus first (smallest +
 * universally supported in modern Chromium/Firefox); Safari fallback
 * to MP4-AAC. Return value is fed straight to MediaRecorder. */
function preferredMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* Safari < 15 throws on isTypeSupported — skip */
    }
  }
  return undefined;
}

export function useVoiceRecorder(): UseVoiceRecorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<
    "ready" | "unsupported" | "no-backend"
  >("ready");
  const [bytes, setBytes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  /* Feature detection on mount. */
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setAvailability("unsupported");
    }
  }, []);

  /* Cleanup on unmount: stop any in-progress recording + release mic. */
  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const start = useCallback(async () => {
    if (availability !== "ready") return;
    if (state !== "idle") return;

    setError(null);
    setTranscript(null);
    setBytes(0);
    setSeconds(0);
    chunksRef.current = [];
    setState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as Error)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(
          "Mikrofonzugriff abgelehnt. Bitte im Browser erlauben und erneut versuchen.",
        );
      } else if (name === "NotFoundError") {
        setError("Kein Mikrofon gefunden.");
      } else {
        setError("Sprachaufnahme nicht möglich.");
      }
      setState("idle");
      return;
    }
    streamRef.current = stream;

    const mime = preferredMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError("Sprachaufnahme nicht möglich (MediaRecorder).");
      setState("idle");
      return;
    }
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
        setBytes((b) => b + e.data.size);
      }
    };

    rec.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }

      const blob = new Blob(chunksRef.current, {
        type: mime ?? "audio/webm",
      });
      chunksRef.current = [];

      if (blob.size === 0) {
        setError("Keine Audiodaten aufgenommen.");
        setState("idle");
        return;
      }

      setState("transcribing");
      const form = new FormData();
      const extFromMime = (m: string) => {
        if (m.startsWith("audio/mp4")) return "m4a";
        if (m.startsWith("audio/ogg")) return "ogg";
        return "webm";
      };
      form.append(
        "file",
        new File([blob], `voice.${extFromMime(blob.type)}`, {
          type: blob.type,
        }),
      );
      form.append("language", "de");

      try {
        const res = await fetch("/api/atlas/transcribe", {
          method: "POST",
          body: form,
        });
        if (res.status === 503) {
          setAvailability("no-backend");
          setError(
            "Spracheingabe noch nicht freigeschaltet (OPENAI_API_KEY fehlt).",
          );
          setState("idle");
          return;
        }
        if (res.status === 429) {
          setError("Zu viele Sprachanfragen. Bitte später erneut versuchen.");
          setState("idle");
          return;
        }
        if (!res.ok) {
          setError("Transkription fehlgeschlagen.");
          setState("idle");
          return;
        }
        const data = (await res.json()) as { text?: string };
        if (typeof data.text !== "string") {
          setError("Leere Antwort vom Transkriptions-Server.");
          setState("idle");
          return;
        }
        setTranscript(data.text);
        setState("idle");
      } catch {
        setError("Verbindung zur Transkription verloren.");
        setState("idle");
      }
    };

    setState("recording");
    startedAtRef.current = Date.now();
    /* Slice the recording into 1-second chunks so dataavailable fires
       regularly and bytes-counter UI updates in near-real-time. */
    rec.start(1000);

    tickRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
  }, [availability, state]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore — onstop handles cleanup */
      }
    }
  }, []);

  const reset = useCallback(() => {
    setTranscript(null);
    setError(null);
  }, []);

  return {
    state,
    transcript,
    error,
    availability,
    bytes,
    seconds,
    start,
    stop,
    reset,
  };
}
