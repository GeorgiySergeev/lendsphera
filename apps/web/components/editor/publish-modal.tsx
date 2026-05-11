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

import { buildPreview, getPublishJob, publishLandingDraft } from "../../lib/api/landings";

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

  const previewQuery = useQuery({
    queryKey: ["landings", landingId, "preview"],
    queryFn: () => buildPreview(landingId),
    enabled: isOpen && !jobId,
    staleTime: 0
  });

  const publishMutation = useMutation({
    mutationFn: () => publishLandingDraft(landingId),
    onSuccess: (data) => {
      setJobId(data.id);
    }
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
      publishMutation.reset();
    }
    onOpenChange(open);
  };

  const handlePublish = () => {
    publishMutation.mutate();
  };

  const jobStatus = jobQuery.data?.status;
  const isComplete = jobStatus === "SUCCESS";
  const isFailed = jobStatus === "FAILED" || jobStatus === "CANCELLED";

  React.useEffect(() => {
    if (isComplete && onSuccess) {
      const timer = setTimeout(() => {
        handleOpenChange(false);
        onSuccess();
      }, 2000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Publish Landing Page</DialogTitle>
          <DialogDescription>
            {jobId
              ? "Your landing page is being built and deployed."
              : "Review your landing page before publishing. It will be built, minified, and deployed to the CDN."}
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
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Compiling Tailwind CSS, minifying assets, and uploading to the edge
                      network.
                    </p>
                  </div>
                  <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
                  </div>
                </>
              )}
              {isComplete && (
                <div className="flex flex-col items-center space-y-2 text-green-600 dark:text-green-500">
                  <CheckCircle2 className="h-16 w-16 mb-2" />
                  <p className="text-2xl font-bold">Successfully Published!</p>
                  <a
                    href={jobQuery.data?.resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm underline hover:text-green-700"
                  >
                    {jobQuery.data?.resultUrl}
                  </a>
                </div>
              )}
              {isFailed && (
                <div className="flex flex-col items-center space-y-2 text-destructive w-full">
                  <XCircle className="h-16 w-16 mb-2" />
                  <p className="text-2xl font-bold">Publish Failed</p>
                  <p className="text-sm text-center">
                    An error occurred during the build process.
                  </p>
                  {jobQuery.data?.error && (
                    <div className="mt-4 w-full max-w-2xl bg-destructive/10 p-4 rounded text-xs font-mono overflow-auto max-h-32">
                      {jobQuery.data.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

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
                  publishMutation.isPending
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
