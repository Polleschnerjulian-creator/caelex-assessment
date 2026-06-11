"use client";

/**
 * Erfassungs-Dialoge für Kontakte + Firmen (CRM Phase 1, Bulk in Phase 4).
 *
 * Zwei Modi pro Dialog:
 *  - "Einzeln": das bekannte Formular. Neu: "Speichern & weitere" legt an,
 *    leert das Formular und lässt den Dialog offen (Zähler zeigt Fortschritt).
 *  - "Mehrere auf einmal": großes Textfeld, EINE Zeile pro Datensatz,
 *    Spalten getrennt per `|`, Tab oder `;` (pro Zeile wird das erste
 *    gefundene Trennzeichen genutzt — Excel-Copy-Paste liefert Tabs).
 *    Live-Vorschau zeigt, was erkannt wurde, BEVOR etwas gespeichert wird.
 *    Submit geht an die idempotenten Bulk-Endpoints — doppelt einfügen ist
 *    sicher, Vorhandenes wird übersprungen und im Ergebnis aufgelistet.
 *
 * Nach Bulk-Erfolg wird NICHT navigiert: das Ergebnis bleibt im Dialog
 * sichtbar, "Fertig" aktualisiert die Liste (router.refresh).
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-caption font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-body focus:outline-none focus:ring-1"
        style={{
          background: "var(--surface-sunken)",
          borderColor: "var(--border-default)",
          color: "var(--text-primary)",
        }}
      />
    </label>
  );
}

function DialogShell({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-xl border p-5 shadow-xl`}
        style={{
          background: "var(--surface-base, var(--surface-raised))",
          borderColor: "var(--border-default)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title font-medium text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-md p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modus-Umschalter: Einzeln | Mehrere auf einmal                      */
/* ------------------------------------------------------------------ */

type CaptureMode = "single" | "bulk";

