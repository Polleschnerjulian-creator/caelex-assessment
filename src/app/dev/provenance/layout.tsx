/**
 * Dev preview layout — wraps LanguageProvider so components that rely on
 * the i18n context render correctly outside of /atlas and /dashboard.
 *
 * This route is intentionally public — it contains no user data, just
 * component mock-ups. Safe to share with design / stakeholders.
 */

import { LanguageProvider } from "@/components/providers/LanguageProvider";

export const metadata = {
  title: "Dev Preview — Caelex",
  description: "Internal component preview. No user data.",
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
