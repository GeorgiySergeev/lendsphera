"use client";

import dynamic from "next/dynamic";
import { ArrowRight, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Skeleton
} from "@workspace/ui";

import {
  useComponentCategories,
  useCreateComponent
} from "../../../../hooks/use-components";
import { slugify } from "../../../../lib/utils/slugify";
import { ComponentCategoryIcon } from "./ComponentCategoryIcon";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  loading: () => <Skeleton className="h-48 w-full" />,
  ssr: false
});

export function QuickAddDialog({
  isOpen,
  onOpenChange
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: categories } = useComponentCategories();
  const createMutation = useCreateComponent();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [html, setHtml] = useState("");

  const handleCreate = async (andEdit: boolean) => {
    if (!name.trim() || !categoryId || !html.trim()) return;

    try {
      const slug = slugify(name);
      const component = await createMutation.mutateAsync({
        name: name.trim(),
        slug,
        categoryId,
        html: html.trim(),
        previewDark: false
      });

      if (andEdit) {
        router.push(`/dashboard/components/${component.id}/edit`);
      } else {
        onOpenChange(false);
        setName("");
        setCategoryId("");
        setHtml("");
      }
    } catch {
      // Error surfaced by mutation / global handler
    }
  };

  const disabled =
    !name.trim() || !categoryId || !html.trim() || createMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeader className="space-y-1.5 border-b px-6 py-4">
          <DialogTitle>Quick Add Component</DialogTitle>
          <DialogDescription>
            Create a simple component by pasting HTML.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="quick-add-name"
                className="text-sm font-medium leading-none"
              >
                Name
              </label>
              <Input
                id="quick-add-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Primary Button"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <span
                id="quick-add-category-label"
                className="text-sm font-medium leading-none"
              >
                Category
              </span>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger
                  id="quick-add-category"
                  aria-labelledby="quick-add-category-label"
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <ComponentCategoryIcon slug={cat.slug} icon={cat.icon} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <span id="quick-add-html-label" className="text-sm font-medium leading-none">
              HTML
            </span>
            <div className="h-48 overflow-hidden rounded-md border">
              <MonacoEditor
                aria-labelledby="quick-add-html-label"
                language="html"
                theme="vs-dark"
                value={html}
                onChange={(val) => setHtml(val || "")}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: "off",
                  wordWrap: "on",
                  fontSize: 13
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t bg-muted/30 px-6 py-4 sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleCreate(false)}
            disabled={disabled}
          >
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            Save
          </Button>
          <Button type="button" onClick={() => handleCreate(true)} disabled={disabled}>
            Save & edit
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
