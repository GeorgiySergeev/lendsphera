import { ArrowRight, type LucideIcon } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@workspace/ui";

type PlaceholderPageProps = {
  title: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  items: string[];
};

function PlaceholderPage({
  title,
  description,
  badge,
  icon: Icon,
  items
}: PlaceholderPageProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            {title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="w-fit">
          {badge}
        </Badge>
      </div>
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">Ready for API data</CardTitle>
              <CardDescription>
                Connect live queries here when the resource endpoints land.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid gap-2 md:grid-cols-3">
            {items.map((item) => (
              <div
                key={item}
                className="flex min-h-16 items-center gap-3 rounded-md border bg-background px-3 py-2"
              >
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { PlaceholderPage };
