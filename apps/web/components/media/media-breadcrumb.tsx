"use client";

import { ChevronRight, Home } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import { useMediaStore } from "../../stores/media-store";

export default function MediaBreadcrumb() {
  const { folderPath, currentFolderId, navigateTo } = useMediaStore();

  const isRoot = currentFolderId === null;
  const path = folderPath;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-muted-foreground min-h-6"
    >
      {/* Root */}
      <button
        onClick={() => navigateTo(null)}
        className={cn(
          "flex items-center gap-1 transition-colors hover:text-foreground",
          isRoot && "text-foreground font-medium"
        )}
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">All Media</span>
      </button>

      {/* Path segments */}
      {path.map((folder, idx) => {
        const isLast = idx === path.length - 1;
        const isActive = isLast && currentFolderId === folder.id;

        return (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            {isActive ? (
              <span className="text-foreground font-medium truncate max-w-[160px] sm:max-w-xs">
                {folder.name}
              </span>
            ) : (
              <button
                onClick={() => navigateTo(folder)}
                className="hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[180px]"
              >
                {folder.name}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
