import { AuditLogTable } from "../../../../../components/audit/audit-log-table";

export default async function LandingAuditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          Landing Audit Log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all actions and changes for this landing page.
        </p>
      </div>

      <AuditLogTable landingId={id} />
    </div>
  );
}
