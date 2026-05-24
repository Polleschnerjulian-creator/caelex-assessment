"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudOff,
} from "lucide-react";
import type { TradeOrgProfileView } from "@/lib/trade/settings/org-profile-service";
import { updateOrgProfile } from "@/lib/trade/settings/settings-actions";

interface Props {
  profile: TradeOrgProfileView;
}

const REGIMES = [
  { code: "BIS", label: "BIS — US Bureau of Industry & Security" },
  { code: "BAFA", label: "BAFA — German Federal Office for Economic Affairs" },
  { code: "DDTC", label: "DDTC — US Directorate of Defense Trade Controls" },
  { code: "ECJU", label: "ECJU — UK Export Control Joint Unit" },
] as const;

/**
 * Caelex Trade — Settings: Organization Profile tab.
 *
 * Form-driven view of the Trade-specific org profile. All fields are
 * optional; the operator fills them in over time as the export
 * programme onboards. Sensitive identifiers (BAFA contact e-mail,
 * EORI, DUNS+4) round-trip through the encryption boundary in the
 * service layer — this component only sees plaintext.
 *
 * Save uses a server action + `useTransition` so the button enters a
 * pending state without blocking the page. Field-level errors come
 * back via the `ActionResult` discriminated union.
 */
/** U-MED-1 — autosave debounce window. Long enough that we don't
 *  thrash the network on every keypress, short enough that the
 *  operator perceives the save as "automatic, no thinking required". */
const AUTOSAVE_DEBOUNCE_MS = 1500;

