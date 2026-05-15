"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateBuilderPageDto,
  SaveBuilderDraftDto,
  UpdateBuilderPageDto
} from "@workspace/types";

import { builderApi } from "../lib/api/builder";
import { toast } from "../lib/toast";

export const builderKeys = {
  all: ["builder"] as const,
  list: () => [...builderKeys.all, "list"] as const,
  latest: () => [...builderKeys.all, "latest"] as const,
  detail: (id: string) => [...builderKeys.all, "detail", id] as const,
  versions: (id: string) => [...builderKeys.all, "versions", id] as const
};

export function useBuilderPages() {
  return useQuery({
    queryKey: builderKeys.list(),
    queryFn: builderApi.list
  });
}

export function useLatestBuilderPage() {
  return useQuery({
    queryKey: builderKeys.latest(),
    queryFn: builderApi.latest
  });
}

export function useBuilderPage(id: string | null) {
  return useQuery({
    queryKey: builderKeys.detail(id ?? ""),
    queryFn: () => builderApi.get(id!),
    enabled: Boolean(id)
  });
}

export function useBuilderVersions(id: string | null) {
  return useQuery({
    queryKey: builderKeys.versions(id ?? ""),
    queryFn: () => builderApi.listVersions(id!),
    enabled: Boolean(id)
  });
}

export function useCreateBuilderPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateBuilderPageDto) => builderApi.create(body),
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: builderKeys.list() });
      queryClient.setQueryData(builderKeys.latest(), page);
      queryClient.setQueryData(builderKeys.detail(page.id), page);
      toast.success("Builder page created", page.name);
    },
    onError: () => {
      toast.error("Could not create builder page");
    }
  });
}

export function useUpdateBuilderPage(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateBuilderPageDto) => builderApi.update(id, body),
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: builderKeys.list() });
      queryClient.setQueryData(builderKeys.detail(id), page);
      queryClient.setQueryData(builderKeys.latest(), page);
    },
    onError: () => {
      toast.error("Could not update builder page");
    }
  });
}

export function useSaveBuilderDraft(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SaveBuilderDraftDto) => builderApi.saveDraft(id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: builderKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: builderKeys.versions(id) });
      void queryClient.invalidateQueries({ queryKey: builderKeys.latest() });
    },
    onError: () => {
      toast.error("Could not save builder draft");
    }
  });
}

export function useDuplicateBuilderPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => builderApi.duplicate(id),
    onSuccess: (page) => {
      void queryClient.invalidateQueries({ queryKey: builderKeys.list() });
      queryClient.setQueryData(builderKeys.latest(), page);
      queryClient.setQueryData(builderKeys.detail(page.id), page);
      toast.success("Builder page duplicated", page.name);
    },
    onError: () => {
      toast.error("Could not duplicate builder page");
    }
  });
}
