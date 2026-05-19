"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — CitationDialog (juristische Zitate strukturiert einfügen).
 *
 * Sprint 11 (2026-05-18). Modal-Dialog der per Source-Type strukturierte
 * Felder anbietet (Gesetz/Urteil/Kommentar/Lehrbuch/Aufsatz/Festschrift/
 * EU-Verordnung/Online-Quelle) und daraus einen DE-juristisch korrekt
 * formatierten Zitat-Text generiert nach Stüber/Möllers/Byrd-Lehmann
 * Konvention.
 *
 * Formatierungs-Schema (Erst-Zitat):
 *   Gesetz:        § 433 Abs. 1 S. 1 BGB
 *   §§-Mehrzahl:   §§ 280 ff. BGB
 *   Artikel:       Art. 14 Abs. 1 S. 1 GG
 *   Urteil:        BGH, Urt. v. 12.03.2024 – VI ZR 123/23, NJW 2024, 2345
 *   BVerfG amtl.:  BVerfGE 100, 313 (362)
 *   BGHZ amtl.:    BGHZ 34, 27 (30)
 *   EuGH:          EuGH, Urt. v. 6.4.1995, Rs. C-241/91 P, Slg. 1995, I-743
 *   Kommentar:     Bearbeiter, in: Hrsg., Werk, 9. Aufl. 2024, § 433 Rn. 12
 *   Lehrbuch:      Möllers, Juristische Methodenlehre, 5. Aufl. 2024, § 5 Rn. 45
 *   Aufsatz:       Möllers, NJW 2024, 1234 (1236)
 *   Festschrift:   Westermann, in: FS Köhler, 2014, S. 157 (160)
 *   EU-VO:         VO (EU) 2016/679, Art. 4 Nr. 1
 *   Online:        Autor, Titel, abrufbar unter: https://..., Stand: TT.MM.JJJJ
 *
 * Kurz-Zitat-Logik (ab zweiter Nennung): NICHT in V1 — kommt mit
 * citeproc-js Integration in Sprint 13.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useState } from "react";
import { X, Quote, FileText, Gavel, BookOpen, Globe } from "lucide-react";

export type CitationType =
  | "gesetz"
  | "urteil"
  | "bverfg-amtl"
  | "bghz-amtl"
  | "eugh"
  | "kommentar"
  | "lehrbuch"
  | "aufsatz"
  | "festschrift"
  | "eu-vo"
  | "online";

interface Props {
  onClose: () => void;
  /** Sprint 13 — `type` is the structured citation-kind so the parent
   *  can wrap the inserted text with a CitationMark for Table of
   *  Authorities scanning. */
  onInsert: (formattedText: string, type: CitationType) => void;
}

const TYPE_META: {
  value: CitationType;
  label: string;
  icon: typeof Quote;
  description: string;
}[] = [
  {
    value: "gesetz",
    label: "Gesetz (§ / Art.)",
    icon: Gavel,
    description: "z. B. § 433 Abs. 1 S. 1 BGB · Art. 14 GG",
  },
  {
    value: "urteil",
    label: "Urteil / Beschluss",
    icon: Gavel,
    description: "z. B. BGH, Urt. v. 12.03.2024 – VI ZR 123/23",
  },
  {
    value: "bverfg-amtl",
    label: "BVerfGE (amtliche Sammlung)",
    icon: Gavel,
    description: "z. B. BVerfGE 100, 313 (362)",
  },
  {
    value: "bghz-amtl",
    label: "BGHZ (amtliche Sammlung)",
    icon: Gavel,
    description: "z. B. BGHZ 34, 27 (30)",
  },
  {
    value: "eugh",
    label: "EuGH",
    icon: Gavel,
    description: "z. B. EuGH, Rs. C-241/91 P",
  },
  {
    value: "kommentar",
    label: "Kommentar",
    icon: BookOpen,
    description: "z. B. Palandt, BGB, 84. Aufl. 2025, § 433 Rn. 12",
  },
  {
    value: "lehrbuch",
    label: "Lehrbuch",
    icon: BookOpen,
    description: "z. B. Möllers, Methodenlehre, 5. Aufl. 2024, § 5 Rn. 45",
  },
  {
    value: "aufsatz",
    label: "Zeitschriften-Aufsatz",
    icon: FileText,
    description: "z. B. Möllers, NJW 2024, 1234 (1236)",
  },
  {
    value: "festschrift",
    label: "Festschrift",
    icon: BookOpen,
    description: "z. B. Westermann, in: FS Köhler, 2014, S. 157",
  },
  {
    value: "eu-vo",
    label: "EU-Verordnung / Richtlinie",
    icon: FileText,
    description: "z. B. VO (EU) 2016/679, Art. 4 Nr. 1",
  },
  {
    value: "online",
    label: "Online-Quelle",
    icon: Globe,
    description: "z. B. Autor, Titel, abrufbar unter: https://...",
  },
];

