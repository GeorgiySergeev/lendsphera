"use client";

import Link from "next/link";
import { parseAsInteger, parseAsStringLiteral, useQueryState } from "nuqs";

import { Badge, Button } from "@workspace/ui";

import {
  useAcknowledgeComplianceIssue,
  useAutoFixComplianceIssue,
  useComplianceIssues
} from "../../../hooks/use-compliance";

const statusParser = parseAsStringLiteral([
  "OPEN",
  "ACKNOWLEDGED",
  "AUTO_FIXED"
]).withDefault("OPEN");

export default function CompliancePage() {
  const [cursor, setCursor] = useQueryState("cursor", parseAsInteger.withDefault(0));
  const [status, setStatus] = useQueryState("status", statusParser);

  const query = useComplianceIssues({
    take: 20,
    cursor,
    status
  });

  const acknowledge = useAcknowledgeComplianceIssue();
  const autoFix = useAutoFixComplianceIssue();

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Compliance Issues</h1>
          <p className="text-sm text-muted-foreground">
            Published landings violating geo compliance profiles.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["OPEN", "ACKNOWLEDGED", "AUTO_FIXED"] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={status === item ? "default" : "outline"}
            onClick={() => {
              void setStatus(item);
              void setCursor(0);
            }}
          >
            {item}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-2">Landing</th>
              <th className="px-4 py-2">Issue</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Detected</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(query.data?.items ?? []).map((issue) => (
              <tr key={issue.id} className="border-t align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{issue.landing.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {issue.landing.publicId} / {issue.landing.geo.code}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs">{issue.issueKey}</p>
                  {issue.acknowledgmentReason ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reason: {issue.acknowledgmentReason}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={issue.severity === "CRITICAL" ? "destructive" : "secondary"}
                  >
                    {issue.severity}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(issue.detectedAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/landings/${issue.landing.id}/edit`}>
                        Open landing
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={issue.status !== "OPEN" || acknowledge.isPending}
                      onClick={() => {
                        const reason = window.prompt(
                          "Acknowledge reason:",
                          "Reviewed by compliance"
                        );
                        if (!reason) {
                          return;
                        }

                        acknowledge.mutate({ id: issue.id, reason });
                      }}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      disabled={autoFix.isPending}
                      onClick={() => autoFix.mutate(issue.id)}
                    >
                      Auto-fix
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Cursor: {query.data?.meta.cursor ?? cursor}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={cursor <= 0}
            onClick={() => void setCursor(Math.max(0, cursor - 20))}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={!query.data?.meta.nextCursor}
            onClick={() => void setCursor(query.data?.meta.nextCursor ?? cursor)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
