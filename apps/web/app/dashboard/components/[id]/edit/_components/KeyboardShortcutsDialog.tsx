"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@workspace/ui";

const shortcuts = [
  { keys: ["Cmd", "S"], description: "Save current changes immediately" },
  { keys: ["Cmd", "Shift", "P"], description: "Toggle split direction (horizontal/vertical)" },
  { keys: ["Cmd", "Shift", "D"], description: "Toggle dark/light mode preview" },
  { keys: ["Cmd", "Shift", "1"], description: "Switch preview to Mobile" },
  { keys: ["Cmd", "Shift", "2"], description: "Switch preview to Tablet" },
  { keys: ["Cmd", "Shift", "3"], description: "Switch preview to Desktop" },
  { keys: ["Shift", "?"], description: "Show this shortcuts panel" },
];

export function KeyboardShortcutsDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Work faster with these editor shortcuts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map(key => (
                  <kbd 
                    key={key} 
                    className="inline-flex h-6 items-center justify-center rounded border bg-muted px-2 font-mono text-xs text-foreground font-medium"
                  >
                    {key === "Cmd" ? (isMac ? "⌘" : "Ctrl") : key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
