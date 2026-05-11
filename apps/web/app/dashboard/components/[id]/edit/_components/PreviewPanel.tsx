"use client";

import { useComponentEditorStore } from "../../../../../../stores/component-editor.store";
import { useMemo } from "react";

function buildPreviewHtml(html: string, css: string, dark: boolean, bg: string) {
  return `<!DOCTYPE html>
<html class="${dark ? 'dark' : ''}" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: { extend: {} }
    }
  </script>
  <style>
    body {
      margin: 0;
      background: ${bg || (dark ? '#030712' : '#f9fafb')};
      min-height: 100vh;
    }
    ${css || ''}
  </style>
</head>
<body>
  ${html || '<div style="display:flex;height:100vh;align-items:center;justify-content:center;color:#6b7280;font-family:sans-serif;">Empty component. Add HTML in the editor &rarr;</div>'}
</body>
</html>`;
}

export function PreviewPanel() {
  const activeVariantId = useComponentEditorStore(state => state.activeVariantId);
  const variants = useComponentEditorStore(state => state.variants);
  const previewDark = useComponentEditorStore(state => state.previewDark);
  const previewBg = useComponentEditorStore(state => state.previewBg);
  const device = useComponentEditorStore(state => state.previewDevice);

  const activeVariant = useMemo(() => {
    return variants.find(v => v.id === activeVariantId) || variants[0];
  }, [variants, activeVariantId]);

  const srcDoc = useMemo(() => {
    if (!activeVariant) return "";
    return buildPreviewHtml(activeVariant.html, activeVariant.css, previewDark, previewBg);
  }, [activeVariant, previewDark, previewBg]);

  const widths = {
    mobile: '375px',
    tablet: '768px',
    desktop: '100%',
  };

  return (
    <div className="flex h-full w-full flex-col bg-muted/20">
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div
          style={{ 
            width: widths[device], 
            transition: 'width 0.3s ease' 
          }}
          className="h-full bg-background rounded-md border shadow-sm overflow-hidden shrink-0"
        >
          <iframe
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-same-origin"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Component preview"
          />
        </div>
      </div>
    </div>
  );
}
