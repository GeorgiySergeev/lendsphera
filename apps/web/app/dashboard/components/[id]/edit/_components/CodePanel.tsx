"use client";

import { useComponentEditorStore } from "../../../../../../stores/component-editor.store";
import dynamic from "next/dynamic";
import { Skeleton, Button } from "@workspace/ui";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorProps, OnMount } from "@monaco-editor/react";
import { toast } from "../../../../../../lib/toast";

// Need to safely import js-beautify and tailwind
let beautifyHtml: any;
if (typeof window !== "undefined") {
  import("js-beautify").then(m => beautifyHtml = m.html).catch(() => {});
}

const MonacoEditor = dynamic<EditorProps>(() => import("@monaco-editor/react"), {
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
  ssr: false
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

export function CodePanel({ onSave }: { onSave: () => void }) {
  const activeVariantId = useComponentEditorStore(state => state.activeVariantId);
  const variants = useComponentEditorStore(state => state.variants);
  const setHtml = useComponentEditorStore(state => state.setHtml);
  const setCss = useComponentEditorStore(state => state.setCss);
  const editorTab = useComponentEditorStore(state => state.editorTab);
  const setEditorTab = useComponentEditorStore(state => state.setEditorTab);
  
  const editorRef = useRef<any>(null);
  
  const activeVariant = variants.find(v => v.id === activeVariantId) || variants[0];
  const value = editorTab === 'html' ? activeVariant?.html || "" : activeVariant?.css || "";

  const handleMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current = editor;
    void setupTailwindIntelliSense(monaco);
  }, []);

  const handleChange = (val: string | undefined) => {
    if (val === undefined) return;
    if (editorTab === 'html') {
      setHtml(val);
    } else {
      setCss(val);
    }
  };

  const handleFormat = () => {
    if (!editorRef.current) return;
    
    if (editorTab === 'html' && beautifyHtml) {
      const formatted = beautifyHtml(editorRef.current.getValue(), { 
        indent_size: 2, 
        wrap_line_length: 100 
      });
      editorRef.current.setValue(formatted);
      setHtml(formatted);
    } else {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    toast.success(`${editorTab.toUpperCase()} copied!`);
  };

  const handleCopyAll = async () => {
    if (activeVariant) {
      await navigator.clipboard.writeText(activeVariant.html);
      toast.success("HTML copied!");
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
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
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleFormat}>Format</Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>Copy</Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopyAll}>Copy All</Button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative">
        <MonacoEditor
          language={editorTab}
          theme="vs-dark"
          value={value}
          path={`variant_${activeVariantId}.${editorTab}`}
          onChange={handleChange}
          onMount={handleMount}
          options={{
            fontSize: 13,
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: false,
            minimap: { enabled: false }
          }}
        />
      </div>
    </div>
  );
}
