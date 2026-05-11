"use client";

import { useComponentEditorStore } from "../../../../../../stores/component-editor.store";
import { useComponent } from "../../../../../../hooks/use-components";
import { useEffect, useState } from "react";
import { toast } from "../../../../../../lib/toast";
import { componentsApi } from "../../../../../../lib/api/components";

import { VariantTabs } from "./VariantTabs";
import { PreviewPanel } from "./PreviewPanel";
import { CodePanel } from "./CodePanel";
import { SettingsPanel } from "./SettingsPanel";
import { ExportModal } from "./ExportModal";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui";
import { Button } from "@workspace/ui";
import { 
  ArrowLeft, 
  Settings, 
  Laptop, 
  Smartphone, 
  Tablet, 
  Moon, 
  Sun,
  MoreHorizontal,
  SplitSquareHorizontal,
  SplitSquareVertical,
  HelpCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@workspace/ui";

export function ComponentEditorClient({ componentId }: { componentId: string }) {
  const router = useRouter();
  const { data: component, isLoading, error } = useComponent(componentId);
  
  const init = useComponentEditorStore(state => state.init);
  const isDirty = useComponentEditorStore(state => state.isDirty);
  const isSaving = useComponentEditorStore(state => state.isSaving);
  const lastSavedAt = useComponentEditorStore(state => state.lastSavedAt);
  const splitDirection = useComponentEditorStore(state => state.splitDirection);
  const toggleSplitDirection = useComponentEditorStore(state => state.toggleSplitDirection);
  const previewDevice = useComponentEditorStore(state => state.previewDevice);
  const setPreviewDevice = useComponentEditorStore(state => state.setPreviewDevice);
  const showSettings = useComponentEditorStore(state => state.showSettings);
  const setShowSettings = useComponentEditorStore(state => state.setShowSettings);
  const previewDark = useComponentEditorStore(state => state.previewDark);
  const updateMetadata = useComponentEditorStore(state => state.updateMetadata);
  const activeVariantId = useComponentEditorStore(state => state.activeVariantId);
  const variants = useComponentEditorStore(state => state.variants);
  const markSaved = useComponentEditorStore(state => state.markSaved);
  
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    if (component) {
      init(component);
    }
  }, [component, init]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      
      if (cmdOrCtrl && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (cmdOrCtrl && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        toggleSplitDirection();
      } else if (cmdOrCtrl && e.shiftKey && e.key === 'd') {
        e.preventDefault();
        updateMetadata({ previewDark: !useComponentEditorStore.getState().previewDark });
      } else if (cmdOrCtrl && e.shiftKey && e.key === '1') {
        e.preventDefault();
        setPreviewDevice('mobile');
      } else if (cmdOrCtrl && e.shiftKey && e.key === '2') {
        e.preventDefault();
        setPreviewDevice('tablet');
      } else if (cmdOrCtrl && e.shiftKey && e.key === '3') {
        e.preventDefault();
        setPreviewDevice('desktop');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSave = async () => {
    const state = useComponentEditorStore.getState();
    if (!state.isDirty || state.isSaving) return;

    useComponentEditorStore.setState({ isSaving: true });
    try {
      // Save component metadata if it's the default variant, or both
      const activeVariant = state.variants.find(v => v.id === state.activeVariantId);
      if (!activeVariant) return;

      if (activeVariant.id === 'default') {
        await componentsApi.update(componentId, {
          name: state.name,
          description: state.description,
          categoryId: state.categoryId,
          tags: state.tags,
          previewBg: state.previewBg,
          previewDark: state.previewDark,
          previewHeight: state.previewHeight,
          html: activeVariant.html,
          css: activeVariant.css
        });
      } else {
        await componentsApi.updateVariant(componentId, activeVariant.id, {
          html: activeVariant.html,
          css: activeVariant.css,
          name: activeVariant.name
        });
      }
      
      markSaved();
      toast.success("Saved");
    } catch (e) {
      toast.error("Failed to save component");
      useComponentEditorStore.setState({ isSaving: false });
    }
  };

  if (isLoading) return <div className="flex h-full w-full items-center justify-center">Loading...</div>;
  if (error || !component) return <div className="flex h-full w-full items-center justify-center">Component not found</div>;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push('/dashboard/components')}>
            <ArrowLeft className="h-4 w-4" />
            Components
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-medium">{useComponentEditorStore(s => s.name)}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Split Toggle */}
          <Button variant="ghost" size="icon" onClick={toggleSplitDirection} title="Toggle Split Direction (Cmd+Shift+P)">
            {splitDirection === 'horizontal' ? <SplitSquareHorizontal className="h-4 w-4" /> : <SplitSquareVertical className="h-4 w-4" />}
          </Button>

          {/* Device Toggle */}
          <div className="flex items-center rounded-md border p-0.5">
            <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-sm ${previewDevice === 'mobile' ? 'bg-muted' : ''}`} onClick={() => setPreviewDevice('mobile')} title="Mobile (Cmd+Shift+1)">
              <Smartphone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-sm ${previewDevice === 'tablet' ? 'bg-muted' : ''}`} onClick={() => setPreviewDevice('tablet')} title="Tablet (Cmd+Shift+2)">
              <Tablet className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-sm ${previewDevice === 'desktop' ? 'bg-muted' : ''}`} onClick={() => setPreviewDevice('desktop')} title="Desktop (Cmd+Shift+3)">
              <Laptop className="h-4 w-4" />
            </Button>
          </div>

          {/* Theme Toggle */}
          <Button variant="ghost" size="icon" onClick={() => updateMetadata({ previewDark: !previewDark })} title="Toggle Dark Mode (Cmd+Shift+D)">
            {previewDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          {/* Status */}
          <span className="text-xs text-muted-foreground w-24 text-right">
            {isSaving ? "Saving..." : isDirty ? "● Unsaved" : lastSavedAt ? `Saved` : ""}
          </span>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {}}>Duplicate component</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete component</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsExportOpen(true)}>Export HTML</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Shortcuts */}
          <Button variant="ghost" size="icon" onClick={() => setIsShortcutsOpen(true)}>
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Settings Toggle */}
          <Button variant={showSettings ? "secondary" : "ghost"} size="icon" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4" />
          </Button>

          {/* Save Button */}
          <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
            Save
          </Button>
        </div>
      </header>

      {/* Variant Tabs */}
      <VariantTabs />

      {/* Main Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <ResizablePanelGroup direction={splitDirection} className="flex-1">
          <ResizablePanel defaultSize={55} minSize={20}>
            <PreviewPanel />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={20}>
            <CodePanel onSave={handleSave} />
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-[260px] border-l bg-background shrink-0 overflow-y-auto">
            <SettingsPanel />
          </div>
        )}
      </div>

      <ExportModal isOpen={isExportOpen} onOpenChange={setIsExportOpen} />
      <KeyboardShortcutsDialog isOpen={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} />
    </div>
  );
}