type AutosaveState =
  | { kind: "clean" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error" };

export function OrgProfileTab({ profile }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok" }
    | { kind: "error"; message: string; fields?: Record<string, string[]> }
    | null
  >(null);
  // Autosave state — separate from the explicit submit state so the
  // operator can still hit "Save changes" for an immediate write and
  // see classic submit feedback.
  const [autosave, setAutosave] = useState<AutosaveState>({ kind: "clean" });
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Build the canonical update payload from a FormData. Centralised so
   *  the explicit submit + debounced autosave produce identical writes. */
  const buildInput = useCallback((formData: FormData) => {
    const preferredRegimes = REGIMES.filter((r) =>
      formData.get(`regime-${r.code}`),
    ).map((r) => r.code);
    return {
      bafaContactName: (formData.get("bafaContactName") as string) || "",
      bafaContactRole: (formData.get("bafaContactRole") as string) || "",
      bafaContactPhone: (formData.get("bafaContactPhone") as string) || "",
      bafaContactEmail: (formData.get("bafaContactEmail") as string) || "",
      eoriNumber: (formData.get("eoriNumber") as string) || "",
      dunsPlus4: (formData.get("dunsPlus4") as string) || "",
      primaryExportJurisdiction:
        (formData.get("primaryExportJurisdiction") as string) || "",
      preferredRegimes,
    };
  }, []);

  /** Common save path used by both submit + debounced autosave. */
  const persist = useCallback(
    async (
      input: ReturnType<typeof buildInput>,
      via: "submit" | "autosave",
    ) => {
      if (via === "autosave") setAutosave({ kind: "saving" });
      const result = await updateOrgProfile(input);
      if (result.ok) {
        if (via === "submit") setFeedback({ kind: "ok" });
        setAutosave({ kind: "saved", at: Date.now() });
      } else {
        if (via === "submit") {
          setFeedback({
            kind: "error",
            message: result.error,
            fields: result.fieldErrors,
          });
        }
        setAutosave({ kind: "error" });
      }
    },
    [],
  );

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = buildInput(new FormData(e.currentTarget));
    startTransition(() => persist(input, "submit"));
  }

  /** Form-level onChange — bubbles up from every input + checkbox.
   *  Mark dirty + debounce the autosave call. */
  const onAnyChange = useCallback(() => {
    if (!formRef.current) return;
    setAutosave({ kind: "dirty" });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!formRef.current) return;
      const input = buildInput(new FormData(formRef.current));
      void persist(input, "autosave");
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [buildInput, persist]);

  // Cleanup any pending debounce when the component unmounts.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onChange={onAnyChange}
      className="space-y-6 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-6"
      aria-busy={isPending || autosave.kind === "saving"}
    >
      <Section
        title="BAFA primary contact"
        hint="Germany's export-control authority — the human at BAFA who Caelex / your auditor will reach if a licence question comes up."
      >
        <Grid>
          <Field
            name="bafaContactName"
            label="Contact name"
            defaultValue={profile.bafaContactName ?? ""}
            placeholder="e.g. Dr. Klaus Müller"
            autoComplete="name"
          />
          <Field
            name="bafaContactRole"
            label="Contact role"
            defaultValue={profile.bafaContactRole ?? ""}
            placeholder="e.g. Sachbearbeiter — Referat 222"
            autoComplete="organization-title"
          />
          <Field
            name="bafaContactPhone"
            label="Contact phone"
            defaultValue={profile.bafaContactPhone ?? ""}
            placeholder="+49 6196 ..."
            autoComplete="tel"
          />
          <Field
            name="bafaContactEmail"
            label="Contact e-mail"
            type="email"
            defaultValue={profile.bafaContactEmail ?? ""}
            placeholder="user@bafa.bund.de"
            autoComplete="email"
            error={
              feedback?.kind === "error"
                ? feedback.fields?.bafaContactEmail
                : undefined
            }
            encrypted
          />
        </Grid>
      </Section>

      <Section
        title="Customs & trade identifiers"
        hint="Encrypted at rest. Required for AEO and SAM.gov filings; populated lazily as compliance touches each programme."
      >
        <Grid>
          <Field
            name="eoriNumber"
            label="EORI number"
            defaultValue={profile.eoriNumber ?? ""}
            placeholder="e.g. DE123456789012345"
            autoComplete="off"
            encrypted
          />
          <Field
            name="dunsPlus4"
            label="US DUNS+4 number"
            defaultValue={profile.dunsPlus4 ?? ""}
            placeholder="13-digit identifier"
            autoComplete="off"
            encrypted
          />
        </Grid>
      </Section>

      <Section
        title="Jurisdiction & regime preferences"
        hint="Used to bias dashboards, report templates, and Sentinel monitoring towards the regimes you actually live with."
      >
        <div className="space-y-4">
          <div className="max-w-xs">
            <label
              htmlFor="primaryExportJurisdiction"
              className="mb-1 block text-[12px] font-medium text-trade-text-secondary"
            >
              Primary export jurisdiction
            </label>
            <input
              id="primaryExportJurisdiction"
              name="primaryExportJurisdiction"
              defaultValue={profile.primaryExportJurisdiction ?? ""}
              placeholder="ISO code — DE, FR, US…"
              maxLength={2}
              autoComplete="country"
              className="w-full rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:border-trade-accent focus:outline-none"
            />
          </div>

          <fieldset>
            <legend className="mb-2 block text-[12px] font-medium text-trade-text-secondary">
              Preferred export-control regimes
            </legend>
            <div className="space-y-2">
              {REGIMES.map((r) => (
                <label
                  key={r.code}
                  className="flex items-start gap-3 rounded-md border border-trade-border-subtle bg-trade-bg-page px-3 py-2 hover:border-trade-border-strong"
                >
                  <input
                    type="checkbox"
                    name={`regime-${r.code}`}
                    defaultChecked={profile.preferredRegimes.includes(r.code)}
                    className="mt-0.5 accent-trade-accent"
                  />
                  <span className="text-[13px] text-trade-text-primary">
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Section>

      <SaveBar isPending={isPending} feedback={feedback} autosave={autosave} />
    </form>
  );
}

// ─── Local helpers ─────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3">
        <h2 className="text-[15px] font-semibold text-trade-text-primary">
          {title}
        </h2>
        {hint && (
          <p className="mt-0.5 text-[12px] text-trade-text-muted">{hint}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
  );
}

interface FieldProps {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
  /** Render a small "Encrypted" badge — purely informational. */
  encrypted?: boolean;
  error?: string[];
  /** WCAG SC 1.3.5 — purpose-of-input. Passed through verbatim to the
   *  native input's autoComplete attr (e.g. "name", "email", "tel"). */
  autoComplete?: string;
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  encrypted,
  error,
  autoComplete,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 flex items-center gap-2 text-[12px] font-medium text-trade-text-secondary"
      >
        {label}
        {encrypted && (
          <span className="rounded-sm bg-trade-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-trade-accent-strong">
            Encrypted
          </span>
        )}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full rounded-md border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:outline-none ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-trade-border-subtle focus:border-trade-accent"
        }`}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-1 text-[11px] text-red-500"
        >
          {error.join(", ")}
        </p>
      )}
    </div>
  );
}

function SaveBar({
  isPending,
  feedback,
  autosave,
}: {
  isPending: boolean;
  feedback:
    | { kind: "ok" }
    | { kind: "error"; message: string; fields?: Record<string, string[]> }
    | null;
  autosave: AutosaveState;
}) {
  return (
    <div className="flex items-center justify-between border-t border-trade-border-subtle pt-4">
      <div className="flex items-center gap-3 text-[12px]">
        {/* Explicit-submit feedback takes precedence over autosave —
            the user pressed the button so we surface the result first. */}
        {feedback?.kind === "ok" && (
          <span className="inline-flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 size={14} aria-hidden="true" />
            Saved
          </span>
        )}
        {feedback?.kind === "error" && (
          <span
            role="alert"
            className="inline-flex items-center gap-1.5 text-red-500"
          >
            <AlertCircle size={14} aria-hidden="true" />
            {feedback.message}
          </span>
        )}
        {/* Autosave status — quiet ambient indicator (U-MED-1). */}
        {!feedback && <AutosaveIndicator state={autosave} />}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save size={14} aria-hidden="true" />
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

/** Tiny ambient indicator that reports the autosave state — dirty,
 *  saving, saved (with relative time), or error. Polite aria-live so
 *  screen-reader users hear "Saved" without an announcement storm. */
function AutosaveIndicator({ state }: { state: AutosaveState }) {
  // Re-render every minute so the "Saved 1 min ago" relative time
  // doesn't go stale when the user leaves the form open.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (state.kind !== "saved") return;
    const i = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, [state.kind]);

  let inner: React.ReactNode = null;
  if (state.kind === "dirty") {
    inner = (
      <>
        <CloudOff size={12} aria-hidden="true" />
        <span>Unsaved changes</span>
      </>
    );
  } else if (state.kind === "saving") {
    inner = (
      <>
        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        <span>Saving…</span>
      </>
    );
  } else if (state.kind === "saved") {
    inner = (
      <>
        <CheckCircle2 size={12} aria-hidden="true" />
        <span>Saved {relativeTime(state.at)}</span>
      </>
    );
  } else if (state.kind === "error") {
    inner = (
      <>
        <AlertCircle size={12} aria-hidden="true" />
        <span>Autosave failed — use Save changes</span>
      </>
    );
  }
  if (!inner) return null;
  return (
    <span
      aria-live="polite"
      className={`inline-flex items-center gap-1 text-trade-text-muted ${
        state.kind === "error" ? "text-amber-700" : ""
      }`}
    >
      {inner}
    </span>
  );
}

function relativeTime(timestamp: number): string {
  const elapsed = Date.now() - timestamp;
  if (elapsed < 5_000) return "just now";
  if (elapsed < 60_000) return `${Math.floor(elapsed / 1000)}s ago`;
  return `${Math.floor(elapsed / 60_000)} min ago`;
}
