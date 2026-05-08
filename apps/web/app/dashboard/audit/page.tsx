import { AuditLogTable } from "../../../components/audit/audit-log-table";

export default function AuditPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track all actions and changes across the platform.
        </p>
      </div>

      <AuditLogTable />
    </div>
  );
}
