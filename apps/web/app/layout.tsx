import type { Metadata } from "next";
import { AppProviders } from "../components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Landing Builder",
  description: "Dashboard shell for building and publishing landing pages"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
