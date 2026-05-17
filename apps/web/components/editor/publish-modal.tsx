"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Rocket, XCircle } from "lucide-react";
import * as React from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@workspace/ui";

import {
  approveLandingForPublish,
  buildPreview,
  fetchLandingApprovalSummary,
  getPublishJob,
  publishLandingDraft,
  rejectLandingForPublish,
  submitLandingForApproval
} from "../../lib/api/landings";

type PublishModalProps = {
  landingId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function PublishModal({
  landingId,
  isOpen,
  onOpenChange,
  onSuccess
}: PublishModalProps) {
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");

  const previewQuery = useQuery({
    queryKey: ["landings", landingId, "preview"],
    queryFn: () => buildPreview(landingId),
    enabled: isOpen && !jobId,
    staleTime: 0
  });

  const approvalSummaryQuery = useQuery({
    queryKey: ["landings", landingId, "approval-summary"],
    queryFn: () => fetchLandingApprovalSummary(landingId),
    enabled: isOpen && !jobId
  });

  const publishMutation = useMutation({
    mutationFn: () => publishLandingDraft(landingId),
    onSuccess: (data) => {
      setJobId(data.id);
    }
  });

  const submitMutation = useMutation({
    mutationFn: () => submitLandingForApproval(landingId),
    onSuccess: () => approvalSummaryQuery.refetch()
  });

  const approveMutation = useMutation({
    mutationFn: () => approveLandingForPublish(landingId, note || undefined),
    onSuccess: () => approvalSummaryQuery.refetch()
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectLandingForPublish(landingId, note || undefined),
    onSuccess: () => approvalSummaryQuery.refetch()
  });

  const jobQuery = useQuery({
    queryKey: ["publishJob", landingId, jobId],
    queryFn: () => getPublishJob(landingId, jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data?.status;
      if (state === "SUCCESS" || state === "FAILED" || state === "CANCELLED") {
        return false;
      }
      return 2000;
    }
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setJobId(null);
      setNote("");
      publishMutation.reset();
      submitMutation.reset();
      approveMutation.reset();
      rejectMutation.reset();
    }
    onOpenChange(open);
  };

  const handlePublish = () => {
    publishMutation.mutate();
  };

  const jobStatus = jobQuery.data?.status;
  const isComplete = jobStatus === "SUCCESS";
  const isFailed = jobStatus === "FAILED" || jobStatus === "CANCELLED";
  const canPublish = Boolean(approvalSummaryQuery.data?.readyToPublish);

  React.useEffect(() => {
    if (isComplete && onSuccess) {
      const timer = setTimeout(() => {
        handleOpenChange(false);
        onSuccess();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Publish Landing Page</DialogTitle>
          <DialogDescription>
            {jobId
              ? "Your landing page is being built and deployed."
              : "Review your landing page and complete approvals before publishing."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden relative rounded-md border">
          {!jobId ? (
            previewQuery.isLoading ? (
              <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Building preview...
                </span>
              </div>
            ) : previewQuery.isError ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-destructive">
                <XCircle className="h-8 w-8 mb-2" />
                <p>Failed to build preview</p>
                <p className="text-xs mt-1">{(previewQuery.error as Error).message}</p>
              </div>
            ) : (
              <iframe
                title="Publish Preview"
                srcDoc={previewQuery.data?.html}
                className="w-full h-[50vh] border-0"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] p-8 space-y-6">
              {!isComplete && !isFailed && (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-lg font-medium">Publishing in progress...</p>
                  </div>
                </>
              )}
              {isComplete && (
                <div className="flex flex-col items-center space-y-2 text-green-600 dark:text-green-500">
                  <CheckCircle2 className="h-16 w-16 mb-2" />
                  <p className="text-2xl font-bold">Successfully Published!</p>
                </div>
              )}
              {isFailed && (
                <div className="flex flex-col items-center space-y-2 text-destructive w-full">
                  <XCircle className="h-16 w-16 mb-2" />
                  <p className="text-2xl font-bold">Publish Failed</p>
                </div>
              )}
            </div>
          )}
        </div>

        {!jobId && (
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm">
              Approvals: {approvalSummaryQuery.data?.approvedCount ?? 0}/
              {approvalSummaryQuery.data?.requireApprovals ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              Required roles:{" "}
              {(approvalSummaryQuery.data?.roles ?? []).join(", ") || "ADMIN"}
            </p>
            <input
              className="w-full rounded-md border px-2 py-1 text-sm"
              placeholder="Optional note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => submitMutation.mutate()}>
                Submit
              </Button>
              <Button variant="secondary" onClick={() => approveMutation.mutate()}>
                Approve
              </Button>
              <Button variant="outline" onClick={() => rejectMutation.mutate()}>
                Reject
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {!jobId ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={
                  previewQuery.isLoading ||
                  previewQuery.isError ||
                  publishMutation.isPending ||
                  !canPublish
                }
              >
                {publishMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Rocket className="mr-2 h-4 w-4" />
                Confirm & Publish
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={!isComplete && !isFailed}
            >
              {isComplete ? "Close" : isFailed ? "Close" : "Publishing..."}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
