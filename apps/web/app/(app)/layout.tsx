import Link from "next/link";

import { AuthGuard } from "../../components/providers/auth-guard";

const navItems = [
  { href: "/products", label: "Products" },
  { href: "/landings", label: "Landings" }
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
          <aside className="rounded-md border bg-card p-3">
            <p className="mb-3 text-sm font-semibold">CRM Inventory</p>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded px-2 py-1.5 text-sm hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>
          <main>{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
