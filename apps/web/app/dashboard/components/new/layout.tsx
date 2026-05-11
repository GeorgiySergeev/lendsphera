import * as React from "react";

export default function NewComponentLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col">
      {children}
    </div>
  );
}
