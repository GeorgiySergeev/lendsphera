"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateWidgetDto,
  CreateWidgetVersionDto,
  UpdateWidgetDto,
  WidgetsQueryParams
} from "@workspace/types";

import { toast } from "../lib/toast";
import { widgetsApi } from "../lib/api/widgets";

export const widgetKeys = {
  all: ["widgets"] as const,
  list: (p?: WidgetsQueryParams) => [...widgetKeys.all, "list", p] as const,
  detail: (id: string) => [...widgetKeys.all, "detail", id] as const,
  versions: (id: string) => [...widgetKeys.all, "versions", id] as const
};

export function useWidgets(params?: WidgetsQueryParams) {
  return useQuery({
    queryKey: widgetKeys.list(params),
    queryFn: () => widgetsApi.list(params)
  });
}

export function useWidget(id: string) {
  return useQuery({
    queryKey: widgetKeys.detail(id),
    queryFn: () => widgetsApi.get(id),
    enabled: Boolean(id)
  });
}

export function useWidgetVersions(widgetId: string) {
  return useQuery({
    queryKey: widgetKeys.versions(widgetId),
    queryFn: () => widgetsApi.listVersions(widgetId),
    enabled: Boolean(widgetId)
  });
}

export function useCreateWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWidgetDto) => widgetsApi.create(body),
    onSuccess: (widget) => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.all });
      toast.success("Widget created", widget.name);
    },
    onError: () => {
      toast.error("Could not create widget");
    }
  });
}

export function useUpdateWidget(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateWidgetDto) => widgetsApi.update(id, body),
    onSuccess: (widget) => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.all });
      queryClient.invalidateQueries({ queryKey: widgetKeys.detail(id) });
      toast.success("Widget updated", widget.name);
    },
    onError: () => {
      toast.error("Could not update widget");
    }
  });
}

export function useDeleteWidget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => widgetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.all });
      toast.success("Widget deleted");
    },
    onError: () => {
      toast.error("Could not delete widget");
    }
  });
}

export function useCreateWidgetVersion(widgetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateWidgetVersionDto) =>
      widgetsApi.createVersion(widgetId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.all });
      queryClient.invalidateQueries({ queryKey: widgetKeys.detail(widgetId) });
      queryClient.invalidateQueries({ queryKey: widgetKeys.versions(widgetId) });
      toast.success("Version registered");
    },
    onError: () => {
      toast.error("Could not register version");
    }
  });
}

export function useMarkWidgetVersionLatest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => widgetsApi.markVersionLatest(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: widgetKeys.all });
      toast.success("Latest version updated");
    },
    onError: () => {
      toast.error("Could not set latest version");
    }
  });
}
