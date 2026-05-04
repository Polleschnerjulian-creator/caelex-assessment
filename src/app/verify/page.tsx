import { ShieldCheck, FileCheck2, Bitcoin, ExternalLink } from "lucide-react";
import VerifyAnchorClient from "./VerifyAnchorClient";

export const metadata = {
  title: "Verify Audit Anchor — Caelex",
  description:
    "Independently verify a Caelex audit-log anchor against Bitcoin via OpenTimestamps. No Caelex trust required.",
};

export const dynamic = "force-static";

/**
 * Public Verify Page — Sprint 8C
 *
 * Lets any third party (regulator, investor, journalist, curious
 * party) submit an audit-anchor SHA-256 and retrieve the
 * OpenTimestamps proof bytes Caelex committed for it. The page
 * itself is fully static; the form + result rendering happens in
 * the VerifyAnchorClient island.
 *
 * The "How to verify yourself" section is critical UX: regulators
 * are exactly the audience who shouldn't take Caelex's word for it,
 * so we tell them how to validate the proof against Bitcoin offline
 * with the standard `opentimestamps-client` CLI.
 */
export default function VerifyAnchorPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
            <ShieldCheck className="h-3 w-3" />
            VERIFY · PUBLIC
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Verify a Caelex audit anchor
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
            Every quarter Caelex anchors each operator's audit-log chain head to
            Bitcoin via{" "}
            <a
              href="https://opentimestamps.org"
              className="text-emerald-400 underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenTimestamps
            </a>
            . Paste an anchor hash below to retrieve the proof bytes Caelex
            committed for it — then verify against Bitcoin offline with the
            standard OpenTimestamps client.{" "}
            <strong>Caelex does not need to be trusted</strong> for the
            cryptographic math.
          </p>
        </header>

        <VerifyAnchorClient />

        <section className="mt-10 rounded-md bg-white/[0.02] p-5 ring-1 ring-inset ring-white/[0.06]">
          <h2 className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
            <FileCheck2 className="h-3.5 w-3.5 text-emerald-400" />
            How to verify the proof yourself
          </h2>
          <ol className="space-y-3 text-[13px] leading-relaxed text-slate-300">
            <li>
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                Step 1
              </span>{" "}
              Save the proof bytes returned above as{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                anchor.ots
              </code>{" "}
              (the page offers a download button).
            </li>
            <li>
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                Step 2
              </span>{" "}
              Install the official client:{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                pip install opentimestamps-client
              </code>
            </li>
            <li>
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                Step 3
              </span>{" "}
              Run{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                ots verify anchor.ots --digest &lt;hash&gt;
              </code>{" "}
              against your local Bitcoin Core RPC (or any block-explorer- backed
              verifier of your choice). The client confirms the digest is
              committed in a specific Bitcoin block.
            </li>
            <li>
              <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                Step 4
              </span>{" "}
              Compare the digest's pre-image to the Caelex audit-log row you're
              verifying.{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">
                anchorHash = SHA-256(AuditLog.entryHash)
              </code>
              . If both the OpenTimestamps verification AND the recomputed
              digest match, the row provably existed at the confirmed Bitcoin
              block height.
            </li>
          </ol>
          <p className="mt-4 text-[12px] text-slate-500">
            Caelex never needs to be online or trusted for this verification.
            The proof is self-contained; OpenTimestamps' free public calendar
            servers attested to it; Bitcoin's blockchain confirmed it.
          </p>
          <a
            href="https://github.com/opentimestamps/opentimestamps-client"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400 transition hover:text-emerald-300"
          >
            <Bitcoin className="h-3 w-3" />
            opentimestamps-client on GitHub
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </section>

        <footer className="mt-10 border-t border-white/[0.06] pt-6 font-mono text-[10px] uppercase tracking-wider text-slate-600">
          Caelex · audit-log anchoring · OpenTimestamps · Bitcoin
        </footer>
      </main>
    </div>
  );
}