interface FormState {
  /* Gesetz */
  gesetzMarker: "§" | "§§" | "Art." | "Artt.";
  gesetzNummer: string;
  gesetzAbs: string;
  gesetzSatz: string;
  gesetzNr: string;
  gesetzLit: string;
  gesetzKürzel: string;

  /* Urteil */
  gericht: string;
  entscheidungsart: "Urt." | "Beschl." | "Versäumnisurt.";
  urteilDatum: string;
  aktenzeichen: string;
  fundstelle: string;
  fundstelleSeite: string;

  /* BVerfG/BGHZ amtl */
  amtlBand: string;
  amtlAnfang: string;
  amtlZitatseite: string;

  /* EuGH */
  euGhDatum: string;
  euGhRs: string;
  euGhSlg: string;

  /* Kommentar / Lehrbuch */
  bearbeiter: string;
  herausgeber: string;
  werk: string;
  auflage: string;
  jahr: string;
  paragraf: string;
  randnummer: string;
  seite: string;

  /* Aufsatz */
  aufsatzAutor: string;
  zeitschrift: string;
  aufsatzJahr: string;
  aufsatzSeiteAnfang: string;
  aufsatzZitatseite: string;

  /* Festschrift */
  fsVerfasser: string;
  fsName: string;
  fsJahr: string;
  fsSeite: string;
  fsZitatseite: string;

  /* EU-VO */
  euVoTyp: "VO" | "RL";
  euVoNr: string;
  euVoArt: string;
  euVoAbs: string;
  euVoNrNr: string;

  /* Online */
  onlineAutor: string;
  onlineTitel: string;
  onlineUrl: string;
  onlineStand: string;
}

const INITIAL: FormState = {
  gesetzMarker: "§",
  gesetzNummer: "",
  gesetzAbs: "",
  gesetzSatz: "",
  gesetzNr: "",
  gesetzLit: "",
  gesetzKürzel: "BGB",
  gericht: "BGH",
  entscheidungsart: "Urt.",
  urteilDatum: "",
  aktenzeichen: "",
  fundstelle: "NJW",
  fundstelleSeite: "",
  amtlBand: "",
  amtlAnfang: "",
  amtlZitatseite: "",
  euGhDatum: "",
  euGhRs: "",
  euGhSlg: "",
  bearbeiter: "",
  herausgeber: "",
  werk: "",
  auflage: "",
  jahr: "",
  paragraf: "",
  randnummer: "",
  seite: "",
  aufsatzAutor: "",
  zeitschrift: "NJW",
  aufsatzJahr: "",
  aufsatzSeiteAnfang: "",
  aufsatzZitatseite: "",
  fsVerfasser: "",
  fsName: "",
  fsJahr: "",
  fsSeite: "",
  fsZitatseite: "",
  euVoTyp: "VO",
  euVoNr: "",
  euVoArt: "",
  euVoAbs: "",
  euVoNrNr: "",
  onlineAutor: "",
  onlineTitel: "",
  onlineUrl: "",
  onlineStand: new Date().toLocaleDateString("de-DE"),
};

