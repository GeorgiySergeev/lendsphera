import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@workspace/ui";
import { Command, Copy, HelpCircle, Redo, Save, Undo } from "lucide-react";

type KeyboardShortcutsPanelProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

const shortcuts = [
  {
    category: "File",
    items: [
      { keys: ["Cmd", "S"], description: "Save draft", icon: Save },
      { keys: ["Shift", "?"], description: "Show keyboard shortcuts", icon: HelpCircle }
    ]
  },
  {
    category: "Edit",
    items: [
      { keys: ["Cmd", "Z"], description: "Undo", icon: Undo },
      { keys: ["Cmd", "Shift", "Z"], description: "Redo", icon: Redo },
      { keys: ["Cmd", "D"], description: "Duplicate selected component", icon: Copy }
    ]
  },
  {
    category: "Navigation",
    items: [{ keys: ["Esc"], description: "Deselect / Close panels", icon: Command }]
  }
];

export function KeyboardShortcutsPanel({
  isOpen,
  onOpenChange
}: KeyboardShortcutsPanelProps) {
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and edit faster. Replace Cmd with Ctrl on
            Windows/Linux.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-foreground">
                          {item.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="rounded border border-border bg-background px-2 py-1 text-xs font-mono font-semibold text-foreground shadow-sm"
                          >
                            {key === "Cmd" && !isMac ? "Ctrl" : key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
