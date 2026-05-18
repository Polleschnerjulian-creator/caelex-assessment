"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — CrossReferenceDialog (Querverweise zu Überschriften / Fußnoten).
 *
 * Sprint 12 (2026-05-18). Modal für jur. Querverweise. Liest die
 * aktuell im Editor existierenden Überschriften (H1/H2/H3) + Fußnoten
 * und bietet sie als ziele für einen Cross-Ref-Link an. Auf insert
 * wird ein styled <a>-tag mit data-cross-ref attribute eingesetzt
 * der bei click zur ziel-position scrollt.
 *
 * V1 (this sprint): kein auto-update der ref-zahlen wenn target sich
 * ändert. user behält manuelle kontrolle (anders als Word's update-
 * fields F9, das wäre Phase 2 mit ProseMirror-Plugin der bei jedem
 * doc-change die refs aktualisiert).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { useEffect, useMemo, useState } from "react";
import { X, Link2, Hash, Type as TypeIcon, Footprints } from "lucide-react";
import type { Editor } from "@tiptap/react";

export type CrossRefTarget = {
  kind: "heading" | "footnote";
  level?: 1 | 2 | 3;
  text: string;
  pos: number;
};

interface Props {
  editor: Editor;
  onClose: () => void;
  onInsert: (target: CrossRefTarget, label: string) => void;
}

export function CrossReferenceDialog({ editor, onClose, onInsert }: Props) {
  const [selectedPos, setSelectedPos] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [filter, setFilter] = useState("");

  /* Walk the doc, collect headings + footnote-references. */
  const targets = useMemo<CrossRefTarget[]>(() => {
    const out: CrossRefTarget[] = [];
    let fnCounter = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        const lvl = node.attrs.level as 1 | 2 | 3;
        out.push({ kind: "heading", level: lvl, text: node.textContent, pos });
      } else if (node.type.name === "footnoteReference") {
        fnCounter++;
        out.push({
          kind: "footnote",
          text: `Fn. ${fnCounter}`,
          pos,
        });
      }
    });
    return out;
  }, [editor]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return targets;
    const f = filter.toLowerCase();
    return targets.filter((t) => t.text.toLowerCase().includes(f));
  }, [targets, filter]);

  /* Pre-fill label when target picked. */
  useEffect(() => {
    if (selectedPos === null) return;
    const target = targets.find((t) => t.pos === selectedPos);
    if (target) {
      if (target.kind === "footnote") {
        setLabel(target.text);
      } else {
        /* For headings, suggest "siehe Abschnitt X" */
        setLabel(`siehe ${target.text}`);
      }
    }
  }, [selectedPos, targets]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleInsert = () => {
    const target = targets.find((t) => t.pos === selectedPos);
    if (!target || !label.trim()) return;
    onInsert(target, label.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <Link2 size={16} className="text-emerald-600 dark:text-emerald-400" />
          <h2 className="flex-1 text-[14px] font-semibold">
            Querverweis einfügen
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

        <div className="border-b border-slate-200 px-5 py-2 dark:border-slate-700">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtern nach Überschrift / Fußnote …"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-6 py-8 text-center text-[12.5px] text-slate-500">
              Keine Überschriften oder Fußnoten im Dokument gefunden.
              <br />
              Füge erst Überschriften (H1/H2/H3) oder Fußnoten ein, dann kannst
              du sie hier referenzieren.
            </div>
          ) : (
            <ul>
              {filtered.map((t, idx) => {
                const Icon = t.kind === "heading" ? Hash : Footprints;
                const selected = t.pos === selectedPos;
                return (
                  <li key={`${t.pos}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => setSelectedPos(t.pos)}
                      className={`flex w-full items-start gap-2 px-5 py-2 text-left text-[12.5px] transition-colors ${
                        selected
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800"
                      } ${t.kind === "heading" && t.level === 2 ? "pl-8" : ""} ${t.kind === "heading" && t.level === 3 ? "pl-12" : ""}`}
                    >
                      <Icon
                        size={11}
                        className={`mt-0.5 shrink-0 ${
                          t.kind === "heading"
                            ? "text-slate-500"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={`line-clamp-2 ${t.kind === "heading" && t.level === 1 ? "font-semibold" : ""}`}
                        >
                          {t.text || "(leer)"}
                        </div>
                        <div className="mt-0.5 text-[10.5px] text-slate-400">
                          {t.kind === "heading"
                            ? `Überschrift ${t.level}`
                            : "Fußnote"}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Label-input + insert */}
        <footer className="border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
          <label className="mb-1 block text-[10.5px] uppercase tracking-[0.1em] text-slate-500">
            Link-Text im Dokument
          </label>
          <div className="flex items-center gap-2">
            <TypeIcon size={11} className="text-slate-400" />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="z.B. siehe Abschnitt II. / vgl. Fn. 3"
              className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
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
              disabled={selectedPos === null || !label.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Link2 size={11} />
              Verweis einfügen
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
