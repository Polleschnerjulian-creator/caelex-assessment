import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import {
  SoftwareApplicationJsonLd,
  FAQPageJsonLd,
} from "@/components/seo/JsonLd";

export const metadata: Metadata = pageMetadata.pricing;

const pricingFaqs = [
  {
    question: "What does Caelex replace vs. what do we still need?",
    answer:
      "Caelex automates compliance mapping, gap analysis, document preparation, and ongoing regulatory monitoring — work traditionally done by consultants at €250–400/hour. You still need: authorization fees to your NCA (~€100K per product line), specialized legal counsel for specific filings, technical compliance measures (hardware, systems), and insurance coverage. Caelex handles the preparation work, not the fees or technical implementation.",
  },
  {
    question: "What happens if we miss the 2030 deadline?",
    answer:
      "The EU Space Act enters full effect on January 1, 2030. Non-compliant operators risk authorization denial, operational restrictions, and penalties up to €10M or 2% of global turnover. Starting early gives you time to address gaps systematically.",
  },
  {
    question: "Can we switch plans as we grow?",
    answer:
      "Yes, upgrade anytime. Pricing is prorated so you only pay the difference. Downgrading is available at the end of your billing cycle. Our Founding Member discount carries over to upgrades.",
  },
  {
    question: "Is Caelex recognized by National Competent Authorities?",
    answer:
      "Caelex generates NCA-ready submission packages that follow the exact format required by each authority. Our templates are reviewed by former regulatory officials. Caelex complements but does not replace specialized legal counsel for NCA interactions.",
  },
  {
    question: "What if we operate in multiple jurisdictions?",
    answer:
      "Professional and Enterprise plans cover all 10 European jurisdictions (FR, UK, DE, LU, NL, BE, AT, DK, IT, NO). Our comparison tools help you choose the optimal authorization jurisdiction based on your specific operation.",
  },
  {
    question: "How secure is our compliance data?",
    answer:
      "We use AES-256 encryption at rest and in transit, SOC 2 Type II certified infrastructure, and host on EU servers (GDPR compliant). Enterprise customers can opt for on-premise deployment.",
  },
];

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <FAQPageJsonLd faqs={pricingFaqs} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Caelex",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "AggregateOffer",
              lowPrice: "374",
              highPrice: "2499",
              priceCurrency: "EUR",
              offerCount: "3",
            },
          }),
        }}
      />
      {children}
    </>
  );
}