function formatCitation(type: CitationType, f: FormState): string {
  switch (type) {
    case "gesetz": {
      const parts: string[] = [f.gesetzMarker, f.gesetzNummer.trim()];
      if (f.gesetzAbs.trim()) parts.push(`Abs. ${f.gesetzAbs.trim()}`);
      if (f.gesetzSatz.trim()) parts.push(`S. ${f.gesetzSatz.trim()}`);
      if (f.gesetzNr.trim()) parts.push(`Nr. ${f.gesetzNr.trim()}`);
      if (f.gesetzLit.trim()) parts.push(`lit. ${f.gesetzLit.trim()}`);
      parts.push(f.gesetzKürzel.trim());
      return parts.filter(Boolean).join(" ");
    }
    case "urteil": {
      const parts: string[] = [
        `${f.gericht}, ${f.entscheidungsart} v. ${f.urteilDatum.trim()}`,
      ];
      if (f.aktenzeichen.trim()) parts[0] += ` – ${f.aktenzeichen.trim()}`;
      if (f.fundstelle.trim() && f.fundstelleSeite.trim()) {
        const year = f.urteilDatum.match(/\d{4}/)?.[0];
        parts.push(
          `${f.fundstelle} ${year ?? ""} ${f.fundstelleSeite.trim()}`.trim(),
        );
      }
      return parts.filter(Boolean).join(", ");
    }
    case "bverfg-amtl": {
      const base = `BVerfGE ${f.amtlBand.trim()}, ${f.amtlAnfang.trim()}`;
      return f.amtlZitatseite.trim()
        ? `${base} (${f.amtlZitatseite.trim()})`
        : base;
    }
    case "bghz-amtl": {
      const base = `BGHZ ${f.amtlBand.trim()}, ${f.amtlAnfang.trim()}`;
      return f.amtlZitatseite.trim()
        ? `${base} (${f.amtlZitatseite.trim()})`
        : base;
    }
    case "eugh": {
      const parts: string[] = [`EuGH, Urt. v. ${f.euGhDatum.trim()}`];
      if (f.euGhRs.trim()) parts.push(`Rs. ${f.euGhRs.trim()}`);
      if (f.euGhSlg.trim()) parts.push(`Slg. ${f.euGhSlg.trim()}`);
      return parts.join(", ");
    }
    case "kommentar": {
      const bearbeiter = f.bearbeiter.trim();
      const hrsg = f.herausgeber.trim();
      const werk = f.werk.trim();
      const aufl = f.auflage.trim();
      const jahr = f.jahr.trim();
      const para = f.paragraf.trim();
      const rn = f.randnummer.trim();
      const left = bearbeiter ? `${bearbeiter}, ` : "";
      const middle = hrsg ? `in: ${hrsg}, ${werk}` : werk;
      const auflPart = aufl
        ? `, ${aufl}. Aufl. ${jahr}`
        : jahr
          ? `, ${jahr}`
          : "";
      const refPart = [para, rn ? `Rn. ${rn}` : ""].filter(Boolean).join(" ");
      return `${left}${middle}${auflPart}${refPart ? `, ${refPart}` : ""}`;
    }
    case "lehrbuch": {
      const bearbeiter = f.bearbeiter.trim();
      const werk = f.werk.trim();
      const aufl = f.auflage.trim();
      const jahr = f.jahr.trim();
      const para = f.paragraf.trim();
      const rn = f.randnummer.trim();
      const seite = f.seite.trim();
      const left = bearbeiter ? `${bearbeiter}, ${werk}` : werk;
      const auflPart = aufl
        ? `, ${aufl}. Aufl. ${jahr}`
        : jahr
          ? `, ${jahr}`
          : "";
      const refPart = [para, rn ? `Rn. ${rn}` : "", seite ? `S. ${seite}` : ""]
        .filter(Boolean)
        .join(" ");
      return `${left}${auflPart}${refPart ? `, ${refPart}` : ""}`;
    }
    case "aufsatz": {
      const autor = f.aufsatzAutor.trim();
      const zs = f.zeitschrift.trim();
      const jahr = f.aufsatzJahr.trim();
      const sAnfang = f.aufsatzSeiteAnfang.trim();
      const sZitat = f.aufsatzZitatseite.trim();
      const seiten = sZitat ? `${sAnfang} (${sZitat})` : sAnfang;
      return `${autor}, ${zs} ${jahr}, ${seiten}`;
    }
    case "festschrift": {
      const v = f.fsVerfasser.trim();
      const name = f.fsName.trim();
      const jahr = f.fsJahr.trim();
      const sAnfang = f.fsSeite.trim();
      const sZitat = f.fsZitatseite.trim();
      const seiten = sZitat ? `S. ${sAnfang} (${sZitat})` : `S. ${sAnfang}`;
      return `${v}, in: FS ${name}, ${jahr}, ${seiten}`;
    }
    case "eu-vo": {
      const typ = f.euVoTyp;
      const nr = f.euVoNr.trim();
      const art = f.euVoArt.trim();
      const abs = f.euVoAbs.trim();
      const nrNr = f.euVoNrNr.trim();
      const artPart = [
        art ? `Art. ${art}` : "",
        abs ? `Abs. ${abs}` : "",
        nrNr ? `Nr. ${nrNr}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `${typ} (EU) ${nr}${artPart ? `, ${artPart}` : ""}`;
    }
    case "online": {
      const autor = f.onlineAutor.trim();
      const titel = f.onlineTitel.trim();
      const url = f.onlineUrl.trim();
      const stand = f.onlineStand.trim();
      const left = autor ? `${autor}, ${titel}` : titel;
      return `${left}, abrufbar unter: ${url}${stand ? ` (Stand: ${stand})` : ""}`;
    }
  }
}

export function CitationDialog({ onClose, onInsert }: Props) {
  const [type, setType] = useState<CitationType>("gesetz");
  const [form, setForm] = useState<FormState>(INITIAL);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = formatCitation(type, form);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleInsert = () => {
    onInsert(preview, type);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <Quote size={16} className="text-emerald-600 dark:text-emerald-400" />
          <h2 className="flex-1 text-[14px] font-semibold">
            Juristisches Zitat einfügen
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left — type picker */}
          <div className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
            <ul>
              {TYPE_META.map((t) => {
                const Icon = t.icon;
                const active = type === t.value;
                return (
                  <li key={t.value}>
                    <button
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                        active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={12} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[12px] font-medium">{t.label}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right — form fields per type */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <p className="mb-3 text-[11px] text-slate-500">
              {TYPE_META.find((t) => t.value === type)?.description}
            </p>

            {type === "gesetz" && (
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Marker"
                  value={form.gesetzMarker}
                  onChange={(v) =>
                    set("gesetzMarker", v as FormState["gesetzMarker"])
                  }
                  options={[
                    { value: "§", label: "§ (einzeln)" },
                    { value: "§§", label: "§§ (mehrere)" },
                    { value: "Art.", label: "Art. (einzeln)" },
                    { value: "Artt.", label: "Artt. (mehrere)" },
                  ]}
                />
                <Field
                  label="Nummer"
                  value={form.gesetzNummer}
                  onChange={(v) => set("gesetzNummer", v)}
                  placeholder="433 oder 280 ff."
                />
                <Field
                  label="Abs."
                  value={form.gesetzAbs}
                  onChange={(v) => set("gesetzAbs", v)}
                  placeholder="1"
                />
                <Field
                  label="S. (Satz)"
                  value={form.gesetzSatz}
                  onChange={(v) => set("gesetzSatz", v)}
                  placeholder="1"
                />
                <Field
                  label="Nr."
                  value={form.gesetzNr}
                  onChange={(v) => set("gesetzNr", v)}
                />
                <Field
                  label="lit."
                  value={form.gesetzLit}
                  onChange={(v) => set("gesetzLit", v)}
                />
                <Field
                  label="Gesetz / Kürzel"
                  value={form.gesetzKürzel}
                  onChange={(v) => set("gesetzKürzel", v)}
                  placeholder="BGB / GG / StGB / DSGVO …"
                  full
                />
              </div>
            )}

            {type === "urteil" && (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Gericht"
                  value={form.gericht}
                  onChange={(v) => set("gericht", v)}
                  placeholder="BGH / OLG München / VG Berlin"
                />
                <Select
                  label="Entscheidungsart"
                  value={form.entscheidungsart}
                  onChange={(v) =>
                    set("entscheidungsart", v as FormState["entscheidungsart"])
                  }
                  options={[
                    { value: "Urt.", label: "Urt. (Urteil)" },
                    { value: "Beschl.", label: "Beschl. (Beschluss)" },
                    {
                      value: "Versäumnisurt.",
                      label: "Versäumnisurt.",
                    },
                  ]}
                />
                <Field
                  label="Datum (TT.MM.JJJJ)"
                  value={form.urteilDatum}
                  onChange={(v) => set("urteilDatum", v)}
                  placeholder="12.03.2024"
                />
                <Field
                  label="Aktenzeichen"
                  value={form.aktenzeichen}
                  onChange={(v) => set("aktenzeichen", v)}
                  placeholder="VI ZR 123/23"
                />
                <Field
                  label="Fundstelle"
                  value={form.fundstelle}
                  onChange={(v) => set("fundstelle", v)}
                  placeholder="NJW / NZBau / DStR"
                />
                <Field
                  label="Seite"
                  value={form.fundstelleSeite}
                  onChange={(v) => set("fundstelleSeite", v)}
                  placeholder="2345"
                />
              </div>
            )}

            {(type === "bverfg-amtl" || type === "bghz-amtl") && (
              <div className="grid grid-cols-3 gap-3">
                <Field
                  label="Band"
                  value={form.amtlBand}
                  onChange={(v) => set("amtlBand", v)}
                  placeholder="100"
                />
                <Field
                  label="Anfangsseite"
                  value={form.amtlAnfang}
                  onChange={(v) => set("amtlAnfang", v)}
                  placeholder="313"
                />
                <Field
                  label="Zitatseite"
                  value={form.amtlZitatseite}
                  onChange={(v) => set("amtlZitatseite", v)}
                  placeholder="362"
                />
              </div>
            )}

            {type === "eugh" && (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Datum"
                  value={form.euGhDatum}
                  onChange={(v) => set("euGhDatum", v)}
                  placeholder="6.4.1995"
                />
                <Field
                  label="Rechtssache"
                  value={form.euGhRs}
                  onChange={(v) => set("euGhRs", v)}
                  placeholder="C-241/91 P"
                />
                <Field
                  label="Slg. (Sammlung)"
                  value={form.euGhSlg}
                  onChange={(v) => set("euGhSlg", v)}
                  placeholder="1995, I-743"
                  full
                />
              </div>
            )}

            {(type === "kommentar" || type === "lehrbuch") && (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label={type === "kommentar" ? "Bearbeiter" : "Autor"}
                  value={form.bearbeiter}
                  onChange={(v) => set("bearbeiter", v)}
                  placeholder={type === "kommentar" ? "Grüneberg" : "Möllers"}
                />
                {type === "kommentar" && (
                  <Field
                    label="Herausgeber"
                    value={form.herausgeber}
                    onChange={(v) => set("herausgeber", v)}
                    placeholder="Palandt"
                  />
                )}
                <Field
                  label="Werk"
                  value={form.werk}
                  onChange={(v) => set("werk", v)}
                  placeholder={
                    type === "kommentar" ? "BGB" : "Juristische Methodenlehre"
                  }
                  full={type !== "kommentar"}
                />
                <Field
                  label="Auflage"
                  value={form.auflage}
                  onChange={(v) => set("auflage", v)}
                  placeholder="84"
                />
                <Field
                  label="Jahr"
                  value={form.jahr}
                  onChange={(v) => set("jahr", v)}
                  placeholder="2025"
                />
                <Field
                  label="§ / Art."
                  value={form.paragraf}
                  onChange={(v) => set("paragraf", v)}
                  placeholder="§ 433"
                />
                <Field
                  label="Rn."
                  value={form.randnummer}
                  onChange={(v) => set("randnummer", v)}
                  placeholder="12"
                />
                {type === "lehrbuch" && (
                  <Field
                    label="Seite (alt. zu Rn.)"
                    value={form.seite}
                    onChange={(v) => set("seite", v)}
                    placeholder="45"
                  />
                )}
              </div>
            )}

            {type === "aufsatz" && (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Autor"
                  value={form.aufsatzAutor}
                  onChange={(v) => set("aufsatzAutor", v)}
                  placeholder="Möllers"
                />
                <Field
                  label="Zeitschrift"
                  value={form.zeitschrift}
                  onChange={(v) => set("zeitschrift", v)}
                  placeholder="NJW / JZ / AcP"
                />
                <Field
                  label="Jahr / Band"
                  value={form.aufsatzJahr}
                  onChange={(v) => set("aufsatzJahr", v)}
                  placeholder="2024"
                />
                <Field
                  label="Anfangsseite"
                  value={form.aufsatzSeiteAnfang}
                  onChange={(v) => set("aufsatzSeiteAnfang", v)}
                  placeholder="1234"
                />
                <Field
                  label="Zitatseite"
                  value={form.aufsatzZitatseite}
                  onChange={(v) => set("aufsatzZitatseite", v)}
                  placeholder="1236"
                />
              </div>
            )}

            {type === "festschrift" && (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Verfasser"
                  value={form.fsVerfasser}
                  onChange={(v) => set("fsVerfasser", v)}
                  placeholder="Westermann"
                />
                <Field
                  label="FS-Geehrter"
                  value={form.fsName}
                  onChange={(v) => set("fsName", v)}
                  placeholder="Köhler"
                />
                <Field
                  label="Jahr"
                  value={form.fsJahr}
                  onChange={(v) => set("fsJahr", v)}
                  placeholder="2014"
                />
                <Field
                  label="Anfangsseite"
                  value={form.fsSeite}
                  onChange={(v) => set("fsSeite", v)}
                  placeholder="157"
                />
                <Field
                  label="Zitatseite"
                  value={form.fsZitatseite}
                  onChange={(v) => set("fsZitatseite", v)}
                  placeholder="160"
                />
              </div>
            )}

            {type === "eu-vo" && (
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Typ"
                  value={form.euVoTyp}
                  onChange={(v) => set("euVoTyp", v as FormState["euVoTyp"])}
                  options={[
                    { value: "VO", label: "VO (Verordnung)" },
                    { value: "RL", label: "RL (Richtlinie)" },
                  ]}
                />
                <Field
                  label="Nummer (Jahr/lfd.Nr.)"
                  value={form.euVoNr}
                  onChange={(v) => set("euVoNr", v)}
                  placeholder="2016/679"
                />
                <Field
                  label="Art."
                  value={form.euVoArt}
                  onChange={(v) => set("euVoArt", v)}
                  placeholder="4"
                />
                <Field
                  label="Abs."
                  value={form.euVoAbs}
                  onChange={(v) => set("euVoAbs", v)}
                  placeholder="1"
                />
                <Field
                  label="Nr."
                  value={form.euVoNrNr}
                  onChange={(v) => set("euVoNrNr", v)}
                  placeholder="1"
                />
              </div>
            )}

            {type === "online" && (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Autor"
                  value={form.onlineAutor}
                  onChange={(v) => set("onlineAutor", v)}
                  placeholder="Müller"
                />
                <Field
                  label="Titel"
                  value={form.onlineTitel}
                  onChange={(v) => set("onlineTitel", v)}
                  placeholder="Reform des Weltraumrechts"
                />
                <Field
                  label="URL"
                  value={form.onlineUrl}
                  onChange={(v) => set("onlineUrl", v)}
                  placeholder="https://..."
                  full
                />
                <Field
                  label="Stand"
                  value={form.onlineStand}
                  onChange={(v) => set("onlineStand", v)}
                  placeholder="18.05.2026"
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview + Insert */}
        <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="mb-2">
            <div className="mb-1 text-[10.5px] uppercase tracking-[0.1em] text-slate-500">
              Vorschau
            </div>
            <div className="rounded-md border border-emerald-300 bg-white px-3 py-2 font-serif text-[13px] text-slate-900 dark:border-emerald-500/30 dark:bg-slate-900 dark:text-slate-100">
              {preview || (
                <span className="italic text-slate-400">
                  Felder oben ausfüllen…
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-[12px] text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleInsert}
              disabled={!preview.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Quote size={11} />
              In Dokument einfügen
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ── Reusable inputs ──────────────────────────────────────────────── */

function Field({
  label,
  value,
  onChange,
  placeholder,
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12.5px] text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
