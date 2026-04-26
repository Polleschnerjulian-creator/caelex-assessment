"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * AIMode — full-screen Atlas AI overlay.
 *
 * Wired to /api/atlas/ai-chat which streams Claude Sonnet responses
 * back as Server-Sent Events. The UI renders deltas in real time so
 * the conversation paints token-by-token, same feel as the mock had.
 *
 * Composition:
 *   AtlasEntity          → the Three.js scene behind the UI
 *   Command palette      → ⌘/ or slash-first input
 *   Model switcher       → visual only (always sonnet on the server)
 *   Mic                  → real WebAudio analyser (listening mode)
 *   Sound                → WebAudio blips on interactions
 *   Attachments          → dropzone + button, chips in the search bar
 *   Conversation         → real SSE stream from the backend
 *
 * Future work: pass attachment files in the payload (multimodal),
 * wire the model switcher to send a model hint, surface tool-use
 * when the backend adds agentic orchestration.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Briefcase, UserPlus, PenLine, Scale, Inbox } from "lucide-react";
import type { Citation } from "@/lib/atlas/citations";
import {
  AtlasEntity,
  type AtlasEntityHandle,
  type AtlasMode,
} from "./AtlasEntity";
import { AtlasMarkdown } from "./AtlasMarkdown";
import { ContextPanel } from "./ContextPanel";
import {
  MattersPanel,
  InvitePanel,
  MemoPanel,
  ComparePanel,
  type ActionPanelKey,
} from "./ActionPanels";
import { MorningBrief } from "./MorningBrief";
import { LibrarySaveButton } from "./LibrarySaveButton";
import {
  WorkspacePinboardInline,
  type WorkspaceCard,
} from "./WorkspacePinboardInline";
import styles from "./ai-mode.module.css";

// ─── Config ────────────────────────────────────────────────────────────

const MODELS = {
  "ATLAS-1": { ctx: 220000, label: "220k" },
  "ATLAS Mini": { ctx: 64000, label: "64k" },
  "ATLAS Pro": { ctx: 1000000, label: "1M" },
} as const;
type ModelName = keyof typeof MODELS;

const SUGGESTIONS = [
  "Lizenzregime Weltraum · DE vs. FR",
  "Was ist neu im EU Space Act?",
  "Frist ITU Filing prüfen",
  "Haftung Startstaat erklären",
];

// Phase AB-2 — Quick Actions row beneath the pill, each toggling
// a left-side context panel mirroring the right-side ContextPanel.
//
// All four actions open structured panels rather than navigating or
// injecting raw text. The panels handle their own data + form state;
// the AI mode just toggles which one is visible. This keeps the
// lawyer inside Atlas — no page transitions, no lost context.
//
// Keyboard shortcuts ⌘1-⌘4 (Linear-style, no browser/OS conflicts).
const QUICK_ACTIONS = [
  {
    icon: Briefcase,
    label: "Mandate",
    panel: "matters" as const,
    kbd: "1",
  },
  {
    icon: UserPlus,
    label: "Mandant einladen",
    panel: "invite" as const,
    kbd: "2",
  },
  {
    icon: PenLine,
    label: "Memo entwerfen",
    panel: "memo" as const,
    kbd: "3",
  },
  {
    icon: Scale,
    label: "Jurisdiktionen vergleichen",
    panel: "compare" as const,
    kbd: "4",
  },
  {
    icon: Inbox,
    label: "Workspace öffnen",
    panel: "workspace" as const,
    kbd: "5",
  },
] as const;
type QuickAction = (typeof QUICK_ACTIONS)[number];

const COMMANDS = [
  {
    name: "memo",
    icon: "✎",
    desc: "Mandantenmemo draften",
    fill: "Draft a memo on: ",
  },
  {
    name: "compare",
    icon: "⇌",
    desc: "Jurisdiktionen vergleichen",
    fill: "Compare jurisdictions on: ",
  },
  {
    name: "cite",
    icon: "⌘",
    desc: "Citations extrahieren",
    fill: "Extract citations for: ",
  },
  {
    name: "watch",
    icon: "◉",
    desc: "Monitor einrichten",
    fill: "Watch changes for: ",
  },
  { name: "explain", icon: "?", desc: "Konzept erklären", fill: "Explain: " },
  {
    name: "precedent",
    icon: "§",
    desc: "Precedent finden",
    fill: "Find precedent for: ",
  },
] as const;

const API_ENDPOINT = "/api/atlas/ai-chat";

function fmtTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 10000) return `${(n / 1000).toFixed(2)}k`;
  if (n < 100000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1000000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}

// ─── Types ─────────────────────────────────────────────────────────────

interface ToolTrace {
  id: string;
  name: string;
  isError?: boolean;
  completed?: boolean;
  /** When a tool's result includes a navigation directive, the chip
   *  renders with a "→ öffne …" styling so the user sees the redirect
   *  coming. */
  navigate?: boolean;
  /** Phase R: humanised summary of the input args, e.g.
   *  „Vorschau: 'Rocket Inc' · L3 Full Counsel · 12M". Server formats
   *  via formatAtlasToolInput() and sends in tool_use_start. */
  inputSummary?: string;
}

