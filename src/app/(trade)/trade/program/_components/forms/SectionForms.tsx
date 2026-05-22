"use client";

/**
 * Trade program section forms (Sprint E3b).
 *
 * One stateful form per section. Each form:
 *  - Receives the current ProgramView snapshot
 *  - Manages local state via useState + a single dirty-tracking object
 *  - On submit, calls the corresponding server action, surfaces the
 *    result, and invokes onSuccess() so the parent can close the drawer
 *
 * All forms share the same primitives + footer shape — keeping them
 * in one file avoids 7x boilerplate of imports and useState wiring.
 */

import { useState, useTransition } from "react";
import type { ProgramView } from "@/lib/trade/program-service";
import {
  updateCompanyProfile,
  updateRegistration,
  updateEmpoweredOfficial,
  updateJurisdiction,
  updateLicenseCounters,
  updateTrainingAudit,
  updateVoluntaryDisclosures,
  type ActionResult,
} from "@/lib/trade/program-actions";
import {
  TextField,
  NumberField,
  DateField,
  BooleanField,
  SelectField,
  TextAreaField,
  FormFooter,
} from "./form-primitives";

interface FormBaseProps {
  program: ProgramView;
  onSuccess: () => void;
  onCancel: () => void;
}

function useSectionSubmit() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function submit(action: () => Promise<ActionResult>, onSuccess: () => void) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        onSuccess();
      } else {
        const fieldErrs = result.fieldErrors
          ? Object.entries(result.fieldErrors)
              .map(([k, v]) => `${k}: ${v.join(", ")}`)
              .join(" · ")
          : "";
        setError(fieldErrs ? `${result.error} — ${fieldErrs}` : result.error);
      }
    });
  }

  return { isPending, error, submit };
}

// ─── Company Profile ────────────────────────────────────────────────

export function CompanyProfileForm({
  program,
  onSuccess,
  onCancel,
}: FormBaseProps) {
  const [hasITARItems, setHasITARItems] = useState(program.hasITARItems);
  const [hasEARItems, setHasEARItems] = useState(program.hasEARItems);
  const [hasForeignNationals, setHasForeignNationals] = useState(
    program.hasForeignNationals,
  );
  const [hasTechnologyTransfer, setHasTechnologyTransfer] = useState(
    program.hasTechnologyTransfer,
  );
  const [hasDefenseContracts, setHasDefenseContracts] = useState(
    program.hasDefenseContracts,
  );
  const [hasManufacturingAbroad, setHasManufacturingAbroad] = useState(
    program.hasManufacturingAbroad,
  );
  const [hasJointVentures, setHasJointVentures] = useState(
    program.hasJointVentures,
  );
  const [annualExportValueEur, setAnnualExportValueEur] = useState<string>(
    program.annualExportValueEur?.toString() ?? "",
  );

  const { isPending, error, submit } = useSectionSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(
      () =>
        updateCompanyProfile({
          hasITARItems,
          hasEARItems,
          hasForeignNationals,
          hasTechnologyTransfer,
          hasDefenseContracts,
          hasManufacturingAbroad,
          hasJointVentures,
          annualExportValueEur: annualExportValueEur || undefined,
        }),
      onSuccess,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <BooleanField
          label="Has ITAR Items"
          value={hasITARItems}
          onChange={setHasITARItems}
          helper="Defense articles on the United States Munitions List."
        />
        <BooleanField
          label="Has EAR Items"
          value={hasEARItems}
          onChange={setHasEARItems}
          helper="Dual-use items controlled under the Export Administration Regulations."
        />
        <BooleanField
          label="Has Foreign Nationals"
          value={hasForeignNationals}
          onChange={setHasForeignNationals}
          helper="Employees, contractors or visitors with non-US person status (relevant for deemed exports)."
        />
        <BooleanField
          label="Technology Transfer"
          value={hasTechnologyTransfer}
          onChange={setHasTechnologyTransfer}
        />
        <BooleanField
          label="Defense Contracts"
          value={hasDefenseContracts}
          onChange={setHasDefenseContracts}
        />
        <BooleanField
          label="Manufacturing Abroad"
          value={hasManufacturingAbroad}
          onChange={setHasManufacturingAbroad}
        />
        <BooleanField
          label="Joint Ventures"
          value={hasJointVentures}
          onChange={setHasJointVentures}
        />
      </div>

      <NumberField
        label="Annual Export Value (EUR)"
        value={
          annualExportValueEur === "" ? null : Number(annualExportValueEur)
        }
        onChange={setAnnualExportValueEur}
        min={0}
        placeholder="0"
        helper="Total annual value of exported items in euros."
      />

      <FormFooter onCancel={onCancel} isPending={isPending} error={error} />
    </form>
  );
}

