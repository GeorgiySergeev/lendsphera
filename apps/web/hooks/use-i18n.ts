"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { localizationApi } from "../lib/api/localization";
import { toast } from "../lib/toast";

export const i18nKeys = {
  all: ["i18n"] as const,
  list: (params?: Record<string, unknown>) => [...i18nKeys.all, "list", params] as const,
  missing: (params?: Record<string, unknown>) =>
    [...i18nKeys.all, "missing", params] as const,
  review: (params?: Record<string, unknown>) =>
    [...i18nKeys.all, "review", params] as const
};

export function useI18nList(params: {
  page: number;
  limit: number;
  search?: string;
  namespace?: string;
  lang?: string;
  missingFor?: string;
}) {
  return useQuery({
    queryKey: i18nKeys.list(params),
    queryFn: () => localizationApi.list(params)
  });
}

export function useI18nMissing(params: {
  lang: string;
  namespace?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: i18nKeys.missing(params),
    queryFn: () => localizationApi.missing(params),
    enabled: Boolean(params.lang)
  });
}

export function useI18nReviewQueue(params: {
  take: number;
  cursor: number;
  lang?: string;
}) {
  return useQuery({
    queryKey: i18nKeys.review(params),
    queryFn: () => localizationApi.listReviewQueue(params)
  });
}

export function useUpsertI18n() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: localizationApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: i18nKeys.all });
      toast.success("Translation saved");
    },
    onError: () => {
      toast.error("Failed to save translation");
    }
  });
}

export function useRenameI18nKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: localizationApi.rename,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: i18nKeys.all });
      toast.success("Key renamed", "Alias entry kept for backward compatibility");
    },
    onError: () => {
      toast.error("Failed to rename key");
    }
  });
}

export function useApproveI18nReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: localizationApi.approveReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: i18nKeys.all });
      toast.success("Translation approved");
    },
    onError: () => {
      toast.error("Failed to approve translation");
    }
  });
}

export function useRejectI18nReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: localizationApi.rejectReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: i18nKeys.all });
      toast.success("Translation rejected and requeued");
    },
    onError: () => {
      toast.error("Failed to reject translation");
    }
  });
}
