"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * AIMode — full-screen Atlas AI overlay.
 *
 * VISUAL PROTOTYPE. No backend, no LLM calls, no token spend.
 * Submits run a fake streaming response so the whole interaction
 * loop (entity reaction → stream → token-meter → shockwave →
 * settle) can be evaluated end-to-end in-browser.
 *
 * Composition:
 *   AtlasEntity          → the Three.js scene behind the UI
 *   Command palette      → ⌘/ or slash-first input
 *   Model switcher       → visual only, no runtime effect
 *   Mic                  → real WebAudio analyser (listening mode)
 *   Sound                → WebAudio blips on interactions
 *   Attachments          → dropzone + button, chips in the search bar
 *   Conversation         → faux stream, fades behind the input
 *
 * Replacement plan: when we wire real agents, only `runResponse`
 * needs to change — the rest of the UX stays the same.
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
import {
  AtlasEntity,
  type AtlasEntityHandle,
  type AtlasMode,
} from "./AtlasEntity";
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

const FAKE_RESPONSES = [
  "Gute Frage. Drei Punkte sind dabei relevant — die Rechtsgrundlage, die Zuständigkeit und die Frist. Ich ziehe gleich die Paragraphen.",
  "Das ist eine mehrstufige Prüfung. Erst Art. VI OST als Dach, dann das nationale Genehmigungsrecht, zuletzt die Spectrum-Koordination.",
  "Spannender Fall. Der sauberste Weg ist eine Matrix: Jurisdiktion × Anwendungsbereich × Frist. Lass mich das aufstellen.",
  "Vorab: die Regelung im EU Space Act greift, aber es gibt einen Delegated Act (Annex II), der die konkrete Compliance-Schwelle definiert.",
  "Zwei relevante Präzedenzfälle aus unserer Matter-History — beide mit ähnlicher Struktur. Ich vergleiche Tenor und Regulator-Reaktion.",
];

function fmtTokens(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 10000) return `${(n / 1000).toFixed(2)}k`;
  if (n < 100000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1000000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Types ─────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  role: "user" | "atlas";
  text: string;
  streaming?: boolean;
}

interface AIModeProps {
  open: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────

export function AIMode({ open, onClose }: AIModeProps) {
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
      if (e.key === "Escape") {
        if (cmdOpen) {
          setCmdOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cmdOpen, onClose]);

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

  // ── Submit / Fake response ─────────────────────────────────
  const runResponse = useCallback(
    async (_prompt: string) => {
      setMode("thinking");
      await sleep(700 + Math.random() * 500);
      playSound("chime");
      const id = `m-${Date.now()}-atlas`;
      setMessages((prev) => [
        ...prev,
        { id, role: "atlas", text: "", streaming: true },
      ]);
      setMode("speaking");
      const text =
        FAKE_RESPONSES[Math.floor(Math.random() * FAKE_RESPONSES.length)];
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        await sleep(40 + Math.random() * 90);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  text: m.text + (i === 0 ? "" : " ") + words[i],
                }
              : m,
          ),
        );
        setTotalTokens((n) => Math.min(maxTokens, n + 1));
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, streaming: false } : m)),
      );
      setMode("idle");
    },
    [maxTokens, playSound],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text) return;
      const userId = `m-${Date.now()}-user`;
      setMessages((prev) => [...prev, { id: userId, role: "user", text }]);
      const typedTokens = Math.floor(inputValue.length / 3.2);
      const attachmentCost = attachments.length * 400;
      setTotalTokens((n) =>
        Math.min(maxTokens, n + typedTokens + attachmentCost),
      );
      setInputValue("");
      setTokenPulse((n) => n + 1);
      entityHandle.current?.bumpEnergy(0.9);
      entityHandle.current?.triggerShockwave();
      playSound("whoosh");
      runResponse(text);
    },
    [attachments.length, inputValue, maxTokens, playSound, runResponse],
  );

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

  const suggestionsHidden = messages.length > 0 || inputValue.length > 0;
  const pillHasText = inputValue.length > 0;

  return (
    <div
      className={`${styles.overlay} fixed inset-0 z-[100] overflow-hidden bg-black`}
    >
      {/* 3D entity behind everything */}
      <AtlasEntity
        mode={mode}
        audioLevel={audioLevel}
        onReady={(handle) => {
          entityHandle.current = handle;
        }}
      />

      {/* ─ Top bar ─ */}
      <div
        className={`${styles.topbar} fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4`}
      >
        <div className={styles.brand}>ATLAS</div>
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
      <div ref={conversationRef} className={styles.conversation}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`${styles.msg} ${m.role === "user" ? styles.msgUser : styles.msgAtlas} ${m.streaming ? styles.msgStreaming : ""}`}
          >
            {m.text}
          </div>
        ))}
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

        {/* Token meter */}
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
            <span className={styles.tokensMax}>{MODELS[modelName].label}</span>
          </div>
        </div>

        {/* Pill */}
        <div
          className={`${styles.pill} ${pillHasText ? styles.pillHasText : ""}`}
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
