import type { LegalSource, Authority } from "@/data/legal-sources";

/**
 * Emits a JSON-LD script tag with schema.org/Legislation markup.
 * Google picks this up for its Legal data vertical and improves
 * the chance of rich-result listings (legal-topic carousels,
 * related-to-treaty knowledge panels).
 *
 * Zero runtime cost — pure server-rendered script tag.
 */
export function SchemaOrgLegislation({
  sources,
  authorities,
  pageUrl,
}: {
  sources: LegalSource[];
  authorities?: Authority[];
  pageUrl: string;
}) {
  const items = [
    ...sources.map((s) => ({
      "@context": "https://schema.org",
      "@type": "Legislation",
      name: s.title_en,
      alternateName: s.title_local ?? undefined,
      legislationIdentifier: s.official_reference ?? s.un_reference ?? s.id,
      legislationType: s.type,
      legislationJurisdiction: s.jurisdiction,
      legislationDate: s.date_in_force ?? s.date_enacted,
      legislationDateVersion: s.date_last_amended,
      legislationLegalForce: s.status === "in_force" ? "InForce" : "NotInForce",
      url: s.source_url,
      publisher: s.issuing_body
        ? {
            "@type": "Organization",
            name: s.issuing_body,
          }
        : undefined,
      about: s.scope_description,
      isBasedOn: s.amends
        ? { "@type": "Legislation", identifier: s.amends }
        : undefined,
    })),
    ...(authorities ?? []).map((a) => ({
      "@context": "https://schema.org",
      "@type": "GovernmentOrganization",
      name: a.name_en,
      alternateName: a.name_local,
      abbreviation: a.abbreviation,
      url: a.website,
      address: a.address,
      email: a.contact_email,
      telephone: a.contact_phone,
      description: a.space_mandate,
      mainEntityOfPage: pageUrl,
    })),
  ];

  // H9: JSON.stringify does NOT escape "</script>"; if any curator-supplied
  // field (e.g. scope_description with embedded markup) contains that
  // substring, the <script> tag is closed early and arbitrary HTML follows.
  // Neutralise by replacing "<" with its Unicode escape and covering the
  // LINE SEPARATOR / PARAGRAPH SEPARATOR characters that break JSON parsers.
  const safeJson = JSON.stringify(items)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  );
}
