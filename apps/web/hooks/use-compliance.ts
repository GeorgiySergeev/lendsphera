"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { complianceApi } from "../lib/api/compliance";
import { toast } from "../lib/toast";

export const complianceKeys = {
  all: ["compliance"] as const,
  issues: (params?: Record<string, unknown>) =>
    [...complianceKeys.all, "issues", params] as const
};

export function useComplianceIssues(params: {
  take: number;
  cursor: number;
  status?: "OPEN" | "ACKNOWLEDGED" | "AUTO_FIXED";
}) {
  return useQuery({
    queryKey: complianceKeys.issues(params),
    queryFn: () => complianceApi.listIssues(params)
  });
}

export function useAcknowledgeComplianceIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: complianceApi.acknowledgeIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
      toast.success("Issue acknowledged");
    },
    onError: () => {
      toast.error("Failed to acknowledge issue");
    }
  });
}

export function useAutoFixComplianceIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: complianceApi.autoFixIssue,
    onSuccess: (result: { fixed?: boolean; reason?: string }) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all });
      if (result?.fixed) {
        toast.success("Issue auto-fixed");
        return;
      }

      toast.error(result?.reason ?? "Auto-fix is not available for this issue");
    },
    onError: () => {
      toast.error("Failed to run auto-fix");
    }
  });
}
