import { DashboardShell } from "../../components/dashboard/dashboard-shell";
import { AuthGuard } from "../../components/providers/auth-guard";

export default function DashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGuard>
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
