"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { componentsApi } from "../lib/api/components";
import { toast } from "../lib/toast";
import type {
  ComponentsQueryParams,
  CreateComponentDto,
  UpdateComponentDto
} from "@workspace/types";

export const componentKeys = {
  all: ["components"] as const,
  categories: () => [...componentKeys.all, "categories"] as const,
  list: (p?: ComponentsQueryParams) => [...componentKeys.all, "list", p] as const,
  detail: (id: string) => [...componentKeys.all, "detail", id] as const
};

export function useComponentCategories() {
  return useQuery({
    queryKey: componentKeys.categories(),
    queryFn: componentsApi.listCategories
  });
}

export function useComponents(params?: ComponentsQueryParams) {
  return useQuery({
    queryKey: componentKeys.list(params),
    queryFn: () => componentsApi.list(params)
  });
}

export function useComponent(id: string) {
  return useQuery({
    queryKey: componentKeys.detail(id),
    queryFn: () => componentsApi.get(id),
    enabled: Boolean(id)
  });
}

export function useCreateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateComponentDto) => componentsApi.create(body),
    onSuccess: (component) => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all });
      toast.success("Component created", component.name);
    },
    onError: () => {
      toast.error("Could not create component");
    }
  });
}

export function useUpdateComponent(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateComponentDto) => componentsApi.update(id, body),
    onSuccess: (component) => {
      queryClient.invalidateQueries({ queryKey: componentKeys.list() });
      queryClient.invalidateQueries({ queryKey: componentKeys.detail(id) });
      toast.success("Component updated", component.name);
    },
    onError: () => {
      toast.error("Could not update component");
    }
  });
}

export function useDeleteComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => componentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all });
      toast.success("Component deleted");
    },
    onError: () => {
      toast.error("Could not delete component");
    }
  });
}

export function useDuplicateComponent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => componentsApi.duplicate(id),
    onSuccess: (component) => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all });
      toast.success("Component duplicated", component.name);
    },
    onError: () => {
      toast.error("Could not duplicate component");
    }
  });
}

export function useTrackComponentUsage() {
  return useMutation({
    mutationFn: (id: string) => componentsApi.trackUsage(id)
  });
}

export function useTrackComponentUsageWithInvalidation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => componentsApi.trackUsage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all });
    }
  });
}
