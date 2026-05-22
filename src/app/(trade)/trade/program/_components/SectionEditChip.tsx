"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ProgramView } from "@/lib/trade/program-service";
import { EditSectionDrawer } from "./EditSectionDrawer";
import {
  CompanyProfileForm,
  RegistrationForm,
  EmpoweredOfficialForm,
  JurisdictionForm,
  LicenseCountersForm,
  TrainingAuditForm,
  VoluntaryDisclosuresForm,
} from "./forms/SectionForms";

/**
 * Single client-side entry point that owns drawer open-state per
 * section. The page.tsx server component passes the program snapshot
 * + a section discriminator; this component:
 *  - renders a small "Edit" pill button
 *  - opens the drawer + the appropriate form on click
 *  - closes the drawer on success — the server-action revalidatePath()
 *    triggers a fresh render of the page with the new data
 */
type SectionKey =
  | "companyProfile"
  | "registration"
  | "empoweredOfficial"
  | "jurisdiction"
  | "licenseCounters"
  | "trainingAudit"
  | "voluntaryDisclosures";

const SECTION_META: Record<SectionKey, { title: string; description: string }> =
  {
    companyProfile: {
      title: "Edit Company Profile",
      description:
        "Capture the org's exposure to ITAR, EAR, foreign nationals and other compliance triggers. Drives downstream requirement applicability.",
    },
    registration: {
      title: "Edit Registration & Infrastructure",
      description:
        "DDTC registration, Technology Control Plan (TCP), Export Compliance List (ECL) and screening tooling.",
    },
    empoweredOfficial: {
      title: "Edit Empowered Official (ITAR)",
      description:
        "The single ITAR-recognised individual authorised to sign and certify export-control filings.",
    },
    jurisdiction: {
      title: "Edit Jurisdiction Determination",
      description:
        "Which regime governs the org's items (ITAR / EAR / EAR99 / dual-use) and the Commodity Jurisdiction filing history.",
    },
    licenseCounters: {
      title: "Edit License Counters",
      description:
        "Active and pending license counts across BIS, DDTC and EU competent authorities.",
    },
    trainingAudit: {
      title: "Edit Training & Audit Cycle",
      description:
        "Last/next training dates, completion percentage, internal audit dates and recent findings.",
    },
    voluntaryDisclosures: {
      title: "Edit Voluntary Disclosures",
      description:
        "VSD history with BIS / DDTC / OFAC — count, last date, presence flag.",
    },
  };

interface SectionEditChipProps {
  section: SectionKey;
  program: ProgramView;
}

export function SectionEditChip({ section, program }: SectionEditChipProps) {
  const [open, setOpen] = useState(false);
  const meta = SECTION_META[section];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-trade-border bg-trade-bg-page px-2.5 py-1 text-[11.5px] font-medium text-trade-text-secondary transition-colors hover:border-trade-accent hover:bg-trade-accent-soft hover:text-trade-accent-strong"
        aria-label={meta.title}
      >
        <Pencil size={11} />
        Edit
      </button>

      <EditSectionDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={meta.title}
        description={meta.description}
      >
        {renderForm(section, program, () => setOpen(false))}
      </EditSectionDrawer>
    </>
  );
}

function renderForm(
  section: SectionKey,
  program: ProgramView,
  close: () => void,
) {
  const commonProps = {
    program,
    onSuccess: close,
    onCancel: close,
  };
  switch (section) {
    case "companyProfile":
      return <CompanyProfileForm {...commonProps} />;
    case "registration":
      return <RegistrationForm {...commonProps} />;
    case "empoweredOfficial":
      return <EmpoweredOfficialForm {...commonProps} />;
    case "jurisdiction":
      return <JurisdictionForm {...commonProps} />;
    case "licenseCounters":
      return <LicenseCountersForm {...commonProps} />;
    case "trainingAudit":
      return <TrainingAuditForm {...commonProps} />;
    case "voluntaryDisclosures":
      return <VoluntaryDisclosuresForm {...commonProps} />;
  }
}
