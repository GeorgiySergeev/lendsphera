"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@workspace/ui";

type DiffModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  affectedCells: Array<{
    productName: string;
    geoCode: string;
    before: string | null;
    after: string;
  }>;
  affectedPublishedLandings: number;
  onConfirm: () => void;
  submitting?: boolean;
};

export function DiffModal({
  open,
  onOpenChange,
  affectedCells,
  affectedPublishedLandings,
  onConfirm,
  submitting
}: DiffModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pricing diff preview</DialogTitle>
          <DialogDescription>
            This change affects {affectedCells.length} matrix cells and{" "}
            {affectedPublishedLandings} published landings.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">GEO</th>
                <th className="px-3 py-2 text-left">Before</th>
                <th className="px-3 py-2 text-left">After</th>
              </tr>
            </thead>
            <tbody>
              {affectedCells.map((row, idx) => (
                <tr key={`${row.productName}-${row.geoCode}-${idx}`} className="border-t">
                  <td className="px-3 py-2">{row.productName}</td>
                  <td className="px-3 py-2">{row.geoCode}</td>
                  <td className="px-3 py-2">{row.before ?? "-"}</td>
                  <td className="px-3 py-2 font-medium">{row.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={submitting}>
            Confirm apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
