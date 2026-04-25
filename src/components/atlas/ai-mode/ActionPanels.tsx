"use client";

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * ActionPanels — Phase AB-2 left-side panels for the Atlas idle screen.
 *
 * The Quick Actions row at the bottom (⌘1-⌘4) toggles a context panel
 * on the LEFT of the orb, mirroring the right-side ContextPanel that
 * already shows transparency / sources during a conversation. This
 * keeps lawyers inside the AI mode — they never lose Atlas context
 * just to look at a matter list, draft a memo, or invite a client.
 *
 * Four shipped panels:
 *   - MattersPanel  → live list of matters with search + status pills,
 *                     click to deep-link into the workspace pinboard
 *   - InvitePanel   → typeahead counterparty + matter form, POSTs to
 *                     /api/network/invite, default minimal-trust scope
 *   - MemoPanel     → title + content composer, submits as a structured
 *                     prompt to Atlas (which can then draft + iterate)
 *   - ComparePanel  → jurisdiction multi-select + topic, submits as a
 *                     structured compare prompt to Atlas
 *
 * Each panel takes care of its own data fetching + form state. The
 * shared `ActionPanel` shell handles the open/close animation,
 * header chrome, and ESC key.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Search,
  X,
  Loader2,
  ArrowRight,
  Building2,
  Sparkles,
  Check,
  AlertTriangle,
} from "lucide-react";
import styles from "./ai-mode.module.css";

// ─── Types ────────────────────────────────────────────────────────

export type ActionPanelKey = "matters" | "invite" | "memo" | "compare";

interface PanelShellProps {
  open: boolean;
  /** Tag-style label rendered uppercase with wide tracking, matching
   *  the right-side ContextPanel header pattern (KONTEXT · Atlas-
   *  Transparenz). Keep this short — one or two words. */
  tag: string;
  /** Subtitle next to the tag, rendered small and muted. Optional. */
  sub?: string;
  /** Optional explanatory text below the header bar — for panels
   *  that need a sentence of orientation (Memo composer, Compare). */
  intro?: string;
  onClose: () => void;
  children: ReactNode;
}

// ─── Shared shell ─────────────────────────────────────────────────
//
// Visual language matched to ContextPanel on the right side: glass
// surface (translucent, blurred, faint inset highlight), tag-style
// uppercase header, subdued body type. No icon in the header — the
// quick-action buttons below the search bar carry the iconography;
// re-stating it in the panel header would be duplicate noise.
//
// Animation: slide-in from the left with a slight scale-up so the
// panel "lands" rather than slips. Mirrors the right ContextPanel's
// own opening curve.

function ActionPanelShell({
  open,
  tag,
  sub,
  intro,
  onClose,
  children,
}: PanelShellProps) {
  // ESC closes — listen at window level so we catch it even if focus
  // is somewhere else (e.g. the AI input). Capture phase + stopProp
  // prevents AIMode's window-level ESC handler from also firing and
  // closing the entire overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKey, { capture: true });
  }, [open, onClose]);

  return (
    <aside
      className={`${styles.actionPanel} ${open ? styles.actionPanelOpen : ""}`}
      aria-hidden={!open}
    >
      <header className={styles.actionPanelHeader}>
        <span className={styles.actionPanelTag}>{tag}</span>
        {sub && <span className={styles.actionPanelSub}>{sub}</span>}
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className={styles.actionPanelClose}
        >
          <X size={12} strokeWidth={1.7} />
        </button>
      </header>
      {intro && <p className={styles.actionPanelIntro}>{intro}</p>}
      <div className={styles.actionPanelBody}>{children}</div>
    </aside>
  );
}

// ─── MattersPanel ─────────────────────────────────────────────────

interface MatterRow {
  id: string;
  name: string;
  reference: string | null;
  status: string;
  client: { id: string; name: string; logoUrl: string | null };
  lawFirm: { id: string; name: string; logoUrl: string | null };
  accessCount: number;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_INVITE: "Eingeladen",
  PENDING_CONSENT: "Wartet",
  ACTIVE: "Aktiv",
  SUSPENDED: "Pausiert",
  CLOSED: "Geschlossen",
  REVOKED: "Widerrufen",
};
const STATUS_DOT: Record<string, string> = {
  PENDING_INVITE: "bg-amber-400",
  PENDING_CONSENT: "bg-blue-400",
  ACTIVE: "bg-emerald-400",
  SUSPENDED: "bg-slate-400",
  CLOSED: "bg-slate-500",
  REVOKED: "bg-red-400",
};

