import Link from "next/link";

type AssessmentType =
  | "eu-space-act"
  | "nis2"
  | "national-space-laws"
  | "general";

interface DisclaimerBannerProps {
  assessmentType?: AssessmentType;
  variant: "inline" | "footer" | "banner";
  showTermsLink?: boolean;
}

const FOOTER_TEXTS: Record<AssessmentType, string> = {
  "eu-space-act":
    "This assessment is based on the EU Space Act proposal (COM(2025) 335). " +
    "The EU Space Act is a legislative proposal subject to amendments during the ordinary legislative procedure. " +
    "Requirements may change before final adoption. " +
    "This does not constitute legal advice. Consult qualified legal counsel for definitive compliance determinations.",
  nis2:
    "This assessment is based on the NIS2 Directive (EU) 2022/2555 and its transposition requirements. " +
    "National implementation may vary by Member State. " +
    "The EU Space Act (COM(2025) 335) is subject to amendments during the legislative process and will introduce " +
    "additional space-specific cybersecurity requirements. " +
    "This does not constitute legal advice. Consult qualified legal counsel for definitive compliance determinations.",
  "national-space-laws":
    "This assessment is based on publicly available national space legislation, which is subject to amendment " +
    "and revision by respective national governments. " +
    "Cross-references to the EU Space Act (COM(2025) 335) reflect the current proposal and may be adjusted. " +
    "The EU Space Act may supersede or modify national licensing regimes for EU Member States. " +
    "This does not constitute legal advice. Consult qualified legal counsel for definitive compliance determinations.",
  general:
    "This tool provides an indicative compliance assessment based on publicly available regulatory texts. " +
    "It does not constitute legal advice. Results are for informational purposes only and may not reflect " +
    "the latest legislative amendments or national transposition measures. " +
    "Consult qualified legal counsel for definitive compliance determinations.",
};

const INLINE_TEXT =
  "This tool provides an indicative compliance assessment based on publicly available regulatory texts. " +
  "It does not constitute legal advice. Results are for informational purposes only and may not reflect " +
  "the latest legislative amendments or national transposition measures. " +
  "Consult qualified legal counsel for definitive compliance determinations.";

export default function DisclaimerBanner({
  assessmentType = "general",
  variant,
  showTermsLink = false,
}: DisclaimerBannerProps) {
  if (variant === "banner") {
    return (
      <div className="text-[10px] text-white/30 text-center py-2.5 border-b border-white/[0.04]">
        For informational purposes only — not legal advice. See{" "}
        <Link
          href="/legal/terms"
          className="underline hover:text-white/50 transition-colors"
        >
          full terms
        </Link>
        .
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <p className="text-[11px] text-white/30 leading-relaxed max-w-3xl mx-auto text-center">
        {INLINE_TEXT}
      </p>
    );
  }

  // variant === "footer"
  const text = FOOTER_TEXTS[assessmentType];

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 mt-6">
      <p className="text-xs text-white/30 leading-relaxed">
        <strong className="text-white/40">Disclaimer:</strong> {text}
      </p>
      {showTermsLink && (
        <p className="text-xs text-white/25 mt-3">
          By using this assessment, you agree to our{" "}
          <Link
            href="/legal/terms"
            className="underline hover:text-white/40 transition-colors"
          >
            Terms of Service
          </Link>
          .
        </p>
      )}
    </div>
  );
}
