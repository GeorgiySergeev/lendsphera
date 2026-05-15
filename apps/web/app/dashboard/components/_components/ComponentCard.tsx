"use client";

import {
  AlertTriangle,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Star,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@workspace/ui";
import type { ComponentListItem } from "@workspace/types";

import { componentKeys } from "../../../../hooks/use-components";
import { componentsApi } from "../../../../lib/api/components";
import { toast } from "../../../../lib/toast";
import { buildCardPreviewHtml } from "./preview-html";
import { ComponentCategoryIcon } from "./ComponentCategoryIcon";

type ComponentCardProps = {
  component: ComponentListItem;
  onOpenPreview: (id: string) => void;
  onOpenEditor: (id: string) => void;
};

function ComponentCard({ component, onOpenPreview, onOpenEditor }: ComponentCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const previewHtml = React.useMemo(() => buildCardPreviewHtml(component), [component]);
  const previewHeight = Math.max(150, Math.round(component.previewHeight / 4));

  const duplicateMutation = useMutation({
    mutationFn: () => componentsApi.duplicate(component.id),
    onSuccess: (copyComponent) => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all });
      toast.success(`Duplicated: ${component.name}`, copyComponent.name);
    },
    onError: () => toast.error("Could not duplicate component")
  });

  const pinMutation = useMutation({
    mutationFn: () =>
      componentsApi.update(component.id, { isPinned: !component.isPinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all });
      toast.success(component.isPinned ? "Component unpinned" : "Component pinned");
    },
    onError: () => toast.error("Could not update pin state")
  });

  const deleteMutation = useMutation({
    mutationFn: () => componentsApi.delete(component.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: componentKeys.all });
      toast.success("Component deleted", component.name);
    },
    onError: () => toast.error("Could not delete component")
  });

  const copyHtml = async () => {
    await navigator.clipboard.writeText(component.html);
    toast.success("HTML copied", component.name);
  };

  const addToEditor = () => {
    toast.info(
      "Open a landing first",
      "Components can be inserted from the landing editor."
    );
  };

  return (
    <Card className="group overflow-hidden rounded-lg">
      <div
        className="relative overflow-hidden border-b bg-muted"
        style={{ height: `${previewHeight}px` }}
      >
        <iframe
          title={`${component.name} preview`}
          srcDoc={previewHtml}
          className="pointer-events-none h-[400%] w-[400%] origin-top-left border-0"
          style={{ transform: "scale(0.25)" }}
          sandbox="allow-scripts"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex flex-wrap justify-center gap-2 px-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenPreview(component.id)}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              Preview
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenEditor(component.id)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
            <Button type="button" size="sm" onClick={addToEditor}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              To Editor
            </Button>
          </div>
        </div>
        <div className="absolute right-2 top-2">
          <ComponentActions
            component={component}
            onEdit={() => router.push(`/dashboard/components/${component.id}/edit`)}
            onDuplicate={() => duplicateMutation.mutate()}
            onPinToggle={() => pinMutation.mutate()}
            onCopyHtml={() => void copyHtml()}
            onDelete={() => deleteMutation.mutate()}
          />
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ComponentCategoryIcon
                slug={component.category.slug}
                icon={component.category.icon}
                className="text-muted-foreground"
              />
              <h3 className="truncate text-sm font-semibold">{component.name}</h3>
            </div>
            {component.description ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {component.description}
              </p>
            ) : null}
          </div>
          {component.isPinned ? (
            <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {component.tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Used {component.usageCount}x</span>
          {component.variantsCount > 1 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary">{component.variantsCount} variants</Badge>
              </TooltipTrigger>
              <TooltipContent>Open preview to inspect variant names</TooltipContent>
            </Tooltip>
          ) : (
            <span>1 variant</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentActions({
  component,
  onEdit,
  onDuplicate,
  onPinToggle,
  onCopyHtml,
  onDelete
}: {
  component: ComponentListItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onPinToggle: () => void;
  onCopyHtml: () => void;
  onDelete: () => void;
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-8 w-8 bg-background/90"
            aria-label="Component actions"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPinToggle}>
            {component.isPinned ? (
              <PinOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pin className="h-4 w-4" aria-hidden="true" />
            )}
            {component.isPinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyHtml}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy HTML
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            Delete component?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This soft-deletes “{component.name}” from the component library.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ComponentCard };
