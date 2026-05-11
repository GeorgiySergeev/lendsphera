"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui";
import { Button } from "@workspace/ui";
import { Input } from "@workspace/ui";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@workspace/ui";
import { useComponentCategories, useCreateComponent } from "../../../../hooks/use-components";
import { slugify } from "../../../../lib/utils/slugify";
import dynamic from "next/dynamic";
import { Skeleton } from "@workspace/ui";

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
      // Let backend handle slug collision or do auto-append there
      const component = await createMutation.mutateAsync({
        name: name.trim(),
        slug: slug,
        categoryId,
        html: html.trim(),
        previewDark: false,
      });

      if (andEdit) {
        router.push(`/dashboard/components/${component.id}/edit`);
      } else {
        onOpenChange(false);
        // Reset form
        setName("");
        setCategoryId("");
        setHtml("");
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Quick Add Component</DialogTitle>
          <DialogDescription>
            Create a simple component by pasting HTML.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Primary Button"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        {cat.icon && <span>{cat.icon}</span>}
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">HTML</label>
            <div className="border rounded-md overflow-hidden h-48">
              <MonacoEditor
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleCreate(false)}
            disabled={!name.trim() || !categoryId || !html.trim() || createMutation.isPending}
          >
            Save
          </Button>
          <Button 
            onClick={() => handleCreate(true)}
            disabled={!name.trim() || !categoryId || !html.trim() || createMutation.isPending}
          >
            Save & Edit &rarr;
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
