"use client";

import {
  Check,
  ChevronDown,
  Copy,
  Monitor,
  Pencil,
  Plus,
  Smartphone,
  Tablet
} from "lucide-react";
import * as React from "react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Skeleton,
  cn
} from "@workspace/ui";

import { useComponent } from "../../../../hooks/use-components";
import { toast } from "../../../../lib/toast";
import { buildPreviewHtml } from "./preview-html";

type Device = "mobile" | "tablet" | "desktop";

type ComponentPreviewDrawerProps = {
  componentId: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (id: string) => void;
};

const deviceWidths: Record<Device, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1440
};

function ComponentPreviewDrawer({
  componentId,
  isOpen,
  onOpenChange,
  onEdit
}: ComponentPreviewDrawerProps) {
  const componentQuery = useComponent(componentId ?? "");
  const component = componentQuery.data;
  const [device, setDevice] = React.useState<Device>("desktop");
  const [variantId, setVariantId] = React.useState<string>("default");

  React.useEffect(() => {
    if (componentId) {
      setVariantId("default");
      setDevice("desktop");
    }
  }, [componentId]);

  const selectedVariant =
    variantId === "default"
      ? null
      : (component?.variants.find((variant) => variant.id === variantId) ?? null);
  const variants = component?.variants.filter((variant) => !variant.isDefault) ?? [];
  const srcDoc = component ? buildPreviewHtml(component, selectedVariant) : "";
  const currentHtml = selectedVariant?.html ?? component?.html ?? "";

  const copyHtml = async () => {
    await navigator.clipboard.writeText(currentHtml);
    toast.success("HTML copied", component?.name);
  };

  const addToEditor = () => {
    toast.info(
      "Open a landing first",
      "Components can be inserted from the landing editor."
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[95vw] flex-col p-0 sm:w-[88vw] xl:w-[55vw]"
      >
        <SheetHeader className="border-b p-4 pr-12">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <SheetTitle className="truncate">
                {component?.name ?? "Component preview"}
              </SheetTitle>
              <SheetDescription>
                Preview full component HTML across common canvas widths.
              </SheetDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-36 justify-between gap-2"
                  >
                    {selectedVariant?.name ?? "Default"}
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setVariantId("default")}>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        variantId === "default" ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    Default
                  </DropdownMenuItem>
                  {variants.map((variant) => (
                    <DropdownMenuItem
                      key={variant.id}
                      onClick={() => setVariantId(variant.id)}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          variantId === variant.id ? "opacity-100" : "opacity-0"
                        )}
                        aria-hidden="true"
                      />
                      {variant.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="outline"
                onClick={() => component && onEdit(component.id)}
                disabled={!component}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex items-center gap-2 border-b px-4 py-3">
          <DeviceButton
            device="mobile"
            active={device === "mobile"}
            onClick={setDevice}
          />
          <DeviceButton
            device="tablet"
            active={device === "tablet"}
            onClick={setDevice}
          />
          <DeviceButton
            device="desktop"
            active={device === "desktop"}
            onClick={setDevice}
          />
          <span className="ml-auto text-xs text-muted-foreground">
            {deviceWidths[device]}px canvas
          </span>
        </div>

        <div className="flex-1 overflow-auto bg-muted/40 p-4">
          {componentQuery.isLoading ? (
            <Skeleton className="h-full min-h-[520px] w-full" />
          ) : component ? (
            <div className="mx-auto min-h-full max-w-full rounded-lg border bg-background shadow-sm">
              <iframe
                title={`${component.name} full preview`}
                srcDoc={srcDoc}
                sandbox="allow-scripts"
                className="min-h-[640px] border-0"
                style={{ width: `${deviceWidths[device]}px`, maxWidth: "100%" }}
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[420px] items-center justify-center rounded-lg border border-dashed bg-background text-sm text-muted-foreground">
              Component preview is unavailable.
            </div>
          )}
        </div>

        <SheetFooter className="border-t p-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => void copyHtml()}
            disabled={!component}
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy HTML
          </Button>
          <Button type="button" onClick={addToEditor} disabled={!component}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add to Editor
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DeviceButton({
  device,
  active,
  onClick
}: {
  device: Device;
  active: boolean;
  onClick: (device: Device) => void;
}) {
  const Icon = device === "mobile" ? Smartphone : device === "tablet" ? Tablet : Monitor;
  const label = device === "mobile" ? "375px" : device === "tablet" ? "768px" : "1440px";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("gap-1", active && "bg-muted")}
      onClick={() => onClick(device)}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}

export { ComponentPreviewDrawer };
