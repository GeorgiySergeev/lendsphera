import { Boxes, Flag, ListChecks, Tags } from "lucide-react";
import Link from "next/link";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@workspace/ui";

const sections = [
  {
    description: "Locales, currencies, flags, timezones, and GEO ordering.",
    href: "/dashboard/taxonomy/geos",
    icon: Flag,
    title: "GEOs"
  },
  {
    description: "Content categories used by templates and landing records.",
    href: "/dashboard/taxonomy/categories",
    icon: Tags,
    title: "Categories"
  },
  {
    description: "Landing flow variants such as form, quiz, article, or game.",
    href: "/dashboard/taxonomy/variants",
    icon: ListChecks,
    title: "Variants"
  }
] as const;

export default function TaxonomyPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Taxonomy
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage the catalogs that power landing creation, filtering, and routing.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          Catalogs
        </Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition hover:border-primary/60">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription>Open management table</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
            <Boxes className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            Reordering changes the catalog order used by filters and creation flows.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
