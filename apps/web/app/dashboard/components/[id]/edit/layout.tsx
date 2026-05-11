import * as React from "react";

export default function ComponentEditorLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  // We use fixed inset-0 z-50 to completely cover the dashboard shell
  // and provide a true full-screen experience.
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col">
      {children}
    </div>
  );
}
