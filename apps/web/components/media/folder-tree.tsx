"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@workspace/ui/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@workspace/ui/components/alert-dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import {
  createFolder,
  deleteFolder,
  fetchFolders,
  MEDIA_QUERY_KEYS,
  renameFolder,
  type MediaFolder
} from "../../lib/api/media";
import { useMediaStore } from "../../stores/media-store";

/* ───────── FolderNode (recursive) ───────── */

function FolderNode({ folder, depth = 0 }: { folder: MediaFolder; depth?: number }) {
  const queryClient = useQueryClient();
  const { currentFolderId, navigateTo } = useMediaStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isActive = currentFolderId === folder.id;

  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: MEDIA_QUERY_KEYS.folders(folder.id),
    queryFn: () => fetchFolders(folder.id),
    enabled: isOpen
  });

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameFolder(folder.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", "folders"] });
      setIsRenaming(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFolder(folder.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", "folders"] });
      setShowDeleteDialog(false);
    }
  });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const handleNavigate = () => {
    navigateTo(folder);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim() && renameValue.trim() !== folder.name) {
      renameMutation.mutate(renameValue.trim());
    } else {
      setIsRenaming(false);
      setRenameValue(folder.name);
    }
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsRenaming(false);
      setRenameValue(folder.name);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleNavigate}
      >
        <button
          onClick={handleToggle}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-transform",
            isOpen && "rotate-90"
          )}
        >
          <ChevronRight className="h-3 w-3" />
        </button>

        {isActive ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}

        {isRenaming ? (
          <form onSubmit={handleRenameSubmit} className="flex-1">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameSubmit}
              autoFocus
              className="h-6 text-sm px-1 py-0"
              onClick={(e) => e.stopPropagation()}
            />
          </form>
        ) : (
          <span className="flex-1 truncate">{folder.name}</span>
        )}

        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isOpen && (
        <div className="mt-0.5">
          {childrenLoading ? (
            <div className="space-y-1 px-2">
              <Skeleton
                className="h-6 w-full"
                style={{ marginLeft: `${(depth + 1) * 12}px` }}
              />
              <Skeleton
                className="h-6 w-3/4"
                style={{ marginLeft: `${(depth + 1) * 12}px` }}
              />
            </div>
          ) : children && children.length > 0 ? (
            children.map((child) => (
              <FolderNode key={child.id} folder={child} depth={depth + 1} />
            ))
          ) : (
            <p
              className="px-2 py-1 text-xs text-muted-foreground"
              style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}
            >
              No subfolders
            </p>
          )}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the folder and all its contents to trash. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ───────── FolderTree (root) ───────── */

export default function FolderTree() {
  const queryClient = useQueryClient();
  const { currentFolderId, navigateTo } = useMediaStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { data: folders, isLoading } = useQuery({
    queryKey: MEDIA_QUERY_KEYS.folders(null),
    queryFn: () => fetchFolders(null)
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createFolder(name, currentFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media", "folders"] });
      setIsCreating(false);
      setNewFolderName("");
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createMutation.mutate(newFolderName.trim());
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsCreating(false);
      setNewFolderName("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Folders
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setIsCreating(true)}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          New
        </Button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="px-2">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            onBlur={handleCreateSubmit}
            placeholder="Folder name..."
            autoFocus
            className="h-7 text-sm"
          />
        </form>
      )}

      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors",
          currentFolderId === null
            ? "bg-accent text-accent-foreground font-medium"
            : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
        )}
        onClick={() => navigateTo(null)}
      >
        <Folder className="h-4 w-4 shrink-0" />
        <span className="flex-1">All Media</span>
      </div>

      {isLoading ? (
        <div className="space-y-1 px-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : folders && folders.length > 0 ? (
        folders.map((folder) => <FolderNode key={folder.id} folder={folder} />)
      ) : (
        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
          No folders yet
        </p>
      )}
    </div>
  );
}
