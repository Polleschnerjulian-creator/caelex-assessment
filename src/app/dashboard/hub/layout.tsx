/**
 * HUB layout — wraps every /dashboard/hub/* page with the
 * `hub-darkmode` scope so the bright Apple-flavoured palette
 * (bg-white + #1d1d1f text + #f5f5f7 surfaces) automatically
 * inverts when the global theme is dark. The CSS layer that
 * does the actual swapping lives in globals.css under the
 * "HUB DARK-MODE SCOPE" section.
 */
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return <div className="hub-darkmode">{children}</div>;
}