interface ChatMsg {
  id: string;
  role: "user" | "atlas";
  text: string;
  streaming?: boolean;
  tools?: ToolTrace[];
}

/** Atlas tool → human label for the transparency chip. */
const TOOL_LABEL: Record<string, string> = {
  find_or_open_matter: "Mandate werden durchsucht",
  find_operator_organization: "Mandanten-Verzeichnis abgefragt",
  create_matter_invite: "Einladung vorbereitet",
};

interface AIModeProps {
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────

export function AIMode({ open, onClose }: AIModeProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AtlasMode>("idle");
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [totalTokens, setTotalTokens] = useState(8234);
  const [modelName, setModelName] = useState<ModelName>("ATLAS-1");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdActiveIdx, setCmdActiveIdx] = useState(0);
  const [toastText, setToastText] = useState<string | null>(null);
  const [tokenPulse, setTokenPulse] = useState(0); // changes to retrigger CSS anim
  const [audioLevel, setAudioLevel] = useState(0);
  const [activePanel, setActivePanel] = useState<ActionPanelKey | null>(null);

  // Workspace state — inline Pinboard rendered around the minimised orb
  // when open. Cards live in-memory for now; persistence (lazy STANDALONE
  // matter on first pin) wires in once the LegalMatter schema is live
  // in production.
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceCards, setWorkspaceCards] = useState<WorkspaceCard[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const cmdInputRef = useRef<HTMLInputElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const entityHandle = useRef<AtlasEntityHandle | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number>(0);
  const lastTypeTs = useRef<number>(0);
  const idleReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maxTokens = MODELS[modelName].ctx;

  // ── Reset when overlay closes ──────────────────────────────
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 350);
      return () => clearTimeout(t);
    } else {
      setMode("idle");
      setInputValue("");
      setMessages([]);
      setAttachments([]);
      setCmdOpen(false);
      setActivePanel(null);
      setWorkspaceOpen(false);
      // Workspace cards keep across open/close while the user stays in
      // the Atlas tab — the cards are session-local so they survive
      // toggles of the AI overlay but get cleared on tab close.
    }
  }, [open]);

  // ── Return to idle after typing pause ──────────────────────
  // The "typing" mode re-energises the entity, but if the user
  // stops typing we drift back to idle after ~1.5s so the orb
  // doesn't look forever-excited.
  useEffect(() => {
    if (mode !== "typing") return;
    const check = () => {
      if (performance.now() - lastTypeTs.current > 1500 && mode === "typing") {
        setMode("idle");
      }
    };
    const id = setInterval(check, 300);
    return () => clearInterval(id);
  }, [mode]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  // ⌘K  — focus search bar
  // ⌘/  — open command palette
  // ⌘1..⌘5 — quick actions (Phase AB). Linear-style number shortcuts
  //         deliberately avoid letter keys that collide with browser
  //         (⌘N new window, ⌘I dev tools italic) or OS (⌘M minimise).
  //         ⌘5 opens a new standalone workspace (direct navigate).
  // The action handler is captured via a ref so this useEffect can
  // be declared early without a circular dependency on runQuickAction
  // (which itself depends on playSound declared further below).
  const runQuickActionRef = useRef<((a: QuickAction) => void) | null>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      const metaKey = e.metaKey || e.ctrlKey;
      if (metaKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (metaKey && e.key === "/") {
        e.preventDefault();
        setCmdOpen(true);
        setCmdQuery("");
      }
      // Quick actions — ignore when the command palette is open so
      // ⌘1-4 don't fight palette navigation.
      if (metaKey && !cmdOpen) {
        const idx = ["1", "2", "3", "4", "5"].indexOf(e.key);
        if (idx !== -1) {
          e.preventDefault();
          runQuickActionRef.current?.(QUICK_ACTIONS[idx]);
        }
      }
      if (e.key === "Escape") {
        if (cmdOpen) {
          setCmdOpen(false);
        } else if (workspaceOpen) {
          // Close workspace before closing the entire overlay so a
          // single Esc never accidentally drops the user out of Atlas.
          setWorkspaceOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cmdOpen, onClose, workspaceOpen]);

  // ── Command palette focus ──────────────────────────────────
  useEffect(() => {
    if (cmdOpen) setTimeout(() => cmdInputRef.current?.focus(), 40);
  }, [cmdOpen]);

  // ── Auto-scroll conversation ───────────────────────────────
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [messages]);

  // ── Click outside model menu ───────────────────────────────
  useEffect(() => {
    if (!modelMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-atlas-menu]`)) setModelMenuOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [modelMenuOpen]);

  // ── Dropzone (global) ──────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onDrag = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer?.files) return;
      addAttachments(Array.from(e.dataTransfer.files));
    };
    window.addEventListener("dragover", onDrag);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDrag);
      window.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Cleanup mic on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      stopListening();
      if (idleReturnTimerRef.current) clearTimeout(idleReturnTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ────────────────────────────────────────────────
  const playSound = useCallback(
    (type: "click" | "whoosh" | "chime") => {
      if (!soundOn) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      let freq = 1800;
      let dur = 0.04;
      let vol = 0.05;
      let wave: OscillatorType = "sine";
      if (type === "click") {
        freq = 2400;
        dur = 0.03;
        vol = 0.03;
      }
      if (type === "whoosh") {
        freq = 300;
        dur = 0.35;
        vol = 0.12;
        wave = "triangle";
      }
      if (type === "chime") {
        freq = 880;
        dur = 0.4;
        vol = 0.08;
      }
      osc.type = wave;
      osc.frequency.setValueAtTime(freq, now);
      if (type === "whoosh")
        osc.frequency.exponentialRampToValueAtTime(80, now + dur);
      if (type === "chime")
        osc.frequency.exponentialRampToValueAtTime(freq * 2, now + dur);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    },
    [soundOn],
  );

  const toast = useCallback((msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText((t) => (t === msg ? null : t)), 1800);
  }, []);

  // ── Attachments ────────────────────────────────────────────
  const addAttachments = useCallback(
    (files: File[]) => {
      setAttachments((prev) => [...prev, ...files]);
      playSound("click");
      if (files.length) toast(`Anhang: ${files[0].name}`);
    },
    [playSound, toast],
  );

  // ── Mic ────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micRafRef.current) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = 0;
    }
    micAnalyserRef.current = null;
    setListening(false);
    setAudioLevel(0);
    setMode("idle");
  }, []);

  const startListening = useCallback(async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        )();
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const src = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      micAnalyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!micAnalyserRef.current) return;
        micAnalyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        setAudioLevel(avg);
        micRafRef.current = requestAnimationFrame(tick);
      };
      tick();

      setListening(true);
      setMode("listening");
      toast("Hört zu…");
    } catch {
      toast("Mikrofon nicht verfügbar");
    }
  }, [toast]);

  // ── Submit / real streaming from /api/atlas/ai-chat ────────
  //
  // Pipeline: user submits → we add the user message → we POST the full
  // conversation history to the SSE endpoint → as deltas arrive, we
  // append them to the atlas message in real time.
  //
  // `prevMessages` is the history snapshot BEFORE the current user
  // message is added — we concat it with the new prompt on the way
  // out so the server sees a clean "chronological" conversation.
  const runResponse = useCallback(
    async (prompt: string, prevMessages: ChatMsg[]) => {
      const atlasId = `m-${Date.now()}-atlas`;
      setMode("thinking");
      playSound("chime");
      setMessages((prev) => [
        ...prev,
        { id: atlasId, role: "atlas", text: "", streaming: true },
      ]);

      const payloadMessages: Array<{
        role: "user" | "assistant";
        content: string;
      }> = [
        ...prevMessages
          .filter((m) => m.text.trim().length > 0)
          .map((m) => ({
            role:
              m.role === "user" ? ("user" as const) : ("assistant" as const),
            content: m.text,
          })),
        { role: "user", content: prompt },
      ];

      let receivedAny = false;
      const setAtlasText = (updater: (prev: string) => string) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === atlasId ? { ...m, text: updater(m.text) } : m,
          ),
        );
      };

      try {
        const res = await fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payloadMessages }),
        });

        if (res.status === 429) {
          setAtlasText(
            () => "Rate limit erreicht — kurz warten, dann nochmal.",
          );
          return;
        }
        if (res.status === 401) {
          setAtlasText(() => "Session abgelaufen. Bitte Seite neu laden.");
          return;
        }
        if (!res.ok || !res.body) {
          setAtlasText(() => "Verbindung zur AI fehlgeschlagen.");
          return;
        }

        setMode("speaking");

        // Manual SSE parser. Works in all modern browsers without
        // pulling a dependency. Each message block is separated by
        // a blank line; within a block `data: …` carries the payload.
        //
        // Deltas are coalesced through a requestAnimationFrame buffer:
        // Claude emits many small token deltas (sometimes 50-100/s),
        // each of which would otherwise trigger a React re-render of
        // ALL messages — and every message has a backdrop-filter blur,
        // which is among the most expensive paint operations in the
        // browser. Batching to 1 flush per frame (~60fps) is the
        // difference between silky streaming and visible jank.
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let textBuffer = "";
        let tokenAccum = 0;
        let rafId = 0;

        const flush = () => {
          rafId = 0;
          if (textBuffer.length > 0) {
            const chunkToAppend = textBuffer;
            textBuffer = "";
            setAtlasText((t) => t + chunkToAppend);
          }
          if (tokenAccum > 0) {
            const add = tokenAccum;
            tokenAccum = 0;
            setTotalTokens((n) => Math.min(maxTokens, n + add));
          }
        };
        const scheduleFlush = () => {
          if (!rafId) rafId = requestAnimationFrame(flush);
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          const chunks = sseBuffer.split("\n\n");
          sseBuffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const dataLine = chunk
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              // Phase 6a — expanded union for tool-use events. Navigate
              // + tool chips piggyback on the same SSE connection.
              const evt = JSON.parse(dataLine.slice(6)) as
                | { type: "text"; text: string }
                | { type: "done"; usage?: { input: number; output: number } }
                | { type: "error"; message: string }
                | {
                    type: "tool_use_start";
                    name: string;
                    id: string;
                    inputSummary?: string;
                  }
                | {
                    type: "tool_use_result";
                    name: string;
                    id: string;
                    isError?: boolean;
                  }
                | { type: "navigate"; url: string; tool?: string }
                | { type: "tool_limit_reached"; iterations: number };
              if (evt.type === "text") {
                receivedAny = true;
                textBuffer += evt.text;
                tokenAccum += 1;
                scheduleFlush();
              } else if (evt.type === "error") {
                if (!receivedAny) {
                  setAtlasText(
                    () =>
                      "AI-Stream wurde unterbrochen. Bitte nochmal versuchen.",
                  );
                }
              } else if (evt.type === "done" && evt.usage) {
                // Real-usage telemetry bump to keep the meter honest.
                setTotalTokens((n) =>
                  Math.min(maxTokens, n + evt.usage!.output),
                );
              } else if (evt.type === "tool_use_start") {
                // Append a pending tool chip to the current atlas msg
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === atlasId
                      ? {
                          ...m,
                          tools: [
                            ...(m.tools ?? []),
                            {
                              id: evt.id,
                              name: evt.name,
                              completed: false,
                              inputSummary: evt.inputSummary,
                            },
                          ],
                        }
                      : m,
                  ),
                );
              } else if (evt.type === "tool_use_result") {
                // Mark the matching chip complete (success/error)
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === atlasId
                      ? {
                          ...m,
                          tools: (m.tools ?? []).map((t) =>
                            t.id === evt.id
                              ? {
                                  ...t,
                                  completed: true,
                                  isError: !!evt.isError,
                                }
                              : t,
                          ),
                        }
                      : m,
                  ),
                );
              } else if (evt.type === "navigate") {
                // Flag the matching tool chip as "navigate" for visual
                // feedback, then push — small delay so the user sees
                // the confirmation sentence before the route changes.
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === atlasId
                      ? {
                          ...m,
                          tools: (m.tools ?? []).map((t) =>
                            t.name === evt.tool && !t.navigate
                              ? { ...t, navigate: true }
                              : t,
                          ),
                        }
                      : m,
                  ),
                );
                // Flush any buffered text first so the user sees the
                // whole confirmation before navigation kicks in.
                if (rafId) cancelAnimationFrame(rafId);
                flush();
                setTimeout(() => {
                  onClose();
                  router.push(evt.url);
                }, 600);
              } else if (evt.type === "tool_limit_reached") {
                // Rare — surface a subtle inline note.
                setAtlasText(
                  (t) =>
                    t +
                    "\n\n_Hinweis: Tool-Loop-Limit erreicht, Antwort evtl. unvollständig._",
                );
              }
            } catch {
              // Malformed chunk — SSE framing error. Skip and continue.
            }
          }
        }
        // Final flush after stream ends — any deltas still buffered.
        if (rafId) cancelAnimationFrame(rafId);
        flush();

        if (!receivedAny) {
          setAtlasText(() => "Keine Antwort empfangen. Erneut versuchen?");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Netzwerkfehler";
        setAtlasText(() => `Fehler: ${msg}`);
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === atlasId ? { ...m, streaming: false } : m)),
        );
        setMode("idle");
      }
    },
    [maxTokens, playSound, onClose, router],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text) return;
      // Close any open action panel — submitting transitions Atlas
      // from the idle command surface to active conversation, and
      // a side-panel competing with the answer feed is too noisy.
      setActivePanel(null);
      // Snapshot current history BEFORE adding the user's message so
      // runResponse can concatenate cleanly without duplicating.
      const historyBeforePrompt = messages;
      const userId = `m-${Date.now()}-user`;
      setMessages((prev) => [...prev, { id: userId, role: "user", text }]);
      const typedTokens = Math.floor(inputValue.length / 3.2);
      const attachmentCost = attachments.length * 400;
      setTotalTokens((n) =>
        Math.min(maxTokens, n + typedTokens + attachmentCost),
      );
      setInputValue("");
      setTokenPulse((n) => n + 1);
      // Sanfter Send-Moment: kein Shockwave-Ring, nur ein kleiner
      // Energy-Bump damit der Orb merklich aber ruhig in den
      // Thinking-State rollt. Der Sound wird zum dezenten Click.
      entityHandle.current?.bumpEnergy(0.25);
      playSound("click");
      runResponse(text, historyBeforePrompt);
    },
    [
      attachments.length,
      inputValue,
      maxTokens,
      messages,
      playSound,
      runResponse,
    ],
  );

  // Sobald ein einziger chat eintrag existiert, wechseln wir in den
  // "aktiv"-layout-state: orb schrumpft + wandert oben-links, die
  // konversation bekommt den zentralen platz, der text wird lesbar.
  const hasConversation = messages.length > 0;
  // Orb minimises whenever there's content around it — chat or
  // workspace pinboard. Same visual transition for both modes.
  const stageMinimized = hasConversation || workspaceOpen;

  // ── ContextPanel inputs ────────────────────────────────────
  // Die "aktive anfrage" ist die letzte user-message. Der streaming-
  // text für die citation-extraktion ist die letzte atlas-message.
  // Wird nur neu berechnet wenn messages sich wirklich ändert.
  const contextQuery = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].text;
    }
    return null;
  }, [messages]);
  const contextAssistantText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "atlas") return messages[i].text;
    }
    return "";
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    lastTypeTs.current = performance.now();
    setMode("typing");
    entityHandle.current?.bumpEnergy(0.04);
    playSound("click");
    if (v.startsWith("/")) {
      setCmdOpen(true);
      setCmdQuery(v.slice(1));
    }
  };

  const handleInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && !cmdOpen) onClose();
  };

  // ── Token meter calc ───────────────────────────────────────
  const typedTok = Math.floor(inputValue.length / 3.2);
  const currentTokens = Math.min(maxTokens, totalTokens + typedTok);
  const tokenPct = Math.min(100, (currentTokens / maxTokens) * 100);
  const tokenWarn = tokenPct >= 75 && tokenPct < 92;
  const tokenCrit = tokenPct >= 92;

  // ── Command filtering ──────────────────────────────────────
  const filteredCmds = useMemo(() => {
    const q = cmdQuery.toLowerCase();
    return COMMANDS.filter(
      (c) => c.name.includes(q) || c.desc.toLowerCase().includes(q),
    );
  }, [cmdQuery]);

  useEffect(() => {
    setCmdActiveIdx((i) => Math.min(i, Math.max(0, filteredCmds.length - 1)));
  }, [filteredCmds.length]);

  const runCmd = useCallback((cmd: (typeof COMMANDS)[number]) => {
    setInputValue(cmd.fill);
    setCmdOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cmd.fill.length, cmd.fill.length);
    }, 50);
  }, []);

  // Quick action runner — Phase AB-2 toggles a left-side action panel.
  // Same panel key clicked twice closes it (toggle UX). Different key
  // swaps content — only one panel visible at a time, no stacking.
  // ⌘5 / workspace is a direct-navigate action — it POSTs to
  // /api/atlas/workspace, creates a standalone matter, then pushes
  // to the workspace page. No side panel is opened.
  const runQuickAction = useCallback(
    (action: QuickAction) => {
      playSound("click");
      if (action.panel === "workspace") {
        // Inline-Workspace: orb shifts to corner like in chat-mode,
        // a Pinboard panel renders around it. No navigation, no DB
        // call — pure UI state. (Promote to a real persisted matter
        // is a separate flow that hooks in once a card is pinned.)
        setWorkspaceOpen((open) => !open);
        return;
      }
      setActivePanel((prev) => (prev === action.panel ? null : action.panel));
    },
    [playSound, router, toast],
  );
  // Keep the ref-based bridge fresh — the keyboard useEffect (declared
  // earlier in the component body) reads from this ref to fire ⌘1-4
  // without forming a forward reference cycle.
  runQuickActionRef.current = runQuickAction;

  // Helper for MemoPanel + ComparePanel: take their structured form
  // input, format as a prompt, close the panel, push as a user message,
  // and run the standard SSE response pipeline. Lets the panels stay
  // form-shaped while still routing through the existing chat plumbing.
  const submitPromptFromPanel = useCallback(
    (prompt: string) => {
      setActivePanel(null);
      playSound("click");
      const userId = `m-${Date.now()}-user`;
      const historyBeforePrompt = messages;
      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", text: prompt },
      ]);
      const typedTokens = Math.floor(prompt.length / 3.2);
      setTotalTokens((n) => Math.min(maxTokens, n + typedTokens));
      setTokenPulse((n) => n + 1);
      entityHandle.current?.bumpEnergy(0.25);
      runResponse(prompt, historyBeforePrompt);
    },
    [maxTokens, messages, playSound, runResponse],
  );

  // MattersPanel-row click: deep-link into the matter workspace. Closing
  // the AI overlay first lets the destination page mount unblocked.
  const navigateToMatter = useCallback(
    (matterId: string) => {
      setActivePanel(null);
      onClose();
      router.push(`/atlas/network/${matterId}/workspace`);
    },
    [onClose, router],
  );

  // InvitePanel success → close the panel + toast. We deliberately
  // do NOT redirect into the matter — the invite is async (counterparty
  // hasn't accepted yet), so dropping the lawyer onto a non-existent
  // workspace would be confusing. The toast confirms the send.
  const handleInviteSuccess = useCallback(() => {
    setActivePanel(null);
    toast("Einladung gesendet — Mandant erhält eine E-Mail.");
    playSound("chime");
  }, [playSound, toast]);

  // Phase 3 — Citations Highlighter wiring. When a lawyer clicks
  // "Bei Atlas nachfragen" inside a citation popover, format an
  // explain-prompt and route it through the existing chat pipeline
  // (same as if they typed the question themselves). Closes any open
  // action panel first to clear the stage for the answer.
  const handleAskAtlasCitation = useCallback(
    (citation: Citation) => {
      const hint = citation.hint ? ` (${citation.hint})` : "";
      const prompt = `Erkläre ${citation.label}${hint}: Geltungsbereich, kerngehalt der norm, häufige praktische auslegung. Mit verweis auf primärquelle.`;
      submitPromptFromPanel(prompt);
    },
    [submitPromptFromPanel],
  );

  const handleCmdKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCmdActiveIdx((i) => Math.min(i + 1, filteredCmds.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCmdActiveIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filteredCmds[cmdActiveIdx];
      if (cmd) runCmd(cmd);
    }
    if (e.key === "Escape") {
      setCmdOpen(false);
    }
  };

  // ── Render gate ────────────────────────────────────────────
  if (!open) return null;

  const suggestionsHidden =
    messages.length > 0 || inputValue.length > 0 || workspaceOpen;
  const pillHasText = inputValue.length > 0;

  return (
    <div
      className={`${styles.overlay} fixed inset-0 z-[100] overflow-hidden bg-black`}
    >
      {/* 3D entity behind everything. Ein wrapper mit CSS-scale/translate
          schrumpft den orb und schiebt ihn oben-links, sobald eine
          konversation aktiv ist. Der three.js-canvas bleibt intern
          voll-aufgelöst — die skalierung ist rein visuell, damit der
          text-raum in der mitte frei wird. */}
      <div
        className={`${styles.entityWrapper} ${
          stageMinimized ? styles.entityMinimized : ""
        }`}
      >
        <AtlasEntity
          mode={mode}
          audioLevel={audioLevel}
          starsHidden={stageMinimized}
          onReady={(handle) => {
            entityHandle.current = handle;
          }}
        />
      </div>

      {/* Workspace Pinboard — inline overlay around the minimised orb,
          same visual stage as a chat conversation but with pinnable
          cards instead of a chat thread. ⌘5 toggles it. */}
      {workspaceOpen && (
        <WorkspacePinboardInline
          cards={workspaceCards}
          onAddCard={(c) =>
            setWorkspaceCards((prev) => [
              ...prev,
              {
                ...c,
                id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                createdAt: Date.now(),
              },
            ])
          }
          onRemoveCard={(id) =>
            setWorkspaceCards((prev) => prev.filter((c) => c.id !== id))
          }
          onClose={() => setWorkspaceOpen(false)}
        />
      )}

      {/* Phase AB-2 — Left-side action panels. Mirror the ContextPanel
          on the right; together with the centred orb they form a
          symmetric 3-column layout. Only one panel is rendered at any
          time (controlled by activePanel state), but all four mount
          unconditionally so their open/close transitions animate
          cleanly without remount flash. */}
      <MattersPanel
        open={activePanel === "matters"}
        onClose={() => setActivePanel(null)}
        onNavigate={navigateToMatter}
      />
      <InvitePanel
        open={activePanel === "invite"}
        onClose={() => setActivePanel(null)}
        onSuccess={handleInviteSuccess}
      />
      <MemoPanel
        open={activePanel === "memo"}
        onClose={() => setActivePanel(null)}
        onSubmitPrompt={submitPromptFromPanel}
      />
      <ComparePanel
        open={activePanel === "compare"}
        onClose={() => setActivePanel(null)}
        onSubmitPrompt={submitPromptFromPanel}
      />

      {/* Kontext-Panel (rechts) — Transparenz / Anti-Blackbox.
          Zeigt semantische Quellen aus dem Atlas-Corpus, live-
          zitate aus Claudes antwort, und modell-info. Versteckt
          sich unter 1280px screen width. */}
      <ContextPanel query={contextQuery} assistantText={contextAssistantText} />

      {/* ─ Top bar ─ */}
      {/* Brand-label oben-links wurde entfernt — in aktiver conversation
          sitzt da die mini-orb, und in idle ist die große orb mitte
          eindeutig genug. */}
      <div
        className={`${styles.topbar} fixed top-0 left-0 right-0 z-30 flex items-center justify-end px-6 py-4`}
      >
        <div className="flex items-center gap-2.5" data-atlas-menu>
          <button
            type="button"
            aria-label="Model"
            onClick={(e) => {
              e.stopPropagation();
              setModelMenuOpen((v) => !v);
              playSound("click");
            }}
            className={styles.glassBtn}
          >
            <span className={styles.modelDot} />
            <span>{modelName}</span>
            <svg className={styles.modelChev} viewBox="0 0 24 24">
              <path
                d="M6 9l6 6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Toggle sound"
            onClick={() => {
              setSoundOn((v) => !v);
              toast(!soundOn ? "Sound on" : "Sound off");
            }}
            className={`${styles.glassBtn} ${styles.glassBtnSquare}`}
          >
            <svg viewBox="0 0 24 24">
              <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinejoin="round" />
              {soundOn ? (
                <path
                  d="M15.5 8.5a4 4 0 010 7M19 5a8.5 8.5 0 010 14"
                  strokeLinecap="round"
                />
              ) : (
                <path d="M17 9l6 6M23 9l-6 6" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <button
            type="button"
            aria-label="Exit AI Mode"
            onClick={onClose}
            className={`${styles.glassBtn}`}
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
            <span>Classic</span>
          </button>
        </div>
      </div>

      {/* Model menu */}
      <div
        data-atlas-menu
        className={`${styles.menu} ${modelMenuOpen ? styles.menuOpen : ""}`}
      >
        {(Object.keys(MODELS) as ModelName[]).map((name) => (
          <div
            key={name}
            onClick={() => {
              setModelName(name);
              setModelMenuOpen(false);
              toast(`Switched to ${name}`);
              playSound("click");
            }}
            className={`${styles.menuItem} ${name === modelName ? styles.menuItemActive : ""}`}
          >
            <svg className="tick" viewBox="0 0 24 24">
              <path
                d="M5 12l5 5 9-11"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{name}</span>
            <span className="sub">{MODELS[name].label}</span>
          </div>
        ))}
      </div>

      {/* Conversation */}
      <div
        ref={conversationRef}
        className={`${styles.conversation} ${hasConversation ? styles.conversationActive : ""}`}
      >
        {messages.map((m, mi) => {
          // Phase 5 — pull the most recent prior USER message to hand
          // to the Library save button as `query` provenance.
          let priorUserText: string | undefined;
          if (m.role === "atlas") {
            for (let j = mi - 1; j >= 0; j--) {
              if (messages[j].role === "user") {
                priorUserText = messages[j].text;
                break;
              }
            }
          }
          return (
            <div
              key={m.id}
              className={`${styles.msg} ${m.role === "user" ? styles.msgUser : styles.msgAtlas} ${m.streaming ? styles.msgStreaming : ""}`}
            >
              {/* Tool-use transparency chips — rendered above the message
                text so users see what Atlas actually did (searches,
                navigations). Same pattern as ContextPanel's data-source
                chips, but scoped to this turn. */}
              {m.role === "atlas" && m.tools && m.tools.length > 0 && (
                <div className={styles.toolChips}>
                  {m.tools.map((t) => (
                    <span
                      key={t.id}
                      className={`${styles.toolChip} ${
                        t.isError
                          ? styles.toolChipError
                          : t.navigate
                            ? styles.toolChipNavigate
                            : t.completed
                              ? styles.toolChipDone
                              : styles.toolChipPending
                      }`}
                    >
                      <span className={styles.toolChipIcon}>
                        {t.isError
                          ? "⚠"
                          : t.navigate
                            ? "→"
                            : t.completed
                              ? "✓"
                              : "•"}
                      </span>
                      <span>{TOOL_LABEL[t.name] ?? t.name}</span>
                      {t.inputSummary && (
                        <span className={styles.toolChipArgs}>
                          · {t.inputSummary}
                        </span>
                      )}
                      {!t.completed && (
                        <span className={styles.toolChipDots}>…</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              {m.role === "atlas" ? (
                <AtlasMarkdown
                  text={m.text}
                  onAskAtlas={handleAskAtlasCitation}
                />
              ) : (
                m.text
              )}
              {/* Phase 5 — Library save chip on completed Atlas messages.
                Compact icon-only variant; sits inside the bubble at
                the bottom-right corner so it doesn't compete with
                the answer text or tool-trace chips above. */}
              {m.role === "atlas" &&
                !m.streaming &&
                m.text.trim().length > 30 && (
                  <div className={styles.msgLibraryAction}>
                    <LibrarySaveButton
                      variant="compact"
                      content={m.text}
                      query={priorUserText}
                      sourceKind="ATLAS_IDLE"
                    />
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Search area */}
      <form className={styles.search} onSubmit={handleSubmit}>
        {/* Attachments */}
        <div className={styles.attachments}>
          {attachments.map((file, i) => (
            <div key={`${file.name}-${i}`} className={styles.chipFile}>
              <svg viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>
                {file.name.length > 24
                  ? file.name.slice(0, 22) + "…"
                  : file.name}
              </span>
              <button
                type="button"
                aria-label="Remove"
                className={styles.chipRemove}
                onClick={() => {
                  setAttachments((prev) => prev.filter((_, j) => j !== i));
                  playSound("click");
                }}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Phase 1 — Welcome-Back Briefing. Sits above the suggestion
            chips, hidden once the user starts typing or a conversation
            begins. Component is self-contained: fetches its own data,
            handles its own dismissal via sessionStorage. */}
        <MorningBrief
          hidden={suggestionsHidden}
          onClick={() => playSound("click")}
          onCtaClose={onClose}
        />

        {/* Suggestions */}
        <div
          className={`${styles.suggestions} ${suggestionsHidden ? styles.suggestionsHidden : ""}`}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.chipSugg}
              onClick={() => {
                setInputValue(s);
                inputRef.current?.focus();
                playSound("click");
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Token meter — hidden in workspace mode (no chat input there). */}
        {!workspaceOpen && (
          <div className={styles.tokens} aria-hidden="true">
            <div
              key={tokenPulse}
              className={`${styles.tokenBar} ${styles.tokenPulse}`}
            >
              <div
                className={`${styles.tokenFill} ${tokenCrit ? styles.tokenFillCritical : tokenWarn ? styles.tokenFillWarning : ""}`}
                style={{ width: `${Math.max(0.6, tokenPct)}%` }}
              />
            </div>
            <div className={styles.tokensLabel}>
              <span className={styles.tokensCurrent}>
                {fmtTokens(currentTokens)}
              </span>
              <span className={styles.tokensSep}>/</span>
              <span className={styles.tokensMax}>
                {MODELS[modelName].label}
              </span>
            </div>
          </div>
        )}

        {/* Pill — hidden in workspace mode (workspace has its own
            composer for adding cards, doesn't need the chat input). */}
        <div
          className={`${styles.pill} ${pillHasText ? styles.pillHasText : ""}`}
          style={workspaceOpen ? { display: "none" } : undefined}
        >
          <button
            type="button"
            aria-label="Attach"
            className={styles.iconBtn}
            onClick={() => {
              fileInputRef.current?.click();
              playSound("click");
            }}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            placeholder="Frag Atlas."
            autoComplete="off"
            spellCheck={false}
            onChange={handleInputChange}
            onKeyDown={handleInputKey}
          />
          <div className={styles.actionSlot}>
            <button
              type="button"
              aria-label="Voice"
              onClick={() => (listening ? stopListening() : startListening())}
              className={`${styles.iconBtn} ${styles.actionSlotMic} ${listening ? styles.micListening : ""}`}
            >
              <svg viewBox="0 0 24 24">
                <rect
                  x="9"
                  y="4"
                  width="6"
                  height="11"
                  rx="3"
                  strokeLinejoin="round"
                />
                <path d="M6 11a6 6 0 0 0 12 0" strokeLinecap="round" />
                <path d="M12 17v4M9 21h6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="submit"
              aria-label="Submit"
              className={`${styles.iconBtn} ${styles.submitBtn} ${styles.actionSlotSubmit}`}
            >
              <svg viewBox="0 0 24 24">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Phase AB — Quick Actions row. Distinct from the suggestion
            chips above (which inject example QUESTIONS) — these are
            workflow VERBS: navigate to a matter list, fill the prompt
            with a memo template, etc. Hidden once a conversation is
            active or the user starts typing — the row is for the
            empty/idle state only. */}
        <div
          className={`${styles.quickActions} ${
            suggestionsHidden ? styles.quickActionsHidden : ""
          }`}
        >
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                className={styles.quickAction}
                onClick={() => runQuickAction(action)}
                aria-label={`${action.label} (⌘${action.kbd})`}
              >
                <span className={styles.quickActionIcon} aria-hidden="true">
                  <Icon size={14} strokeWidth={1.7} />
                </span>
                <span>{action.label}</span>
                <kbd className={styles.quickActionKbd} aria-hidden="true">
                  ⌘{action.kbd}
                </kbd>
              </button>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          onChange={(e) => {
            if (e.target.files) addAttachments(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </form>

      {/* P1-Compliance · KI-VO Art. 50 Transparenz-Hinweis. Persistent
          gerendert am unteren Bildschirmrand, sichtbar in idle UND
          aktiver Conversation. Klein gehalten — sollte den Lesefluss
          nicht stören, aber als Erinnerung an die Review-Pflicht
          immer präsent sein. */}
      <div className={styles.aiDisclosure}>
        Atlas ist eine KI-Assistenz. Beratungsmittel — keine Rechtsberatung. Vor
        Verwendung beim Mandanten prüfen.{" "}
        <a
          href="/legal/ai-disclosure"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.aiDisclosureLink}
        >
          Mehr
        </a>
      </div>

      {/* Command palette */}
      <div
        className={`${styles.cmdPalette} ${cmdOpen ? styles.cmdPaletteOpen : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setCmdOpen(false);
        }}
      >
        <div className={styles.cmdPanel}>
          <input
            ref={cmdInputRef}
            className={styles.cmdInput}
            type="text"
            value={cmdQuery}
            placeholder="Run a command…"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setCmdQuery(e.target.value)}
            onKeyDown={handleCmdKey}
          />
          <div className={styles.cmdList}>
            {filteredCmds.length === 0 ? (
              <div className={styles.cmdItem} style={{ opacity: 0.5 }}>
                Kein Treffer
              </div>
            ) : (
              filteredCmds.map((c, i) => (
                <div
                  key={c.name}
                  className={`${styles.cmdItem} ${i === cmdActiveIdx ? styles.cmdItemActive : ""}`}
                  onClick={() => runCmd(c)}
                  onMouseEnter={() => setCmdActiveIdx(i)}
                >
                  <span className={styles.cmdIco}>{c.icon}</span>/{c.name}
                  <span className={styles.cmdDesc}>{c.desc}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`${styles.toast} ${toastText ? styles.toastShow : ""}`}>
        {toastText}
      </div>

      {/* Welcome hint once per mount */}
      <WelcomeHint toast={toast} />
    </div>
  );
}

function WelcomeHint({ toast }: { toast: (m: string) => void }) {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    const id = setTimeout(
      () => toast("⌘K fokussieren · ⌘/ Commands · Prototyp · 0 Tokens"),
      1200,
    );
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
