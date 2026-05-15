"use client";

import * as React from "react";
import { Button } from "@workspace/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui";
import type { ComponentDetail } from "@workspace/types";

export function VariantSelectPopover({
  component,
  onPreview,
  onInsert,
  children
}: {
  component: ComponentDetail;
  onPreview: (variantId: string) => void;
  onInsert: (html: string, css: string) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string>("default");

  const variants = [
    {
      id: "default",
      name: "Default (recommended)",
      html: component.html,
      css: component.css
    },
    ...component.variants
  ];

  const handleInsert = () => {
    const v = variants.find((v) => v.id === selectedId);
    if (v) {
      onInsert(v.html, v.css || "");
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72" side="right" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium leading-none mb-3">Choose variant to insert</h4>
            <div className="space-y-2">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setSelectedId(v.id)}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedId === v.id ? "border-primary" : "border-input"}`}
                  >
                    {selectedId === v.id && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm">{v.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(selectedId)}
              className="flex-1"
            >
              Preview
            </Button>
            <Button size="sm" onClick={handleInsert} className="flex-1">
              Insert &rarr;
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
