/**
 * /dashboard/spacecraft/new — create a new Spacecraft
 *
 * Closes the chicken-and-egg gap where Mission Detail's "Assign
 * Spacecraft" panel said "Register one in the Registration module
 * first" — but the Registration module's URSO flow needed an
 * EXISTING spacecraft to register. The only previous way to add a
 * spacecraft was re-running the onboarding wizard, which is awkward
 * for existing users.
 *
 * Server Action does the create directly via Prisma scoped to the
 * authenticated user's organization. After create → redirect to
 * Missions list so the operator can assign their new spacecraft.
 */

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Rocket } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// ─── Server Action ─────────────────────────────────────────────────────────

async function createSpacecraft(formData: FormData) {
  "use server";

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Resolve organization.
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  if (!membership) {
    throw new Error(
      "No organization found — complete onboarding before creating spacecraft.",
    );
  }

  // Read + validate inputs.
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const missionType = String(
    formData.get("missionType") ?? "earth_observation",
  );
  const orbitType = String(formData.get("orbitType") ?? "LEO");
  const status = String(formData.get("status") ?? "PRE_LAUNCH") as
    | "PRE_LAUNCH"
    | "LAUNCHED"
    | "OPERATIONAL";

  const noradId = String(formData.get("noradId") ?? "").trim() || null;
  const cosparId = String(formData.get("cosparId") ?? "").trim() || null;
  const altitudeKmRaw = String(formData.get("altitudeKm") ?? "").trim();
  const altitudeKm =
    altitudeKmRaw && !isNaN(Number(altitudeKmRaw))
      ? Number(altitudeKmRaw)
      : null;
  const description = String(formData.get("description") ?? "").trim() || null;

  const launchDateRaw = String(formData.get("launchDate") ?? "").trim();
  const launchDate = launchDateRaw ? new Date(launchDateRaw) : null;
  if (launchDate && isNaN(launchDate.getTime())) {
    throw new Error("Invalid launch date");
  }

  await prisma.spacecraft.create({
    data: {
      organizationId: membership.organizationId,
      name,
      missionType,
      orbitType,
      status,
      noradId,
      cosparId,
      altitudeKm,
      launchDate,
      description,
    },
  });

  // Tell Next to invalidate any mission/spacecraft listings.
  revalidatePath("/dashboard/missions");
  revalidatePath("/dashboard/modules/registration");

  // Redirect to Missions so the operator can assign their new spacecraft.
  redirect("/dashboard/missions");
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function NewSpacecraftPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/spacecraft/new");
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      {/* Breadcrumb / back-link */}
      <Link
        href="/dashboard/missions"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Missions
      </Link>

      <header className="mt-6 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              boxShadow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
            }}
          >
            <Rocket className="h-5 w-5 text-emerald-300" strokeWidth={1.75} />
          </div>
          <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
            New Spacecraft
          </h1>
        </div>
        <p className="text-sm text-slate-400 max-w-lg">
          Register a satellite, ground station, or other space asset in your
          organization. After creating, you can assign it to a Mission and
          register it with the UN Registry (URSO) under Compliance → Authority
          Submissions.
        </p>
      </header>

      <form action={createSpacecraft} className="space-y-5">
        {/* Required: Name */}
        <Field
          label="Name *"
          hint="e.g. 'Bluebird-1', 'Sentinel-7', 'Aurora Beta'"
        >
          <input
            name="name"
            type="text"
            required
            maxLength={100}
            autoFocus
            className={INPUT_CLS}
            placeholder="Spacecraft name"
          />
        </Field>

        {/* Mission type + Orbit type — required-ish (have defaults) */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mission type *">
            <select
              name="missionType"
              defaultValue="earth_observation"
              className={INPUT_CLS}
            >
              <option value="earth_observation">Earth Observation</option>
              <option value="communication">Communication</option>
              <option value="navigation">Navigation</option>
              <option value="science">Science</option>
              <option value="sar">SAR (Synthetic Aperture Radar)</option>
              <option value="technology_demonstration">
                Technology Demonstration
              </option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Orbit type *">
            <select name="orbitType" defaultValue="LEO" className={INPUT_CLS}>
              <option value="LEO">LEO (Low Earth Orbit)</option>
              <option value="MEO">MEO (Medium Earth Orbit)</option>
              <option value="GEO">GEO (Geostationary)</option>
              <option value="HEO">HEO (Highly Elliptical)</option>
            </select>
          </Field>
        </div>

        {/* Status */}
        <Field label="Status">
          <select name="status" defaultValue="PRE_LAUNCH" className={INPUT_CLS}>
            <option value="PRE_LAUNCH">Pre-launch (planned)</option>
            <option value="LAUNCHED">Launched</option>
            <option value="OPERATIONAL">Operational</option>
          </select>
        </Field>

        {/* Optional: identifiers + altitude + launch date */}
        <details className="rounded-lg border border-slate-800 bg-slate-900/30 px-4 py-3">
          <summary className="cursor-pointer text-sm text-slate-300 hover:text-slate-100 select-none">
            Optional details
          </summary>
          <div className="mt-4 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="COSPAR ID"
                hint="International designator (e.g. '2027-001A')"
              >
                <input
                  name="cosparId"
                  type="text"
                  maxLength={20}
                  className={INPUT_CLS}
                  placeholder="2027-001A"
                />
              </Field>
              <Field
                label="NORAD ID"
                hint="Catalog number from CelesTrak / Space-Track"
              >
                <input
                  name="noradId"
                  type="text"
                  maxLength={20}
                  className={INPUT_CLS}
                  placeholder="60001"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Altitude (km)">
                <input
                  name="altitudeKm"
                  type="number"
                  step="0.1"
                  min="0"
                  className={INPUT_CLS}
                  placeholder="550"
                />
              </Field>
              <Field label="Planned launch date">
                <input name="launchDate" type="date" className={INPUT_CLS} />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                name="description"
                rows={3}
                maxLength={2000}
                className={INPUT_CLS}
                placeholder="Mission profile, payload, customer, anything else worth noting…"
              />
            </Field>
          </div>
        </details>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
          <Link
            href="/dashboard/missions"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "rgb(16, 185, 129)",
              color: "rgb(6, 78, 59)",
            }}
          >
            Create Spacecraft
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── UI helpers ────────────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40 focus:bg-slate-900/60 transition-colors";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
