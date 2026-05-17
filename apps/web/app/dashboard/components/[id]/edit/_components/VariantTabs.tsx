"use client";

import { useComponentEditorStore } from "../../../../../../stores/component-editor.store";
import { Button } from "@workspace/ui";
import { Plus, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@workspace/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui";
import { Input } from "@workspace/ui";
import { useState } from "react";
import { componentsApi } from "../../../../../../lib/api/components";
import { toast } from "../../../../../../lib/toast";

export function VariantTabs() {
  const variants = useComponentEditorStore((state) => state.variants);
  const activeVariantId = useComponentEditorStore((state) => state.activeVariantId);
  const setActiveVariant = useComponentEditorStore((state) => state.setActiveVariant);
  const addVariant = useComponentEditorStore((state) => state.addVariant);
  const componentId = useComponentEditorStore((state) => state.componentId);
  const removeVariantLocal = useComponentEditorStore((state) => state.removeVariantLocal);

  const [newVariantName, setNewVariantName] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleCreateVariant = async () => {
    if (!newVariantName.trim() || !componentId) return;
    try {
      const activeVariant = variants.find((v) => v.id === activeVariantId);
      const newVariant = await componentsApi.createVariant(componentId, {
        name: newVariantName,
        html: activeVariant?.html || "",
        css: activeVariant?.css || ""
      });
      addVariant(newVariant);
      setIsPopoverOpen(false);
      setNewVariantName("");
      toast.success("Variant created");
    } catch {
      toast.error("Failed to create variant");
    }
  };

  const handleDelete = async (id: string) => {
    if (id === "default" || !componentId) return;
    if (!confirm("Are you sure you want to delete this variant?")) return;

    try {
      await componentsApi.deleteVariant(componentId, id);
      removeVariantLocal(id);
      toast.success("Variant deleted");
    } catch {
      toast.error("Failed to delete variant");
    }
  };

  return (
    <div className="flex h-10 items-center gap-1 border-b px-4 shrink-0 bg-muted/30 overflow-x-auto">
      {variants.map((variant) => (
        <div key={variant.id} className="group flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveVariant(variant.id)}
            className={`h-7 px-3 text-sm rounded-full ${
              activeVariantId === variant.id
                ? "bg-primary/10 text-primary font-medium hover:bg-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {variant.name}
            {variant.isDirty && <span className="ml-1 text-primary">●</span>}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              {variant.id !== "default" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => handleDelete(variant.id)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-3 text-sm text-muted-foreground ml-2"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Variant
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-3" align="start">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">New Variant</h4>
            <div className="flex gap-2">
              <Input
                value={newVariantName}
                onChange={(e) => setNewVariantName(e.target.value)}
                placeholder="Variant Name"
                className="h-8"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateVariant()}
              />
              <Button size="sm" className="h-8" onClick={handleCreateVariant}>
                Create
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
