"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@workspace/ui";
import {
  CheckCircle2,
  Copy,
  FileEdit,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Rocket,
  Trash2,
  Upload
} from "lucide-react";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import * as React from "react";
import {
  fetchAuditLogs,
  fetchLandingAuditLogs,
  type AuditAction,
  type AuditLogEntry
} from "../../lib/api/audit";

type AuditLogTableProps = {
  landingId?: string;
};

const actionIcons = {
  CREATE: Plus,
  UPDATE: FileEdit,
  DELETE: Trash2,
  RESTORE: RefreshCw,
  PUBLISH: Rocket,
  UNPUBLISH: CheckCircle2,
  DUPLICATE: Copy,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  IMPORT: Upload,
  EXPORT: Upload
};

const actionColors = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  RESTORE: "default",
  PUBLISH: "default",
  UNPUBLISH: "secondary",
  DUPLICATE: "secondary",
  LOGIN: "default",
  LOGOUT: "secondary",
  IMPORT: "default",
  EXPORT: "default"
} as const;

const filterParsers = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
  action: parseAsString.withDefault("")
};

const auditActions = new Set<AuditAction>([
  "CREATE",
  "UPDATE",
  "DELETE",
  "RESTORE",
  "PUBLISH",
  "UNPUBLISH",
  "DUPLICATE",
  "LOGIN",
  "LOGOUT",
  "IMPORT",
  "EXPORT"
]);

function toAuditAction(value: string): AuditAction | undefined {
  return auditActions.has(value as AuditAction) ? (value as AuditAction) : undefined;
}

export function AuditLogTable({ landingId }: AuditLogTableProps) {
  const [filters, setFilters] = useQueryStates(filterParsers);

  const auditQuery = useQuery({
    queryKey: landingId
      ? ["audit", "landings", landingId, filters]
      : ["audit", "global", filters],
    queryFn: () =>
      landingId
        ? fetchLandingAuditLogs(landingId, {
            page: filters.page,
            limit: filters.limit,
            action: toAuditAction(filters.action)
          })
        : fetchAuditLogs({
            page: filters.page,
            limit: filters.limit,
            action: toAuditAction(filters.action)
          })
  });

  const updateFilters = (updates: Partial<typeof filters>) => {
    void setFilters({ ...filters, ...updates });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          {auditQuery.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : auditQuery.isError ? (
            <div className="p-6">
              <p className="text-sm font-medium">Unable to load audit logs</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check the API server and authentication state, then retry.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => void auditQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditQuery.data?.items.length ? (
                  auditQuery.data.items.map((entry) => (
                    <AuditLogRow key={entry.id} entry={entry} />
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {auditQuery.data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {auditQuery.data.meta.page} of {auditQuery.data.meta.pageCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={filters.page <= 1 || auditQuery.isFetching}
              onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={
                filters.page >= auditQuery.data.meta.pageCount || auditQuery.isFetching
              }
              onClick={() => updateFilters({ page: filters.page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLogRow({ entry }: { entry: AuditLogEntry }) {
  const Icon = actionIcons[entry.action as keyof typeof actionIcons] || FileEdit;
  const color = actionColors[entry.action as keyof typeof actionColors] || "default";

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {new Date(entry.createdAt).toLocaleString()}
      </TableCell>
      <TableCell>
        <Badge variant={color} className="flex w-fit items-center gap-1">
          <Icon className="h-3 w-3" aria-hidden="true" />
          {entry.action}
        </Badge>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm font-medium">{entry.entity}</p>
          <p className="text-xs text-muted-foreground">{entry.entityId.slice(0, 8)}</p>
        </div>
      </TableCell>
      <TableCell>
        {entry.user ? (
          <div>
            <p className="text-sm font-medium">{entry.user.name || entry.user.email}</p>
            <p className="text-xs text-muted-foreground">{entry.user.email}</p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">System</span>
        )}
      </TableCell>
      <TableCell>
        {entry.diff !== null && entry.diff !== undefined && (
          <pre className="max-w-xs overflow-hidden text-ellipsis text-xs text-muted-foreground">
            {JSON.stringify(entry.diff, null, 2).slice(0, 100)}
          </pre>
        )}
      </TableCell>
    </TableRow>
  );
}