export function MattersPanel({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (matterId: string) => void;
}) {
  const [matters, setMatters] = useState<MatterRow[] | null>(null);
  const [errorState, setErrorState] = useState<{
    status: number;
    raw: string;
  } | null>(null);
  const [callerSide, setCallerSide] = useState<"ATLAS" | "CAELEX" | null>(null);
  const [query, setQuery] = useState("");

  // Fetch on open. Re-fetch if the panel re-opens (matters list might
  // have changed since last view — new invites, status changes).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/network/matters", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          // Phase 3 hardening — surface the server's diagnostic detail
          // when present so 500s don't read as opaque "Failed to load"
          // sentences. The /api/network/matters route now emits
          // { error, code, detail } where code is the JS error.name
          // and detail is the raw message.
          const parts = [
            typeof json.error === "string" ? json.error : `HTTP ${res.status}`,
            typeof json.code === "string" ? json.code : null,
            typeof json.detail === "string" ? json.detail : null,
          ].filter(Boolean);
          setErrorState({
            status: res.status,
            raw: parts.join(" — "),
          });
          return;
        }
        setErrorState(null);
        setMatters(json.matters ?? []);
        setCallerSide(json.callerSide ?? null);
      } catch (err) {
        if (!cancelled) {
          setErrorState({ status: 0, raw: (err as Error).message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Diagnostic-friendly error message. Branches on HTTP status so the
  // lawyer (and dev) sees what actually went wrong, not a generic
  // "couldn't load" smokescreen. The raw upstream message stays
  // visible as a small monospace tag for quick triage.
  const displayError = useMemo(() => {
    if (!errorState) return null;
    const { status, raw } = errorState;
    if (status === 401) {
      return {
        msg: "Sitzung abgelaufen — bitte Seite neu laden.",
        tag: `401 · ${raw}`,
      };
    }
    if (status === 403) {
      return {
        msg: "Dein Account ist keiner Kanzlei zugeordnet. Admin fragen.",
        tag: `403 · ${raw}`,
      };
    }
    if (status === 500) {
      // Try to pluck the diagnostic detail from the new shape the
      // server emits (code + detail). Falls back to raw if the panel
      // is hitting an older deployment.
      return {
        msg: "Server-Fehler beim Laden der Mandate.",
        tag: `500 · ${raw}`,
      };
    }
    if (status === 0) {
      return { msg: "Netzwerk nicht erreichbar.", tag: raw };
    }
    return { msg: raw, tag: `HTTP ${status}` };
  }, [errorState]);

  const filtered = useMemo(() => {
    if (!matters) return null;
    const q = query.trim().toLowerCase();
    if (!q) return matters;
    return matters.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.reference?.toLowerCase().includes(q) ?? false) ||
        m.client.name.toLowerCase().includes(q) ||
        m.lawFirm.name.toLowerCase().includes(q),
    );
  }, [matters, query]);

  return (
    <ActionPanelShell
      open={open}
      tag="Mandate"
      sub={
        matters
          ? `${matters.length} insgesamt · ${
              matters.filter((m) => m.status === "ACTIVE").length
            } aktiv`
          : undefined
      }
      onClose={onClose}
    >
      {/* Search */}
      <div className={styles.panelSearchRow}>
        <Search
          size={12}
          strokeWidth={1.7}
          className={styles.panelSearchIcon}
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche…"
          className={styles.panelSearchInput}
          autoFocus={open}
        />
      </div>

      {/* States */}
      {displayError && (
        <div className={styles.panelError}>
          <AlertTriangle size={11} strokeWidth={1.7} />
          <span className={styles.panelErrorMsg}>{displayError.msg}</span>
          <code className={styles.panelErrorTag}>{displayError.tag}</code>
        </div>
      )}
      {!displayError && !matters && (
        <div className={styles.panelLoading}>Lade Mandate…</div>
      )}
      {matters && filtered && filtered.length === 0 && (
        <div className={styles.panelEmpty}>
          {query
            ? "Kein Treffer. Suche anpassen oder neuen Mandanten einladen."
            : "Noch keine Mandate. Lade einen Mandanten ein, um zu starten."}
        </div>
      )}

      {/* List */}
      {filtered && filtered.length > 0 && (
        <ul className={styles.panelList}>
          {filtered.map((m) => {
            // Atlas side renders the CLIENT (operator) name as the
            // counterparty. Caelex side renders the lawFirm. We
            // shipped this panel for atlas-idle so callerSide=ATLAS,
            // but defensive code in case it gets reused operator-side.
            const counterparty = callerSide === "CAELEX" ? m.lawFirm : m.client;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  className={styles.panelMatterRow}
                  onClick={() => onNavigate(m.id)}
                >
                  <div className={styles.panelMatterStatus}>
                    <span
                      className={`${styles.panelMatterDot} ${
                        STATUS_DOT[m.status] ?? "bg-slate-400"
                      }`}
                    />
                  </div>
                  <div className={styles.panelMatterMain}>
                    <div className={styles.panelMatterNameRow}>
                      <span className={styles.panelMatterName}>{m.name}</span>
                      {m.reference && (
                        <span className={styles.panelMatterRef}>
                          · {m.reference}
                        </span>
                      )}
                    </div>
                    <div className={styles.panelMatterMeta}>
                      <span>{counterparty.name}</span>
                      <span className={styles.panelMatterMetaDot}>·</span>
                      <span>{STATUS_LABEL[m.status] ?? m.status}</span>
                      <span className={styles.panelMatterMetaDot}>·</span>
                      <span>
                        {new Date(m.updatedAt).toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={12}
                    strokeWidth={1.7}
                    className={styles.panelMatterChev}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </ActionPanelShell>
  );
}

// ─── InvitePanel ──────────────────────────────────────────────────

interface OrgHit {
  id: string;
  name: string;
  slug: string | null;
  logoUrl: string | null;
}

const DEFAULT_DURATION_MONTHS = 12;

// Sensible default scope — minimal trust pattern. Lawyer can refine
// later via the lifecycle/scope-amend flow on the matter detail page.
// READ_SUMMARY (not full READ) on COMPLIANCE so overviews flow through
// without exposing per-question answers; READ on DOCUMENTS so the
// firm can list + open files but EXPORT requires explicit amendment.
const DEFAULT_SCOPE = [
  { category: "COMPLIANCE_ASSESSMENTS", permissions: ["READ_SUMMARY"] },
  { category: "DOCUMENTS", permissions: ["READ"] },
];

export function InvitePanel({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (matterId: string) => void;
}) {
  const [counterpartyQuery, setCounterpartyQuery] = useState("");
  const [counterpartyHits, setCounterpartyHits] = useState<OrgHit[]>([]);
  const [counterparty, setCounterparty] = useState<OrgHit | null>(null);
  const [name, setName] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(DEFAULT_DURATION_MONTHS);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset all state when panel opens cleanly. Avoids stale form bleed
  // if lawyer cancels then re-opens.
  useEffect(() => {
    if (open) {
      setCounterpartyQuery("");
      setCounterpartyHits([]);
      setCounterparty(null);
      setName("");
      setReference("");
      setDescription("");
      setDuration(DEFAULT_DURATION_MONTHS);
      setSubmitError(null);
    }
  }, [open]);

  // Debounced typeahead. 220ms feels responsive without machine-gunning
  // the API; 2-char minimum prevents 1-letter wildcard fetches.
  useEffect(() => {
    if (!open) return;
    if (counterparty) return; // user already picked, freeze typeahead
    const q = counterpartyQuery.trim();
    if (q.length < 2) {
      setCounterpartyHits([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/atlas/organizations/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (res.ok) setCounterpartyHits(json.organizations ?? []);
      } catch {
        // Silent — typeahead is best-effort. The user can still
        // proceed once they pick something or surface a real error
        // at submit time.
      }
    }, 220);
    return () => clearTimeout(t);
  }, [counterpartyQuery, counterparty, open]);

  const canSubmit =
    counterparty !== null && name.trim().length >= 3 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!counterparty || name.trim().length < 3 || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/network/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counterpartyOrgId: counterparty.id,
          name: name.trim(),
          reference: reference.trim() || undefined,
          description: description.trim() || undefined,
          proposedScope: DEFAULT_SCOPE,
          proposedDurationMonths: duration,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Einladung fehlgeschlagen");
      }
      onSuccess(json.matter?.id ?? json.matterId ?? "");
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ActionPanelShell
      open={open}
      tag="Einladen"
      sub="Mandant + Mandat"
      intro="Voreingestellt: lesender Zugriff auf Übersicht + Dokumente. Scope kannst du später verfeinern."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className={styles.panelForm}>
        {/* Counterparty typeahead */}
        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>Mandant</label>
          {counterparty ? (
            <div className={styles.panelChosenOrg}>
              <Building2 size={12} strokeWidth={1.7} />
              <span>{counterparty.name}</span>
              <button
                type="button"
                onClick={() => {
                  setCounterparty(null);
                  setCounterpartyQuery("");
                }}
                className={styles.panelChosenOrgClear}
                aria-label="Andere Organisation wählen"
              >
                <X size={10} strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={counterpartyQuery}
                onChange={(e) => setCounterpartyQuery(e.target.value)}
                placeholder="Name der Organisation eingeben…"
                className={styles.panelFormInput}
                autoComplete="off"
              />
              {counterpartyHits.length > 0 && (
                <ul className={styles.panelTypeahead}>
                  {counterpartyHits.map((org) => (
                    <li key={org.id}>
                      <button
                        type="button"
                        className={styles.panelTypeaheadItem}
                        onClick={() => {
                          setCounterparty(org);
                          setCounterpartyQuery(org.name);
                        }}
                      >
                        <Building2 size={11} strokeWidth={1.7} />
                        {org.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Matter name */}
        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>Mandatsname</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Spektrum-Lizenzierung 2026"
            className={styles.panelFormInput}
            maxLength={200}
          />
        </div>

        {/* Reference */}
        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>Referenz (optional)</label>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Interne Mandatsnummer"
            className={styles.panelFormInput}
            maxLength={50}
          />
        </div>

        {/* Description */}
        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>
            Notiz (optional, sieht der Mandant)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung für den Mandanten…"
            className={styles.panelFormTextarea}
            maxLength={2000}
            rows={3}
          />
        </div>

        {/* Duration */}
        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>Laufzeit</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={styles.panelFormInput}
          >
            <option value={6}>6 Monate</option>
            <option value={12}>12 Monate</option>
            <option value={24}>24 Monate</option>
          </select>
        </div>

        {submitError && (
          <div className={styles.panelError}>
            <AlertTriangle size={11} strokeWidth={1.7} /> {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className={styles.panelSubmitBtn}
        >
          {submitting ? (
            <>
              <Loader2 size={12} strokeWidth={1.8} className="animate-spin" />
              Sende Einladung…
            </>
          ) : (
            <>
              <Check size={12} strokeWidth={1.8} />
              Einladung senden
            </>
          )}
        </button>
      </form>
    </ActionPanelShell>
  );
}

// ─── MemoPanel ────────────────────────────────────────────────────

export function MemoPanel({
  open,
  onClose,
  onSubmitPrompt,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitPrompt: (prompt: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [outline, setOutline] = useState("");
  const [matter, setMatter] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setOutline("");
      setMatter("");
      setTimeout(() => titleRef.current?.focus(), 350);
    }
  }, [open]);

  const canSubmit = title.trim().length >= 3;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    // Format the structured input as a clear instruction so Atlas
    // produces a memo, not a chat reply. This is the value over a
    // raw prompt-inject: lawyer fills three fields, Atlas gets a
    // grounded three-part instruction.
    const parts: string[] = [];
    parts.push(
      `Verfasse ein juristisches Memo mit dem Titel: „${title.trim()}".`,
    );
    if (matter.trim()) parts.push(`Mandat / Kontext: ${matter.trim()}.`);
    if (outline.trim())
      parts.push(`Inhaltliche Schwerpunkte:\n${outline.trim()}`);
    parts.push(
      "Nutze Caelex- und EU-Quellen. Strukturiere mit Überschriften und nummerierten Begründungen.",
    );
    onSubmitPrompt(parts.join("\n\n"));
  }

  return (
    <ActionPanelShell
      open={open}
      tag="Memo"
      sub="Atlas verfasst"
      intro="Du gibst Titel, Kontext und Schwerpunkte vor — Atlas formt das Memo."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className={styles.panelForm}>
        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>Titel</label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Haftungsfragen NIS2 für KMU-Operatoren"
            className={styles.panelFormInput}
            maxLength={200}
          />
        </div>

        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>
            Mandat / Kontext (optional)
          </label>
          <input
            type="text"
            value={matter}
            onChange={(e) => setMatter(e.target.value)}
            placeholder="Mandantenname oder Aktenkürzel"
            className={styles.panelFormInput}
            maxLength={200}
          />
        </div>

        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>
            Schwerpunkte (optional)
          </label>
          <textarea
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="- Geltungsbereich&#10;- Pflichten Geschäftsleitung&#10;- Sanktionen"
            className={styles.panelFormTextarea}
            maxLength={2000}
            rows={5}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={styles.panelSubmitBtn}
        >
          <Sparkles size={12} strokeWidth={1.8} />
          Atlas verfasst Memo
        </button>

        {/* P1-Compliance · KI-VO Art. 50 + § 43a BRAO Reminder.
            Memo-Drafts sind KI-Output und tragen Review-Pflicht;
            erscheinen im Pinboard mit "KI"-Badge. */}
        <p className={styles.panelLegalNote}>
          Atlas-generierte Memos sind anwaltliche Hilfsmittel — vor Verwendung
          beim Mandanten zu prüfen und freizugeben (§ 43a Abs. 2 BRAO). Im
          Pinboard kenntlich gemacht durch ein KI-Badge.
        </p>
      </form>
    </ActionPanelShell>
  );
}

// ─── ComparePanel ─────────────────────────────────────────────────

const JURISDICTIONS: Array<{ code: string; label: string }> = [
  { code: "DE", label: "Deutschland" },
  { code: "FR", label: "Frankreich" },
  { code: "IT", label: "Italien" },
  { code: "ES", label: "Spanien" },
  { code: "NL", label: "Niederlande" },
  { code: "BE", label: "Belgien" },
  { code: "LU", label: "Luxemburg" },
  { code: "AT", label: "Österreich" },
  { code: "PL", label: "Polen" },
  { code: "SE", label: "Schweden" },
  { code: "FI", label: "Finnland" },
  { code: "UK", label: "UK" },
];

export function ComparePanel({
  open,
  onClose,
  onSubmitPrompt,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitPrompt: (prompt: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const topicRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setSelected([]);
      setTopic("");
      setTimeout(() => topicRef.current?.focus(), 350);
    }
  }, [open]);

  const toggle = useCallback((code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }, []);

  const canSubmit = selected.length >= 2 && topic.trim().length >= 3;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    // Structured prompt — explicit jurisdictions + topic so Atlas
    // routes through compare_jurisdictions tool deterministically.
    const codes = selected.join(", ");
    const prompt = `Jurisdiktionen vergleichen: ${codes}. Thema: ${topic.trim()}.\n\nGib eine strukturierte Tabelle (eine Zeile pro Jurisdiktion) und schließe mit einer kurzen Synthese der wichtigsten Unterschiede.`;
    onSubmitPrompt(prompt);
  }

  return (
    <ActionPanelShell
      open={open}
      tag="Vergleich"
      sub="Jurisdiktionen"
      intro="Mindestens zwei Jurisdiktionen auswählen, dann Thema beschreiben."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className={styles.panelForm}>
        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>
            Jurisdiktionen{" "}
            <span className={styles.panelFormHint}>
              ({selected.length} gewählt)
            </span>
          </label>
          <div className={styles.panelCountryGrid}>
            {JURISDICTIONS.map((j) => {
              const active = selected.includes(j.code);
              return (
                <button
                  key={j.code}
                  type="button"
                  onClick={() => toggle(j.code)}
                  className={`${styles.panelCountryChip} ${
                    active ? styles.panelCountryChipActive : ""
                  }`}
                  aria-pressed={active}
                >
                  <span className={styles.panelCountryCode}>{j.code}</span>
                  <span className={styles.panelCountryLabel}>{j.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.panelFormField}>
          <label className={styles.panelFormLabel}>Thema</label>
          <textarea
            ref={topicRef}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="z.B. Genehmigungspflicht für ISOs unter EU Space Act"
            className={styles.panelFormTextarea}
            maxLength={500}
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className={styles.panelSubmitBtn}
        >
          <Sparkles size={12} strokeWidth={1.8} />
          Atlas vergleicht
        </button>
      </form>
    </ActionPanelShell>
  );
}
