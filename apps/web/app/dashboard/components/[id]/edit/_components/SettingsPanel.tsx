"use client";

import { useComponentEditorStore } from "../../../../../../stores/component-editor.store";
import { Input, Button, Badge } from "@workspace/ui";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function SettingsPanel() {
  const name = useComponentEditorStore((s) => s.name);
  const description = useComponentEditorStore((s) => s.description);
  const categoryId = useComponentEditorStore((s) => s.categoryId);
  const previewBg = useComponentEditorStore((s) => s.previewBg);
  const previewHeight = useComponentEditorStore((s) => s.previewHeight);
  const tags = useComponentEditorStore((s) => s.tags);
  const updateMetadata = useComponentEditorStore((s) => s.updateMetadata);

  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      updateMetadata({ tags: [...tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  return (
    <div className="flex flex-col p-4 space-y-6">
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Component Settings</h3>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Name</label>
          <Input
            value={name}
            onChange={(e) => updateMetadata({ name: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => updateMetadata({ description: e.target.value })}
            className="w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Category ID</label>
          <Input
            value={categoryId}
            onChange={(e) => updateMetadata({ categoryId: e.target.value })}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Tags</label>
          <div className="flex gap-1">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              className="h-8 text-sm"
              placeholder="Add tag..."
            />
            <Button size="sm" onClick={handleAddTag} className="h-8 px-2">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs py-0 h-5">
                {tag}
                <button
                  onClick={() => updateMetadata({ tags: tags.filter((t) => t !== tag) })}
                  className="ml-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-medium text-sm">Preview Settings</h3>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Background Color</label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={previewBg || "#f9fafb"}
              onChange={(e) => updateMetadata({ previewBg: e.target.value })}
              className="h-8 w-12 p-1"
            />
            <Input
              value={previewBg}
              onChange={(e) => updateMetadata({ previewBg: e.target.value })}
              className="h-8 flex-1 font-mono text-xs"
              placeholder="Inherit"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Height Hint (px)</label>
          <Input
            type="number"
            value={previewHeight || ""}
            onChange={(e) =>
              updateMetadata({ previewHeight: parseInt(e.target.value) || 0 })
            }
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
