"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export { ThemeProvider };
