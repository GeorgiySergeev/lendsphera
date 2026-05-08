"use client";

import type * as React from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";

import { TooltipProvider } from "@workspace/ui";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <QueryProvider>
        <NuqsAdapter>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </TooltipProvider>
        </NuqsAdapter>
      </QueryProvider>
    </ThemeProvider>
  );
}

export { AppProviders };
