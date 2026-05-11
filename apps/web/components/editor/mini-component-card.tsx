"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@workspace/ui";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@workspace/ui";
import type { ComponentListItem, ComponentDetail } from "@workspace/types";
import { buildCardPreviewHtml } from "../../app/dashboard/components/_components/preview-html";
import { VariantSelectPopover } from "./variant-select-popover";
import { componentsApi } from "../../lib/api/components";

export function MiniComponentCard({
  component,
  onInsert,
  onPreview
}: {
  component: ComponentListItem;
  onInsert: (html: string, css: string) => void;
  onPreview: (componentId: string, variantId?: string) => void;
}) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [detail, setDetail] = React.useState<ComponentDetail | null>(null);
  
  // We need details to get full variants HTML if inserting/selecting variants
  const fetchDetail = React.useCallback(async () => {
    if (!detail) {
      try {
        const full = await componentsApi.get(component.id);
        setDetail(full);
        return full;
      } catch (e) {
        return null;
      }
    }
    return detail;
  }, [component.id, detail]);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'affly-component',
      componentId: component.id,
      html: component.html,
      css: "",
      name: component.name,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleInsertClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const full = await fetchDetail();
    if (component.variantsCount > 1) {
      // The popover trigger will handle opening
    } else {
      onInsert(full ? full.html : component.html, full ? (full.css || "") : "");
    }
  };

  const iframeSrc = React.useMemo(() => buildCardPreviewHtml(component), [component]);

  const content = (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onPreview(component.id)}
      className={`group relative flex flex-col cursor-grab active:cursor-grabbing border rounded-md overflow-hidden bg-background transition-all hover:border-primary/50 ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <div className="h-[70px] relative bg-muted overflow-hidden flex items-center justify-center">
        {/* We use scale to fit the component into the small box */}
        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
          <iframe 
            srcDoc={iframeSrc} 
            sandbox="allow-scripts" 
            className="w-[400%] h-[400%] border-0 origin-top-left"
            style={{ transform: 'scale(0.25)' }}
            tabIndex={-1}
          />
        </div>
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
          {component.variantsCount > 1 ? (
            <VariantSelectPopover 
              component={detail || { ...component, html: component.html, css: "", variants: [] } as any} 
              onPreview={(vid) => onPreview(component.id, vid)}
              onInsert={onInsert}
            >
              <Button 
                size="sm" 
                variant="default" 
                className="w-full h-8 text-xs font-medium"
                onMouseEnter={fetchDetail}
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Select
              </Button>
            </VariantSelectPopover>
          ) : (
            <Button 
              size="sm" 
              variant="default" 
              className="w-full h-8 text-xs font-medium"
              onClick={handleInsertClick}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Insert
            </Button>
          )}
        </div>
      </div>
      <div className="p-1.5 text-[10px] font-medium truncate text-center bg-background border-t">
        {component.name}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="w-64 p-0 rounded-md overflow-hidden border bg-background shadow-lg">
          <div className="h-[180px] relative">
            <iframe
              srcDoc={iframeSrc}
              sandbox="allow-scripts"
              className="w-full h-full border-0"
              title={component.name}
            />
          </div>
          <div className="p-2 border-t text-xs">
            <div className="font-medium">{component.name}</div>
            {component.variantsCount > 1 && (
              <div className="text-muted-foreground mt-0.5">{component.variantsCount} variants available</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
