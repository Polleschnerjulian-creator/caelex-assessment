"use client";

/**
 * Manual creation dialogs for contacts + companies (CRM Phase 1).
 * The POST APIs existed all along — these are the missing entry forms.
 * On success: navigate straight to the new record's detail page.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
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
  children,
}: {
  title: string;
  onClose: () => void;
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
        className="w-full max-w-md rounded-xl border p-5 shadow-xl"
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

export function CreateContactDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // Optional company: find-or-create by name first (POST 409 = exists →
      // resolve the id via search instead).
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

  return (
    <DialogShell title="Neuer Kontakt" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
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
          label="Firma (find-or-create)"
          value={companyName}
          onChange={setCompanyName}
          placeholder="Firmenname"
        />
        {error ? <p className="text-small text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-small text-[var(--text-tertiary)]"
          >
            Abbrechen
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
    </DialogShell>
  );
}

export function CreateCompanyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <DialogShell title="Neue Firma" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
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
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-small text-[var(--text-tertiary)]"
          >
            Abbrechen
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
    </DialogShell>
  );
}
