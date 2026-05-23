"use client";

import { useState, useTransition } from "react";
import { Save, CheckCircle2, AlertCircle } from "lucide-react";
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
export function OrgProfileTab({ profile }: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok" }
    | { kind: "error"; message: string; fields?: Record<string, string[]> }
    | null
  >(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const preferredRegimes = REGIMES.filter((r) =>
      formData.get(`regime-${r.code}`),
    ).map((r) => r.code);

    const input = {
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

    startTransition(async () => {
      const result = await updateOrgProfile(input);
      if (result.ok) {
        setFeedback({ kind: "ok" });
      } else {
        setFeedback({
          kind: "error",
          message: result.error,
          fields: result.fieldErrors,
        });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-xl border border-trade-border-subtle bg-trade-bg-elevated px-6 py-6"
      aria-busy={isPending}
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
          />
          <Field
            name="bafaContactRole"
            label="Contact role"
            defaultValue={profile.bafaContactRole ?? ""}
            placeholder="e.g. Sachbearbeiter — Referat 222"
          />
          <Field
            name="bafaContactPhone"
            label="Contact phone"
            defaultValue={profile.bafaContactPhone ?? ""}
            placeholder="+49 6196 ..."
          />
          <Field
            name="bafaContactEmail"
            label="Contact e-mail"
            type="email"
            defaultValue={profile.bafaContactEmail ?? ""}
            placeholder="user@bafa.bund.de"
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
            encrypted
          />
          <Field
            name="dunsPlus4"
            label="US DUNS+4 number"
            defaultValue={profile.dunsPlus4 ?? ""}
            placeholder="13-digit identifier"
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

      <SaveBar isPending={isPending} feedback={feedback} />
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
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  encrypted,
  error,
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
        className={`w-full rounded-md border bg-trade-bg-page px-3 py-2 text-[13px] text-trade-text-primary placeholder:text-trade-text-muted focus:outline-none ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-trade-border-subtle focus:border-trade-accent"
        }`}
        aria-invalid={!!error}
      />
      {error && (
        <p className="mt-1 text-[11px] text-red-500">{error.join(", ")}</p>
      )}
    </div>
  );
}

function SaveBar({
  isPending,
  feedback,
}: {
  isPending: boolean;
  feedback:
    | { kind: "ok" }
    | { kind: "error"; message: string; fields?: Record<string, string[]> }
    | null;
}) {
  return (
    <div className="flex items-center justify-between border-t border-trade-border-subtle pt-4">
      <div className="text-[12px]">
        {feedback?.kind === "ok" && (
          <span className="inline-flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 size={14} />
            Saved
          </span>
        )}
        {feedback?.kind === "error" && (
          <span className="inline-flex items-center gap-1.5 text-red-500">
            <AlertCircle size={14} />
            {feedback.message}
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md bg-trade-accent px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-trade-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Save size={14} />
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