// ─── Registration & Infrastructure ──────────────────────────────────

export function RegistrationForm({
  program,
  onSuccess,
  onCancel,
}: FormBaseProps) {
  const [registeredWithDDTC, setRegisteredWithDDTC] = useState(
    program.registeredWithDDTC,
  );
  const [ddtcRegistrationNo, setDdtcRegistrationNo] = useState(
    program.ddtcRegistrationNo ?? "",
  );
  const [ddtcRegistrationExpiry, setDdtcRegistrationExpiry] = useState<string>(
    program.ddtcRegistrationExpiry
      ? new Date(program.ddtcRegistrationExpiry).toISOString().slice(0, 10)
      : "",
  );
  const [hasTCP, setHasTCP] = useState(program.hasTCP);
  const [tcpLastReviewDate, setTcpLastReviewDate] = useState<string>(
    program.tcpLastReviewDate
      ? new Date(program.tcpLastReviewDate).toISOString().slice(0, 10)
      : "",
  );
  const [hasECL, setHasECL] = useState(program.hasECL);
  const [hasAutomatedScreening, setHasAutomatedScreening] = useState(
    program.hasAutomatedScreening,
  );
  const [screeningVendor, setScreeningVendor] = useState(
    program.screeningVendor ?? "",
  );

  const { isPending, error, submit } = useSectionSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(
      () =>
        updateRegistration({
          registeredWithDDTC,
          ddtcRegistrationNo,
          ddtcRegistrationExpiry,
          hasTCP,
          tcpLastReviewDate,
          hasECL,
          hasAutomatedScreening,
          screeningVendor,
        }),
      onSuccess,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <BooleanField
        label="Registered with DDTC"
        value={registeredWithDDTC}
        onChange={setRegisteredWithDDTC}
        helper="Required for any manufacturer/exporter/broker of ITAR items."
      />
      <TextField
        label="DDTC Registration Number"
        value={ddtcRegistrationNo}
        onChange={setDdtcRegistrationNo}
        placeholder="M-XXXXX"
        helper="Stored encrypted (AES-256-GCM)."
      />
      <DateField
        label="DDTC Registration Expiry"
        value={ddtcRegistrationExpiry ? new Date(ddtcRegistrationExpiry) : null}
        onChange={setDdtcRegistrationExpiry}
      />
      <BooleanField
        label="Has Technology Control Plan (TCP)"
        value={hasTCP}
        onChange={setHasTCP}
      />
      <DateField
        label="TCP Last Review Date"
        value={tcpLastReviewDate ? new Date(tcpLastReviewDate) : null}
        onChange={setTcpLastReviewDate}
      />
      <BooleanField
        label="Has Export Compliance List (ECL)"
        value={hasECL}
        onChange={setHasECL}
      />
      <BooleanField
        label="Automated Screening Enabled"
        value={hasAutomatedScreening}
        onChange={setHasAutomatedScreening}
      />
      <TextField
        label="Screening Vendor"
        value={screeningVendor}
        onChange={setScreeningVendor}
        placeholder="Caelex Trade, Visual Compliance, Descartes, …"
      />

      <FormFooter onCancel={onCancel} isPending={isPending} error={error} />
    </form>
  );
}