function ModeTabs({
  mode,
  onChange,
}: {
  mode: CaptureMode;
  onChange: (m: CaptureMode) => void;
}) {
  const tab = (m: CaptureMode, label: string) => (
    <button
      type="button"
      onClick={() => onChange(m)}
      className={`rounded-md px-3 py-1.5 text-small font-medium transition-colors ${
        mode === m ? "" : "opacity-60 hover:opacity-100"
      }`}
      style={
        mode === m
          ? {
              background: "var(--surface-sunken)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }
          : { color: "var(--text-tertiary)" }
      }
      aria-pressed={mode === m}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-3 flex gap-1.5">
      {tab("single", "Einzeln")}
      {tab("bulk", "Mehrere auf einmal")}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toleranter Zeilen-Parser für den Bulk-Modus                         */
/* ------------------------------------------------------------------ */

const BULK_CAP = 100;
const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Pro Zeile das erste vorhandene Trennzeichen nutzen: `|`, Tab oder `;`. */
function splitLine(line: string): string[] {
  const sep = line.includes("|") ? "|" : line.includes("\t") ? "\t" : ";";
  return line.split(sep).map((c) => c.trim());
}

/** Nicht-leere Zeilen in Zellen zerlegen; Zeilen ohne Namen zählen als ignoriert. */
function parseBulkText(text: string): { rows: string[][]; ignored: number } {
  const rows: string[][] = [];
  let ignored = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const cells = splitLine(raw);
    if (!cells[0]) {
      ignored++;
      continue;
    }
    rows.push(cells);
  }
  return { rows, ignored };
}

type BulkResult = { created: number; skipped: string[] };

/** Mini-Vorschau: die ersten 5 erkannten Zeilen als Tabelle. */
function BulkPreviewTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  const shown = rows.slice(0, 5);
  return (
    <div
      className="overflow-x-auto rounded-lg border"
      style={{ borderColor: "var(--border-default)" }}
    >
      <table className="w-full text-small">
        <thead>
          <tr className="text-left text-caption uppercase tracking-wider text-[var(--text-tertiary)]">
            {headers.map((h) => (
              <th key={h} className="px-2 py-1.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((cells, i) => (
            <tr
              key={i}
              className="border-t"
              style={{ borderColor: "var(--border-default)" }}
            >
              {headers.map((_, col) => (
                <td
                  key={col}
                  className="max-w-[180px] truncate px-2 py-1.5 text-[var(--text-secondary)]"
                >
                  {cells[col] || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 5 ? (
        <p className="px-2 py-1.5 text-caption text-[var(--text-tertiary)]">
          … und {rows.length - 5} weitere
        </p>
      ) : null}
    </div>
  );
}

/** Ergebnis-Anzeige nach dem Bulk-Submit (kein Navigieren — Liste erst per "Fertig"). */
function BulkResultPanel({
  result,
  noun,
  onMore,
  onDone,
}: {
  result: BulkResult;
  noun: string;
  onMore: () => void;
  onDone: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-500" />
        <div className="text-body text-[var(--text-primary)]">
          <p className="font-medium">
            {result.created} {noun} angelegt
            {result.skipped.length > 0
              ? `, ${result.skipped.length} übersprungen (bereits vorhanden)`
              : ""}
            .
          </p>
          {result.skipped.length > 0 ? (
            <p className="mt-1 text-small text-[var(--text-tertiary)]">
              Übersprungen: {result.skipped.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onMore}
          className="rounded-md px-3 py-1.5 text-small text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          Weitere einfügen
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-3 py-1.5 text-small font-medium"
          style={{ background: "var(--accent-primary)", color: "white" }}
        >
          Fertig
        </button>
      </div>
    </div>
  );
}

/** Gemeinsames Bulk-Textfeld inkl. Live-Vorschau + Submit. */
function BulkCapture({
  placeholder,
  formatHint,
  headers,
  noun,
  extraHint,
  busy,
  text,
  onTextChange,
  onSubmit,
  error,
}: {
  placeholder: string;
  formatHint: string;
  headers: string[];
  noun: string;
  /** Optionale Zusatz-Zeile unter dem Zähler (z. B. unklare E-Mails). */
  extraHint?: string | null;
  busy: boolean;
  text: string;
  onTextChange: (t: string) => void;
  onSubmit: (rows: string[][]) => void;
  error: string | null;
}) {
  const { rows, ignored } = useMemo(() => parseBulkText(text), [text]);
  const overCap = rows.length > BULK_CAP;

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-caption font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          Eine Zeile pro {noun} — {formatHint}
        </span>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={placeholder}
          rows={8}
          className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-small focus:outline-none focus:ring-1"
          style={{
            background: "var(--surface-sunken)",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
          }}
        />
      </label>

      <p className="text-small text-[var(--text-secondary)]">
        {rows.length} erkannt
        {ignored > 0 ? `, ${ignored} ohne Namen ignoriert` : ""}
        {overCap ? (
          <span className="text-amber-500">
            {" "}
            — maximal {BULK_CAP} pro Durchgang, bitte aufteilen.
          </span>
        ) : null}
      </p>
      {extraHint ? (
        <p className="text-small text-amber-500">{extraHint}</p>
      ) : null}

      {rows.length > 0 ? (
        <BulkPreviewTable headers={headers} rows={rows} />
      ) : null}

      {error ? <p className="text-small text-red-600">{error}</p> : null}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          disabled={busy || rows.length === 0 || overCap}
          onClick={() => onSubmit(rows)}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-small font-medium disabled:opacity-50"
          style={{ background: "var(--accent-primary)", color: "white" }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : null}
          {rows.length > 0 ? `${Math.min(rows.length, BULK_CAP)} ` : ""}
          {noun === "Firma" ? "Firmen" : "Kontakte"} anlegen
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kontakt-Dialog                                                      */
/* ------------------------------------------------------------------ */

export function CreateContactDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode>("single");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  if (!open) return null;

  /** Nach Einzel- oder Bulk-Anlagen die Liste hinter dem Dialog aktualisieren. */
  function closeAndMaybeRefresh() {
    if (savedCount > 0 || (bulkResult?.created ?? 0) > 0) {
      router.refresh();
    }
    onClose();
  }

  async function submitSingle(stay: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Optionale Firma: find-or-create per Name (POST 409 = existiert →
      // ID über die Suche auflösen).
      let companyId: string | undefined;
      if (companyName.trim().length > 1) {
        const res = await fetch("/api/admin/crm/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({ name: companyName.trim() }),
        });
        if (res.ok) {
          const data = (await res.json()) as { company?: { id: string } };
          companyId = data.company?.id;
        } else if (res.status === 409) {
          const lookup = await fetch(
            `/api/admin/crm/companies?search=${encodeURIComponent(companyName.trim())}&limit=1`,
          ).catch(() => null);
          if (lookup?.ok) {
            const data = (await lookup.json()) as {
              companies?: Array<{ id: string }>;
            };
            companyId = data.companies?.[0]?.id;
          }
        }
      }

      const res = await fetch("/api/admin/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim().toLowerCase(),
          title: title.trim() || undefined,
          companyId,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Anlegen fehlgeschlagen (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { contact?: { id: string } };

      if (stay) {
        // Formular leeren, Dialog bleibt offen — der Zähler zeigt den Fortschritt.
        setFirstName("");
        setLastName("");
        setEmail("");
        setTitle("");
        setCompanyName("");
        setSavedCount((c) => c + 1);
        return;
      }
      onClose();
      if (data.contact?.id) {
        router.push(`/admin/crm/contacts/${data.contact.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  /** Unklare E-Mails nicht verlieren: in die Notiz verschieben. */
  function mapContactRows(rows: string[][]) {
    let unclearEmails = 0;
    const contacts = rows.map((cells) => {
      const rawEmail = cells[1] || "";
      const emailOk = EMAIL_RE.test(rawEmail);
      if (rawEmail && !emailOk) unclearEmails++;
      const noteParts = cells.slice(3).filter(Boolean);
      if (rawEmail && !emailOk) noteParts.push(`E-Mail unklar: ${rawEmail}`);
      return {
        name: cells[0],
        email: emailOk ? rawEmail.toLowerCase() : undefined,
        companyName: cells[2] || undefined,
        note: noteParts.join(" | ") || undefined,
      };
    });
    return { contacts, unclearEmails };
  }

  async function submitBulk(rows: string[][]) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { contacts } = mapContactRows(rows);
      const res = await fetch("/api/admin/crm/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ contacts }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Anlegen fehlgeschlagen (${res.status}).`);
        return;
      }
      const data = (await res.json()) as BulkResult;
      setBulkResult(data);
      setBulkText("");
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  const unclearEmailCount = mode === "bulk" ? countUnclearEmails(bulkText) : 0;

  return (
    <DialogShell
      title="Neuer Kontakt"
      onClose={closeAndMaybeRefresh}
      wide={mode === "bulk"}
    >
      <ModeTabs
        mode={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
      />

      {mode === "bulk" ? (
        bulkResult ? (
          <BulkResultPanel
            result={bulkResult}
            noun="Kontakte"
            onMore={() => setBulkResult(null)}
            onDone={closeAndMaybeRefresh}
          />
        ) : (
          <BulkCapture
            noun="Kontakt"
            formatHint="Name | E-Mail | Firma | Notiz (nur Name ist Pflicht)"
            placeholder={
              "Dr. Anna Schmidt | anna@kanzlei.de | Kanzlei Schmidt | ILA-Kontakt\nBen Weber | | Weber Legal\nCarla Krause"
            }
            headers={["Name", "E-Mail", "Firma", "Notiz"]}
            extraHint={
              unclearEmailCount > 0
                ? `${unclearEmailCount} unklare E-Mail${unclearEmailCount > 1 ? "s" : ""} — wird ohne E-Mail angelegt, der Text wandert in die Notiz.`
                : null
            }
            busy={busy}
            text={bulkText}
            onTextChange={setBulkText}
            onSubmit={submitBulk}
            error={error}
          />
        )
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitSingle(false);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vorname" value={firstName} onChange={setFirstName} />
            <Field label="Nachname" value={lastName} onChange={setLastName} />
          </div>
          <Field
            label="E-Mail"
            type="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="name@firma.com"
          />
          <Field
            label="Titel / Rolle"
            value={title}
            onChange={setTitle}
            placeholder="z. B. Head of Compliance"
          />
          <Field
            label="Firma (wird bei Bedarf neu angelegt)"
            value={companyName}
            onChange={setCompanyName}
            placeholder="Firmenname"
          />
          {error ? <p className="text-small text-red-600">{error}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            {savedCount > 0 ? (
              <span className="mr-auto inline-flex items-center gap-1 text-small text-green-500">
                <CheckCircle2 size={14} /> {savedCount} angelegt
              </span>
            ) : null}
            <button
              type="button"
              onClick={closeAndMaybeRefresh}
              className="rounded-md px-3 py-1.5 text-small text-[var(--text-tertiary)]"
            >
              {savedCount > 0 ? "Fertig" : "Abbrechen"}
            </button>
            <button
              type="button"
              disabled={busy || !email.trim()}
              onClick={() => void submitSingle(true)}
              className="rounded-md border px-3 py-1.5 text-small font-medium disabled:opacity-50"
              style={{
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              Speichern &amp; weitere
            </button>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-small font-medium disabled:opacity-50"
              style={{ background: "var(--accent-primary)", color: "white" }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              Kontakt anlegen
            </button>
          </div>
        </form>
      )}
    </DialogShell>
  );
}

/** Zählt E-Mail-Zellen, die nicht wie eine E-Mail aussehen (für den Hinweis). */
function countUnclearEmails(text: string): number {
  const { rows } = parseBulkText(text);
  return rows.filter((cells) => {
    const rawEmail = cells[1] || "";
    return rawEmail !== "" && !EMAIL_RE.test(rawEmail);
  }).length;
}

/* ------------------------------------------------------------------ */
/* Firmen-Dialog                                                       */
/* ------------------------------------------------------------------ */

export function CreateCompanyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode>("single");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [bulkText, setBulkText] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  if (!open) return null;

  function closeAndMaybeRefresh() {
    if (savedCount > 0 || (bulkResult?.created ?? 0) > 0) {
      router.refresh();
    }
    onClose();
  }

  async function submitSingle(stay: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/crm/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim() || undefined,
          country: country.trim().toUpperCase() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Anlegen fehlgeschlagen (${res.status}).`);
        return;
      }
      const data = (await res.json()) as { company?: { id: string } };

      if (stay) {
        setName("");
        setDomain("");
        setCountry("");
        setSavedCount((c) => c + 1);
        return;
      }
      onClose();
      if (data.company?.id) {
        router.push(`/admin/crm/companies/${data.company.id}`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBulk(rows: string[][]) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const companies = rows.map((cells) => ({
        name: cells[0],
        website: cells[1] || undefined,
        city: cells[2] || undefined,
        note: cells.slice(3).filter(Boolean).join(" | ") || undefined,
      }));
      const res = await fetch("/api/admin/crm/companies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ companies }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Anlegen fehlgeschlagen (${res.status}).`);
        return;
      }
      const data = (await res.json()) as BulkResult;
      setBulkResult(data);
      setBulkText("");
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogShell
      title="Neue Firma"
      onClose={closeAndMaybeRefresh}
      wide={mode === "bulk"}
    >
      <ModeTabs
        mode={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
      />

      {mode === "bulk" ? (
        bulkResult ? (
          <BulkResultPanel
            result={bulkResult}
            noun="Firmen"
            onMore={() => setBulkResult(null)}
            onDone={closeAndMaybeRefresh}
          />
        ) : (
          <BulkCapture
            noun="Firma"
            formatHint="Name | Website | Ort | Notiz (nur Name ist Pflicht)"
            placeholder={
              "Kanzlei Schmidt | kanzlei-schmidt.de | München | Empfehlung Dr. Weber\nWeber Legal | weber-legal.de\nRaumfahrt Recht GmbH"
            }
            headers={["Name", "Website", "Ort", "Notiz"]}
            busy={busy}
            text={bulkText}
            onTextChange={setBulkText}
            onSubmit={submitBulk}
            error={error}
          />
        )
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitSingle(false);
          }}
          className="space-y-3"
        >
          <Field label="Name" required value={name} onChange={setName} />
          <Field
            label="Domain"
            value={domain}
            onChange={setDomain}
            placeholder="firma.com"
          />
          <Field
            label="Land (ISO-2)"
            value={country}
            onChange={setCountry}
            placeholder="DE"
          />
          {error ? <p className="text-small text-red-600">{error}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-1">
            {savedCount > 0 ? (
              <span className="mr-auto inline-flex items-center gap-1 text-small text-green-500">
                <CheckCircle2 size={14} /> {savedCount} angelegt
              </span>
            ) : null}
            <button
              type="button"
              onClick={closeAndMaybeRefresh}
              className="rounded-md px-3 py-1.5 text-small text-[var(--text-tertiary)]"
            >
              {savedCount > 0 ? "Fertig" : "Abbrechen"}
            </button>
            <button
              type="button"
              disabled={busy || name.trim().length < 2}
              onClick={() => void submitSingle(true)}
              className="rounded-md border px-3 py-1.5 text-small font-medium disabled:opacity-50"
              style={{
                borderColor: "var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              Speichern &amp; weitere
            </button>
            <button
              type="submit"
              disabled={busy || name.trim().length < 2}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-small font-medium disabled:opacity-50"
              style={{ background: "var(--accent-primary)", color: "white" }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              Firma anlegen
            </button>
          </div>
        </form>
      )}
    </DialogShell>
  );
}
