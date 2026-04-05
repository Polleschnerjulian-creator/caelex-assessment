import SubscriptionGate from "./SubscriptionGate";
import DashboardShell from "./DashboardShell";

/**
 * Dashboard Layout (Server Component)
 *
 * Wraps the client-side DashboardShell with a server-side SubscriptionGate
 * that verifies the user has an active, paid subscription before allowing
 * access to any /dashboard/* page.
 *
 * Users on the FREE plan or without an organization are redirected to
 * /get-started?reason=no-subscription.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionGate>
      <DashboardShell>{children}</DashboardShell>
    </SubscriptionGate>
  );
}