// ─── Empowered Official ─────────────────────────────────────────────

export function EmpoweredOfficialForm({
  program,
  onSuccess,
  onCancel,
}: FormBaseProps) {
  const [empoweredOfficialName, setName] = useState(
    program.empoweredOfficialName ?? "",
  );
  const [empoweredOfficialEmail, setEmail] = useState(
    program.empoweredOfficialEmail ?? "",
  );
  const [empoweredOfficialTitle, setTitle] = useState(
    program.empoweredOfficialTitle ?? "",
  );

  const { isPending, error, submit } = useSectionSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(
      () =>
        updateEmpoweredOfficial({
          empoweredOfficialName,
          empoweredOfficialEmail,
          empoweredOfficialTitle,
        }),
      onSuccess,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <TextField
        label="Name"
        value={empoweredOfficialName}
        onChange={setName}
        placeholder="Jane Doe"
      />
      <TextField
        label="Email"
        type="email"
        value={empoweredOfficialEmail}
        onChange={setEmail}
        placeholder="empowered.official@example.com"
        helper="Stored encrypted. Used for ITAR notifications + audit trail."
      />
      <TextField
        label="Title"
        value={empoweredOfficialTitle}
        onChange={setTitle}
        placeholder="Chief Compliance Officer"
      />

      <FormFooter onCancel={onCancel} isPending={isPending} error={error} />
    </form>
  );
}

// ─── Jurisdiction ───────────────────────────────────────────────────

const JURISDICTION_OPTIONS = [
  { value: "itar_only", label: "ITAR only" },
  { value: "ear_only", label: "EAR only" },
  { value: "dual_use", label: "Dual-use (ITAR + EAR)" },
  { value: "itar_with_ear_parts", label: "ITAR with EAR parts" },
  { value: "ear99", label: "EAR99" },
];

export function JurisdictionForm({
  program,
  onSuccess,
  onCancel,
}: FormBaseProps) {
  const [jurisdictionDetermination, setDetermination] = useState(
    program.jurisdictionDetermination ?? "",
  );
  const [jurisdictionDeterminationDate, setDeterminationDate] =
    useState<string>(
      program.jurisdictionDeterminationDate
        ? new Date(program.jurisdictionDeterminationDate)
            .toISOString()
            .slice(0, 10)
        : "",
    );
  const [hasCJRequest, setHasCJRequest] = useState(program.hasCJRequest);
  const [cjRequestDate, setCjRequestDate] = useState<string>(
    program.cjRequestDate
      ? new Date(program.cjRequestDate).toISOString().slice(0, 10)
      : "",
  );
  const [cjDetermination, setCjDetermination] = useState(
    program.cjDetermination ?? "",
  );
  const [cjDeterminationDate, setCjDeterminationDate] = useState<string>(
    program.cjDeterminationDate
      ? new Date(program.cjDeterminationDate).toISOString().slice(0, 10)
      : "",
  );

  const { isPending, error, submit } = useSectionSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(
      () =>
        updateJurisdiction({
          jurisdictionDetermination,
          jurisdictionDeterminationDate,
          hasCJRequest,
          cjRequestDate,
          cjDetermination,
          cjDeterminationDate,
        }),
      onSuccess,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SelectField
        label="Jurisdiction Determination"
        value={jurisdictionDetermination}
        onChange={setDetermination}
        options={JURISDICTION_OPTIONS}
        placeholder="Not yet determined"
      />
      <DateField
        label="Determination Date"
        value={
          jurisdictionDeterminationDate
            ? new Date(jurisdictionDeterminationDate)
            : null
        }
        onChange={setDeterminationDate}
      />

      <hr className="border-trade-border-subtle" />

      <BooleanField
        label="CJ Request Filed"
        value={hasCJRequest}
        onChange={setHasCJRequest}
        helper="Commodity Jurisdiction request filed with DDTC (DS-4076)."
      />
      <DateField
        label="CJ Request Date"
        value={cjRequestDate ? new Date(cjRequestDate) : null}
        onChange={setCjRequestDate}
      />
      <TextField
        label="CJ Determination"
        value={cjDetermination}
        onChange={setCjDetermination}
        placeholder="e.g. EAR-controlled, EAR99, ITAR Cat XV(a) …"
      />
      <DateField
        label="CJ Determination Date"
        value={cjDeterminationDate ? new Date(cjDeterminationDate) : null}
        onChange={setCjDeterminationDate}
      />

      <FormFooter onCancel={onCancel} isPending={isPending} error={error} />
    </form>
  );
}

// ─── License Counters ───────────────────────────────────────────────

export function LicenseCountersForm({
  program,
  onSuccess,
  onCancel,
}: FormBaseProps) {
  const [activeITARLicenses, setActiveITAR] = useState<string>(
    program.activeITARLicenses?.toString() ?? "",
  );
  const [pendingITARLicenses, setPendingITAR] = useState<string>(
    program.pendingITARLicenses?.toString() ?? "",
  );
  const [activeTAAs, setActiveTAAs] = useState<string>(
    program.activeTAAs?.toString() ?? "",
  );
  const [activeMLAs, setActiveMLAs] = useState<string>(
    program.activeMLAs?.toString() ?? "",
  );
  const [activeEARLicenses, setActiveEAR] = useState<string>(
    program.activeEARLicenses?.toString() ?? "",
  );
  const [pendingEARLicenses, setPendingEAR] = useState<string>(
    program.pendingEARLicenses?.toString() ?? "",
  );
  const [usesLicenseExceptions, setUsesExceptions] = useState(
    program.usesLicenseExceptions,
  );

  const { isPending, error, submit } = useSectionSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(
      () =>
        updateLicenseCounters({
          activeITARLicenses,
          pendingITARLicenses,
          activeTAAs,
          activeMLAs,
          activeEARLicenses,
          pendingEARLicenses,
          usesLicenseExceptions,
        }),
      onSuccess,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <NumberField
          label="Active ITAR Licenses"
          value={activeITARLicenses === "" ? null : Number(activeITARLicenses)}
          onChange={setActiveITAR}
          min={0}
        />
        <NumberField
          label="Pending ITAR Licenses"
          value={
            pendingITARLicenses === "" ? null : Number(pendingITARLicenses)
          }
          onChange={setPendingITAR}
          min={0}
        />
        <NumberField
          label="Active TAAs"
          value={activeTAAs === "" ? null : Number(activeTAAs)}
          onChange={setActiveTAAs}
          min={0}
        />
        <NumberField
          label="Active MLAs"
          value={activeMLAs === "" ? null : Number(activeMLAs)}
          onChange={setActiveMLAs}
          min={0}
        />
        <NumberField
          label="Active EAR Licenses"
          value={activeEARLicenses === "" ? null : Number(activeEARLicenses)}
          onChange={setActiveEAR}
          min={0}
        />
        <NumberField
          label="Pending EAR Licenses"
          value={pendingEARLicenses === "" ? null : Number(pendingEARLicenses)}
          onChange={setPendingEAR}
          min={0}
        />
      </div>

      <BooleanField
        label="Uses License Exceptions"
        value={usesLicenseExceptions}
        onChange={setUsesExceptions}
        helper="Whether the org relies on STA, ENC, GOV, TMP or other EAR license exceptions."
      />

      <FormFooter onCancel={onCancel} isPending={isPending} error={error} />
    </form>
  );
}

// ─── Training & Audit ───────────────────────────────────────────────

export function TrainingAuditForm({
  program,
  onSuccess,
  onCancel,
}: FormBaseProps) {
  const [lastTrainingDate, setLastTraining] = useState<string>(
    program.lastTrainingDate
      ? new Date(program.lastTrainingDate).toISOString().slice(0, 10)
      : "",
  );
  const [nextTrainingDue, setNextTraining] = useState<string>(
    program.nextTrainingDue
      ? new Date(program.nextTrainingDue).toISOString().slice(0, 10)
      : "",
  );
  const [trainingCompletionRate, setCompletion] = useState<string>(
    program.trainingCompletionRate?.toString() ?? "",
  );
  const [lastAuditDate, setLastAudit] = useState<string>(
    program.lastAuditDate
      ? new Date(program.lastAuditDate).toISOString().slice(0, 10)
      : "",
  );
  const [nextAuditDue, setNextAudit] = useState<string>(
    program.nextAuditDue
      ? new Date(program.nextAuditDue).toISOString().slice(0, 10)
      : "",
  );
  const [lastAuditFindings, setLastFindings] = useState(
    program.lastAuditFindings ?? "",
  );

  const { isPending, error, submit } = useSectionSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(
      () =>
        updateTrainingAudit({
          lastTrainingDate,
          nextTrainingDue,
          trainingCompletionRate,
          lastAuditDate,
          nextAuditDue,
          lastAuditFindings,
        }),
      onSuccess,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <DateField
          label="Last Training Date"
          value={lastTrainingDate ? new Date(lastTrainingDate) : null}
          onChange={setLastTraining}
        />
        <DateField
          label="Next Training Due"
          value={nextTrainingDue ? new Date(nextTrainingDue) : null}
          onChange={setNextTraining}
        />
      </div>
      <NumberField
        label="Training Completion (%)"
        value={
          trainingCompletionRate === "" ? null : Number(trainingCompletionRate)
        }
        onChange={setCompletion}
        min={0}
        max={100}
        step={1}
        helper="Share of required personnel who completed export-control training."
      />
      <div className="grid grid-cols-2 gap-4">
        <DateField
          label="Last Audit Date"
          value={lastAuditDate ? new Date(lastAuditDate) : null}
          onChange={setLastAudit}
        />
        <DateField
          label="Next Audit Due"
          value={nextAuditDue ? new Date(nextAuditDue) : null}
          onChange={setNextAudit}
        />
      </div>
      <TextAreaField
        label="Last Audit Findings"
        value={lastAuditFindings}
        onChange={setLastFindings}
        rows={5}
        placeholder="Summary of internal/external audit findings, remediation status, …"
      />

      <FormFooter onCancel={onCancel} isPending={isPending} error={error} />
    </form>
  );
}

// ─── Voluntary Disclosures ──────────────────────────────────────────

export function VoluntaryDisclosuresForm({
  program,
  onSuccess,
  onCancel,
}: FormBaseProps) {
  const [hasVoluntaryDisclosures, setHas] = useState(
    program.hasVoluntaryDisclosures,
  );
  const [voluntaryDisclosureCount, setCount] = useState<string>(
    program.voluntaryDisclosureCount?.toString() ?? "",
  );
  const [lastVoluntaryDisclosureDate, setLastDate] = useState<string>(
    program.lastVoluntaryDisclosureDate
      ? new Date(program.lastVoluntaryDisclosureDate).toISOString().slice(0, 10)
      : "",
  );

  const { isPending, error, submit } = useSectionSubmit();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(
      () =>
        updateVoluntaryDisclosures({
          hasVoluntaryDisclosures,
          voluntaryDisclosureCount,
          lastVoluntaryDisclosureDate,
        }),
      onSuccess,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <BooleanField
        label="Has Voluntary Disclosures"
        value={hasVoluntaryDisclosures}
        onChange={setHas}
        helper="VSD filings with BIS, DDTC or OFAC (a positive history can reduce penalties)."
      />
      <NumberField
        label="Disclosure Count"
        value={
          voluntaryDisclosureCount === ""
            ? null
            : Number(voluntaryDisclosureCount)
        }
        onChange={setCount}
        min={0}
      />
      <DateField
        label="Last Disclosure Date"
        value={
          lastVoluntaryDisclosureDate
            ? new Date(lastVoluntaryDisclosureDate)
            : null
        }
        onChange={setLastDate}
      />

      <FormFooter onCancel={onCancel} isPending={isPending} error={error} />
    </form>
  );
}
