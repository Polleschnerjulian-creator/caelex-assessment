import { redirect } from "next/navigation";
import {
  Building2,
  FileBadge,
  UserCheck,
  MapPin,
  FileCheck,
  GraduationCap,
  AlertOctagon,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  getProgramWithRequirements,
  ensureProgram,
  type ProgramView,
} from "@/lib/trade/program-service";
import { ProgramSection } from "./_components/ProgramSection";
import type { ProgramSectionItem } from "./_components/ProgramSection";
import { RequirementStatusList } from "./_components/RequirementStatusList";
import { SectionEditChip } from "./_components/SectionEditChip";

export const metadata = {
  title: "Compliance Program — Caelex Trade",
};

/**
 * /trade/program — Posture overview (Sprint T4).
 *
 * Read-only dashboard summarising the org's export-compliance program:
 * registration state, Empowered Official, jurisdiction determination,
 * licensing counters, training/audit cycle, voluntary disclosures.
 * Re-resolves the org from session (the layout already gated access).
 *
 * Lazy-creates a DRAFT program row on first visit so the page never
 * shows a "no program found" stub for an entitled user.
 */
export default async function TradeProgramPage() {
  const session = await auth();
  // The layout would have redirected unauthenticated users; this defends
  // against any future direct-render path (e.g. server actions invoking
  // the component shape).
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftrade%2Fprogram");
  }

  const { orgId, canEdit } = await resolveSessionContext(
    session.user.id,
    session.user.email,
  );
  const fetched = await getProgramWithRequirements(orgId);
  const program: ProgramView = fetched?.program ?? (await ensureProgram(orgId));
  const requirementStatuses = fetched?.requirementStatuses ?? [];

  /** Helper: render edit chip only when the viewer can edit. */
  const editChip = (
    section:
      | "companyProfile"
      | "registration"
      | "empoweredOfficial"
      | "jurisdiction"
      | "licenseCounters"
      | "trainingAudit"
      | "voluntaryDisclosures",
  ) =>
    canEdit ? <SectionEditChip section={section} program={program} /> : null;

  return (
    <div className="space-y-5 px-8 py-10">
      <header className="mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-trade-accent">
          Caelex Trade — Posture
        </p>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight text-trade-text-primary">
          Compliance Program
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] text-trade-text-secondary">
          Org-level state of your export-compliance program — registration,
          Empowered Official, jurisdiction, training and audit cadence.
          {canEdit
            ? " Use the Edit chip on each card to update."
            : " Read-only view — MANAGER+ role required to edit."}
        </p>
      </header>

      <ProgramSection
        icon={Building2}
        title="Company Profile"
        items={companyProfile(program)}
        headerAction={editChip("companyProfile")}
      />
      <ProgramSection
        icon={FileBadge}
        title="Registration & Infrastructure"
        items={registrationInfo(program)}
        headerAction={editChip("registration")}
      />
      <ProgramSection
        icon={UserCheck}
        title="Empowered Official (ITAR)"
        items={empoweredOfficial(program)}
        headerAction={editChip("empoweredOfficial")}
      />
      <ProgramSection
        icon={MapPin}
        title="Jurisdiction Determination"
        items={jurisdiction(program)}
        headerAction={editChip("jurisdiction")}
      />
      <ProgramSection
        icon={FileCheck}
        title="License Counters"
        items={licenseCounters(program)}
        headerAction={editChip("licenseCounters")}
      />
      <ProgramSection
        icon={GraduationCap}
        title="Training & Audit Cycle"
        items={trainingAndAudit(program)}
        headerAction={editChip("trainingAudit")}
      />
      <ProgramSection
        icon={AlertOctagon}
        title="Voluntary Disclosures"
        items={voluntaryDisclosures(program)}
        headerAction={editChip("voluntaryDisclosures")}
      />

      <RequirementStatusList statuses={requirementStatuses} canEdit={canEdit} />
    </div>
  );
}

const EDITOR_ROLES: ReadonlyArray<string> = ["OWNER", "ADMIN", "MANAGER"];

async function resolveSessionContext(
  userId: string,
  email: string | null | undefined,
): Promise<{ orgId: string; canEdit: boolean }> {
  if (isSuperAdmin(email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return { orgId: anyOrg?.id ?? "super-admin-no-org", canEdit: true };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organization: { select: { id: true } }, role: true },
    orderBy: { joinedAt: "asc" },
  });
  return {
    orgId: membership?.organization.id ?? "no-org",
    canEdit: membership ? EDITOR_ROLES.includes(membership.role) : false,
  };
}

function companyProfile(p: ProgramView): ProgramSectionItem[] {
  return [
    { label: "Has ITAR Items", value: p.hasITARItems },
    { label: "Has EAR Items", value: p.hasEARItems },
    { label: "Has Foreign Nationals", value: p.hasForeignNationals },
    { label: "Technology Transfer", value: p.hasTechnologyTransfer },
    { label: "Defense Contracts", value: p.hasDefenseContracts },
    { label: "Manufacturing Abroad", value: p.hasManufacturingAbroad },
    { label: "Joint Ventures", value: p.hasJointVentures },
    {
      label: "Annual Export Value (€)",
      value: p.annualExportValueEur
        ? p.annualExportValueEur.toLocaleString()
        : null,
    },
  ];
}

function registrationInfo(p: ProgramView): ProgramSectionItem[] {
  return [
    { label: "Registered with DDTC", value: p.registeredWithDDTC },
    {
      label: "DDTC Registration No.",
      value: p.ddtcRegistrationNo,
    },
    { label: "DDTC Expiry", value: p.ddtcRegistrationExpiry },
    { label: "Has TCP", value: p.hasTCP },
    { label: "TCP Last Review", value: p.tcpLastReviewDate },
    { label: "Has ECL", value: p.hasECL },
    { label: "Automated Screening", value: p.hasAutomatedScreening },
    { label: "Screening Vendor", value: p.screeningVendor },
  ];
}

function empoweredOfficial(p: ProgramView): ProgramSectionItem[] {
  return [
    { label: "Name", value: p.empoweredOfficialName },
    { label: "Email", value: p.empoweredOfficialEmail },
    { label: "Title", value: p.empoweredOfficialTitle },
  ];
}

function jurisdiction(p: ProgramView): ProgramSectionItem[] {
  return [
    { label: "Determination", value: p.jurisdictionDetermination },
    { label: "Determined On", value: p.jurisdictionDeterminationDate },
    { label: "CJ Request", value: p.hasCJRequest },
    { label: "CJ Request Date", value: p.cjRequestDate },
    { label: "CJ Determination", value: p.cjDetermination },
    { label: "CJ Determination Date", value: p.cjDeterminationDate },
  ];
}

function licenseCounters(p: ProgramView): ProgramSectionItem[] {
  return [
    {
      label: "Active ITAR Licenses",
      value: p.activeITARLicenses?.toString() ?? null,
    },
    {
      label: "Pending ITAR Licenses",
      value: p.pendingITARLicenses?.toString() ?? null,
    },
    { label: "Active TAAs", value: p.activeTAAs?.toString() ?? null },
    { label: "Active MLAs", value: p.activeMLAs?.toString() ?? null },
    {
      label: "Active EAR Licenses",
      value: p.activeEARLicenses?.toString() ?? null,
    },
    {
      label: "Pending EAR Licenses",
      value: p.pendingEARLicenses?.toString() ?? null,
    },
    { label: "Uses License Exceptions", value: p.usesLicenseExceptions },
  ];
}

function trainingAndAudit(p: ProgramView): ProgramSectionItem[] {
  return [
    { label: "Last Training", value: p.lastTrainingDate },
    { label: "Next Training Due", value: p.nextTrainingDue },
    {
      label: "Training Completion (%)",
      value: p.trainingCompletionRate?.toString() ?? null,
    },
    { label: "Last Audit", value: p.lastAuditDate },
    { label: "Next Audit Due", value: p.nextAuditDue },
    { label: "Last Audit Findings", value: p.lastAuditFindings },
  ];
}

function voluntaryDisclosures(p: ProgramView): ProgramSectionItem[] {
  return [
    { label: "Has Disclosures", value: p.hasVoluntaryDisclosures },
    {
      label: "Disclosure Count",
      value: p.voluntaryDisclosureCount?.toString() ?? null,
    },
    {
      label: "Last Disclosure Date",
      value: p.lastVoluntaryDisclosureDate,
    },
  ];
}
