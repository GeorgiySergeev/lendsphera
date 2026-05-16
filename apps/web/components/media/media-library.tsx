"use client";

import { useRef, useState } from "react";
import { Menu, Upload } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@workspace/ui/components/sheet";

import FolderTree from "./folder-tree";
import MediaGrid from "./media-grid";
import MediaBreadcrumb from "./media-breadcrumb";
import UploadDropzone, { type UploadDropzoneHandle } from "./upload-dropzone";
import AssetDetailSheet from "./asset-detail-sheet";
import type { MediaAsset } from "../../lib/api/media";

export default function MediaLibrary() {
  const uploadRef = useRef<UploadDropzoneHandle>(null);
  const [detailAsset, setDetailAsset] = useState<MediaAsset | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleAssetDoubleClick = (asset: MediaAsset) => {
    setDetailAsset(asset);
    setDetailOpen(true);
  };

  const handleDetailDeleted = () => {
    setDetailAsset(null);
    // no need to invalidate — deleteAssets already does it
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ─── header ─── */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          {/* mobile hamburger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-4">
              <SheetHeader>
                <SheetTitle className="text-sm">Media Folders</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FolderTree />
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-semibold">📂 Media Library</h1>
        </div>

        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => uploadRef.current?.trigger()}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Upload
        </Button>
      </div>

      {/* ─── breadcrumb ─── */}
      <div className="border-b px-4 py-2">
        <MediaBreadcrumb />
      </div>

      {/* ─── main content ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* sidebar — desktop only */}
        <aside className="hidden lg:block w-[240px] border-r overflow-y-auto p-3">
          <FolderTree />
        </aside>

        {/* main area */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <UploadDropzone ref={uploadRef} />
          <MediaGrid onAssetDoubleClick={handleAssetDoubleClick} />
        </main>
      </div>

      {/* ─── detail sheet ─── */}
      <AssetDetailSheet
        asset={detailAsset}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={handleDetailDeleted}
      />
    </div>
  );
}
