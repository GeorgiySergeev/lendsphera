"use client";

import { Eye, Pencil } from "lucide-react";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@workspace/ui";
import type { WidgetLibraryListItem } from "@workspace/types";

import { latestVersion } from "./WidgetCard";
import { formatWidgetStatus, formatWidgetType } from "./widget-labels";

type WidgetsListTableProps = {
  widgets: WidgetLibraryListItem[];
  onOpenPreview: (id: string) => void;
  onOpenEditor: (id: string) => void;
};

function WidgetsListTable({
  widgets,
  onOpenPreview,
  onOpenEditor
}: WidgetsListTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {widgets.map((w) => {
            const v = latestVersion(w);

            return (
              <TableRow key={w.id}>
                <TableCell>
                  <div className="font-medium">{w.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{w.slug}</div>
                </TableCell>
                <TableCell className="text-sm">{formatWidgetType(w.type)}</TableCell>
                <TableCell className="text-sm">{formatWidgetStatus(w.status)}</TableCell>
                <TableCell className="font-mono text-xs">{v?.version ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => onOpenPreview(w.id)}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Preview
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-2 gap-1.5"
                    onClick={() => onOpenEditor(w.id)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export { WidgetsListTable };
