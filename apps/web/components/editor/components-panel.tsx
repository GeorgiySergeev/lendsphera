"use client";

import * as React from "react";
import { Search, LayoutGrid, ChevronDown, ChevronRight } from "lucide-react";
import { Input, Button } from "@workspace/ui";
import { useComponents } from "../../hooks/use-components";
import { MiniComponentCard } from "./mini-component-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui";
import { ComponentPreviewDrawer } from "../../app/dashboard/components/_components/ComponentPreviewDrawer";
import type { Editor } from "grapesjs";
import { useTrackComponentUsageWithInvalidation } from "../../hooks/use-components";
import {
  insertHtmlAtSelection,
  type EditorLike
} from "../../lib/editor/landing-editor-adapter";
import { toast } from "../../lib/toast";

export function ComponentsPanel({ editor }: { editor: Editor | null }) {
  const { data: componentsResponse } = useComponents({ limit: 100, isPublic: true });
  const components = componentsResponse?.data || [];

  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("all");
  const [previewId, setPreviewId] = React.useState<string | null>(null);
  const [openCategories, setOpenCategories] = React.useState<Record<string, boolean>>({});
  const trackUsage = useTrackComponentUsageWithInvalidation();

  const filteredComponents = React.useMemo(() => {
    return components.filter((c) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = category === "all" || c.category.id === category;

      return matchesSearch && matchesCategory;
    });
  }, [components, search, category]);

  const groupedComponents = React.useMemo(() => {
    const groups: Record<
      string,
      { id: string; name: string; icon?: string; items: typeof components }
    > = {};

    filteredComponents.forEach((c) => {
      if (!groups[c.category.id]) {
        groups[c.category.id] = {
          id: c.category.id,
          name: c.category.name,
          icon: c.category.icon,
          items: []
        };
      }
      groups[c.category.id].items.push(c);
    });

    return Object.values(groups).sort((a, b) => {
      // Find original sort order
      const aCat = components.find((c) => c.category.id === a.id)?.category;
      const bCat = components.find((c) => c.category.id === b.id)?.category;
      return (aCat?.sortOrder || 0) - (bCat?.sortOrder || 0);
    });
  }, [filteredComponents, components]);

  const categoriesList = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; icon?: string }>();
    components.forEach((c) => {
      map.set(c.category.id, {
        id: c.category.id,
        name: c.category.name,
        icon: c.category.icon
      });
    });
    return Array.from(map.values());
  }, [components]);

  const categoriesInitRef = React.useRef(false);

  // Initialize first 3 categories as open
  React.useEffect(() => {
    if (groupedComponents.length > 0 && !categoriesInitRef.current) {
      categoriesInitRef.current = true;
      const initialOpen: Record<string, boolean> = {};
      groupedComponents.slice(0, 3).forEach((g) => {
        initialOpen[g.id] = true;
      });
      setOpenCategories(initialOpen);
    }
  }, [groupedComponents]);

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleInsert = (id: string, html: string, css: string) => {
    if (!editor) return;

    const added = insertHtmlAtSelection(editor as unknown as EditorLike, html);
    if (css) {
      (editor as any).Css.addRules(css);
    }

    trackUsage.mutate(id);

    if (added) {
      // Scroll to element
      setTimeout(() => {
        try {
          const el = added.getEl?.();
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            // Highlight
            const originalOutline = el.style.outline;
            el.style.outline = "2px solid var(--primary)";
            setTimeout(() => {
              el.style.outline = originalOutline;
            }, 1000);
          }
        } catch {
          // Scroll/highlight can fail if DOM detaches; safe to ignore.
        }
      }, 50);

      const c = components.find((x) => x.id === id);
      toast.success(`"${c?.name || "Component"}" added to canvas`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-3 space-y-3 shrink-0 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            className="pl-8 h-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoriesList.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon && <span className="mr-2">{cat.icon}</span>}
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {groupedComponents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No components found.
          </div>
        ) : (
          <div className="space-y-1">
            {groupedComponents.map((group) => {
              const isOpen = openCategories[group.id];
              return (
                <div key={group.id} className="mb-2">
                  <button
                    onClick={() => toggleCategory(group.id)}
                    className="flex w-full items-center justify-between py-1.5 px-2 hover:bg-muted/50 rounded-sm text-xs font-medium text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      <span>
                        {group.icon} {group.name} ({group.items.length})
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="grid grid-cols-2 gap-2 mt-1 px-1">
                      {group.items.map((component) => (
                        <MiniComponentCard
                          key={component.id}
                          component={component}
                          onPreview={(id) => setPreviewId(id)}
                          onInsert={(html, css) => handleInsert(component.id, html, css)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 border-t shrink-0">
        <Button
          variant="outline"
          className="w-full text-xs h-8"
          onClick={() => window.open("/dashboard/components", "_blank")}
        >
          <LayoutGrid className="h-3.5 w-3.5 mr-2" />
          Open full library &rarr;
        </Button>
      </div>

      <ComponentPreviewDrawer
        componentId={previewId}
        isOpen={Boolean(previewId)}
        onOpenChange={(open) => !open && setPreviewId(null)}
        onEdit={(id) => window.open(`/dashboard/components/${id}/edit`, "_blank")}
      />
    </div>
  );
}
