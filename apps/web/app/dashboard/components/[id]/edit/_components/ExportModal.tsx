"use client";

import { useComponentEditorStore } from "../../../../../../stores/component-editor.store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui";
import { Button } from "@workspace/ui";
import { useState, useMemo } from "react";
import { toast } from "../../../../../../lib/toast";

export function ExportModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const activeVariantId = useComponentEditorStore(state => state.activeVariantId);
  const variants = useComponentEditorStore(state => state.variants);
  const activeVariant = variants.find(v => v.id === activeVariantId);
  
  const [tab, setTab] = useState<"raw" | "cdn" | "minified">("raw");

  const buildCdnHtml = (html: string, css: string) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; }
    ${css || ''}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
  };

  const exportContent = useMemo(() => {
    if (!activeVariant) return "";
    
    if (tab === "raw") {
      return activeVariant.html + (activeVariant.css ? `\n\n<style>\n${activeVariant.css}\n</style>` : "");
    } else if (tab === "cdn") {
      return buildCdnHtml(activeVariant.html, activeVariant.css);
    } else {
      return activeVariant.html.replace(/\s+/g, ' ').trim();
    }
  }, [activeVariant, tab]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportContent);
    toast.success("Copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Export Component</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-2">
          <Button variant={tab === "raw" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("raw")}>Raw HTML</Button>
          <Button variant={tab === "cdn" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("cdn")}>With Tailwind CDN</Button>
          <Button variant={tab === "minified" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("minified")}>Minified</Button>
        </div>

        <div className="relative rounded-md border bg-muted/30">
          <textarea 
            readOnly 
            value={exportContent}
            className="w-full h-80 p-4 font-mono text-sm bg-transparent resize-none focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleCopy}>Copy to Clipboard</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
