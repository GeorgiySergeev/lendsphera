"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui";
import { Input } from "@workspace/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui";
import { ArrowLeft, Monitor, Smartphone, Tablet, Moon, Sun, PanelRightClose, PanelRightOpen, Code2 } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@workspace/ui";
import { useComponentCategories, useCreateComponent } from "../../../../../hooks/use-components";
import { slugify } from "../../../../../lib/utils/slugify";
import dynamic from "next/dynamic";
import { Skeleton } from "@workspace/ui";
import { starterHtml, quickStartTemplates } from "./starter-templates";
import { buildPreviewHtml } from "../../_components/preview-html";
import { toast } from "../../../../../lib/toast";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />
});

async function setupTailwindIntelliSense(monaco: unknown) {
  try {
    const tailwindModule = await import("monaco-tailwindcss");
    const candidates = Object.values(tailwindModule) as unknown[];
    for (const candidate of candidates) {
      if (typeof candidate === "function") {
        candidate(monaco);
        return;
      }
    }
  } catch {
    return;
  }
}

export function NewComponentClient() {
  const router = useRouter();
  const { data: categories } = useComponentCategories();
  const createMutation = useCreateComponent();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [html, setHtml] = useState(starterHtml);
  const [css, setCss] = useState("");
  const [editorTab, setEditorTab] = useState<"html" | "css">("html");
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [dark, setDark] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, categoryId, html, css]);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    if (!categoryId) return toast.error("Category is required");
    if (html.trim().length < 10) return toast.error("HTML content must be at least 10 characters");

    try {
      const component = await createMutation.mutateAsync({
        name: name.trim(),
        slug: slugify(name),
        categoryId,
        html,
        css,
        previewDark: false,
      });

      router.push(`/dashboard/components/${component.id}/edit`);
    } catch (error) {
      // toast shown by mutation
    }
  };

  const handleCancel = () => {
    if (isDirty || html !== starterHtml) {
      if (!window.confirm("Discard unsaved component?")) return;
    }
    router.back();
  };

  const handleHtmlChange = (val: string | undefined) => {
    setHtml(val || "");
    setIsDirty(true);
  };

  const srcDoc = useMemo(() => {
    return buildPreviewHtml({ html, css, previewDark: dark }, null);
  }, [html, css, dark]);

  const widths = {
    mobile: '375px',
    tablet: '768px',
    desktop: '100%',
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="sm" className="gap-2 shrink-0" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Component Library</span>
          </Button>
          <div className="h-4 w-px bg-border shrink-0" />
          <div className="font-medium text-sm whitespace-nowrap shrink-0">New Component</div>
          
          <div className="h-4 w-px bg-border shrink-0" />
          
          <div className="flex items-center gap-2 max-w-[400px]">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Category..." />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Component name"
              className="h-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Button variant="ghost" onClick={handleCancel} size="sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={createMutation.isPending}
            size="sm"
          >
            {createMutation.isPending ? "Saving..." : "Save & Open Editor \u2192"}
          </Button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Live Preview */}
          <ResizablePanel defaultSize={55} minSize={20} className="flex flex-col bg-muted/20">
            <div className="flex h-10 items-center justify-between border-b bg-background px-4 shrink-0">
              <div className="text-sm font-medium">Live Preview</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border p-0.5">
                  <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-sm ${device === 'mobile' ? 'bg-muted' : ''}`} onClick={() => setDevice('mobile')} title="Mobile">
                    <Smartphone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-sm ${device === 'tablet' ? 'bg-muted' : ''}`} onClick={() => setDevice('tablet')} title="Tablet">
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-sm ${device === 'desktop' ? 'bg-muted' : ''}`} onClick={() => setDevice('desktop')} title="Desktop">
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDark(!dark)} title="Toggle Dark Mode">
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex justify-center">
              <div
                style={{ width: widths[device], transition: 'width 0.3s ease' }}
                className="h-full bg-background rounded-md border shadow-sm overflow-hidden shrink-0"
              >
                <iframe
                  srcDoc={srcDoc}
                  sandbox="allow-scripts allow-same-origin"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="Live preview"
                />
              </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Editor */}
          <ResizablePanel defaultSize={45} minSize={20} className="flex flex-col bg-background">
            <div className="flex h-10 items-center justify-between border-b px-2 shrink-0">
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-7 px-3 text-xs ${editorTab === 'html' ? 'bg-muted' : ''}`}
                  onClick={() => setEditorTab('html')}
                >
                  HTML
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-7 px-3 text-xs ${editorTab === 'css' ? 'bg-muted' : ''}`}
                  onClick={() => setEditorTab('css')}
                >
                  CSS
                </Button>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                {showTemplates ? <PanelRightClose className="h-4 w-4 mr-1" /> : <PanelRightOpen className="h-4 w-4 mr-1" />}
                Templates
              </Button>
            </div>
            
            <div className="flex-1 min-h-0 relative">
              <MonacoEditor
                language={editorTab}
                theme="vs-dark"
                value={editorTab === "html" ? html : css}
                onChange={editorTab === "html" ? handleHtmlChange : (v) => setCss(v || "")}
                onMount={(_, monaco) => { void setupTailwindIntelliSense(monaco); }}
                options={{
                  fontSize: 13,
                  wordWrap: 'on',
                  minimap: { enabled: false }
                }}
              />
            </div>
          </ResizablePanel>
          
          {/* Quick Start Templates */}
          {showTemplates && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="bg-muted/10 border-l flex flex-col">
                <div className="h-10 border-b flex items-center px-4 font-medium text-sm shrink-0">
                  Quick Start
                </div>
                <div className="flex-1 overflow-auto p-3 grid grid-cols-2 gap-2 content-start">
                  {quickStartTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setHtml(t.html);
                        setEditorTab("html");
                        setIsDirty(true);
                      }}
                      className="border rounded-md bg-background hover:bg-accent hover:border-accent-foreground/20 p-3 flex flex-col items-center justify-center gap-2 text-sm transition-colors"
                    >
                      <Code2 className="h-6 w-6 text-muted-foreground" />
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
