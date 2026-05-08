"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Blocks,
  CheckCircle2,
  Clock3,
  FileStack,
  LayoutTemplate,
  RadioTower
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton
} from "@workspace/ui";

const queryKeys = {
  overview: ["dashboard", "overview"] as const,
  recentLandings: ["landings", "recent"] as const,
  templatesSummary: ["templates", "summary"] as const,
  widgetsSummary: ["widgets", "summary"] as const
};

type OverviewMetric = {
  label: string;
  value: string;
  delta: string;
  detail: string;
};

type Landing = {
  id: string;
  title: string;
  status: "Draft" | "Published" | "Review";
  updatedAt: string;
  owner: string;
};

type HealthSummary = {
  active: number;
  draft: number;
  issueCount: number;
  status: "Healthy" | "Review";
};

type RepositoryActivity = {
  id: string;
  title: string;
  actor: string;
  time: string;
};

async function getDashboardOverview() {
  return {
    metrics: [
      {
        label: "Active landings",
        value: "18",
        delta: "+4 this week",
        detail: "12 published"
      },
      {
        label: "Conversion avg.",
        value: "7.8%",
        delta: "+1.1%",
        detail: "Across tracked forms"
      },
      { label: "Template reuse", value: "64%", delta: "+8%", detail: "Last 30 days" },
      { label: "Open reviews", value: "5", delta: "-2", detail: "Needs approval" }
    ] satisfies OverviewMetric[],
    repositoryActivity: [
      {
        id: "repo_01",
        title: "Hero widget schema updated",
        actor: "Nadia",
        time: "12 min ago"
      },
      {
        id: "repo_02",
        title: "Spring campaign assets synced",
        actor: "Ivan",
        time: "48 min ago"
      },
      {
        id: "repo_03",
        title: "Taxonomy aliases normalized",
        actor: "Admin",
        time: "2 hours ago"
      }
    ] satisfies RepositoryActivity[]
  };
}

async function getRecentLandings() {
  return [
    {
      id: "landing_101",
      title: "Spring Campaign",
      status: "Published",
      updatedAt: "Today, 14:20",
      owner: "Nadia"
    },
    {
      id: "landing_102",
      title: "Enterprise Demo Request",
      status: "Review",
      updatedAt: "Today, 10:45",
      owner: "Ivan"
    },
    {
      id: "landing_103",
      title: "Partner Webinar Funnel",
      status: "Draft",
      updatedAt: "Yesterday, 18:05",
      owner: "Admin"
    }
  ] satisfies Landing[];
}

async function getTemplatesSummary() {
  return {
    active: 9,
    draft: 3,
    issueCount: 1,
    status: "Review"
  } satisfies HealthSummary;
}

async function getWidgetsSummary() {
  return {
    active: 34,
    draft: 6,
    issueCount: 0,
    status: "Healthy"
  } satisfies HealthSummary;
}

function DashboardOverview() {
  const overviewQuery = useQuery({
    queryKey: queryKeys.overview,
    queryFn: getDashboardOverview
  });
  const landingsQuery = useQuery({
    queryKey: queryKeys.recentLandings,
    queryFn: getRecentLandings
  });
  const templatesQuery = useQuery({
    queryKey: queryKeys.templatesSummary,
    queryFn: getTemplatesSummary
  });
  const widgetsQuery = useQuery({
    queryKey: queryKeys.widgetsSummary,
    queryFn: getWidgetsSummary
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">
            Operational overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Landing production, reusable assets, and repository changes in one working
            view.
          </p>
        </div>
        <Badge variant="outline" className="w-fit">
          API-ready mock data
        </Badge>
      </div>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Dashboard KPIs"
      >
        {overviewQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-4 h-8 w-16" />
                  <Skeleton className="mt-3 h-4 w-32" />
                </CardContent>
              </Card>
            ))
          : overviewQuery.data?.metrics.map((metric) => (
              <Card key={metric.label}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <ArrowUpRight className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl font-semibold tracking-normal">
                      {metric.value}
                    </span>
                    <span className="pb-1 text-xs font-medium text-primary">
                      {metric.delta}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{metric.detail}</p>
                </CardContent>
              </Card>
            ))}
      </section>

      <section
        className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"
        aria-label="Dashboard work queues"
      >
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Recent landings</CardTitle>
                <CardDescription>
                  Latest production items and review state.
                </CardDescription>
              </div>
              <FileStack className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {landingsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {landingsQuery.data?.map((landing) => (
                  <div
                    key={landing.id}
                    className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{landing.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {landing.owner} updated {landing.updatedAt}
                      </p>
                    </div>
                    <Badge
                      variant={landing.status === "Published" ? "default" : "muted"}
                      className="w-fit"
                    >
                      {landing.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <HealthCard
            icon={LayoutTemplate}
            title="Template health"
            description="Reusable layout inventory"
            data={templatesQuery.data}
            isLoading={templatesQuery.isLoading}
          />
          <HealthCard
            icon={Blocks}
            title="Widget health"
            description="Composable module inventory"
            data={widgetsQuery.data}
            isLoading={widgetsQuery.isLoading}
          />
        </div>
      </section>

      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Repository activity</CardTitle>
              <CardDescription>
                Recent changes ready to map to audit events.
              </CardDescription>
            </div>
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {overviewQuery.data?.repositoryActivity.map((activity) => (
            <div key={activity.id} className="flex gap-3 border-b py-3 last:border-b-0">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <RadioTower className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {activity.actor} · {activity.time}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthCard({
  icon: Icon,
  title,
  description,
  data,
  isLoading
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  data?: HealthSummary;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={data.status === "Healthy" ? "default" : "secondary"}>
                {data.status}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <MetricPill label="Active" value={data.active} />
              <MetricPill label="Draft" value={data.draft} />
              <MetricPill label="Issues" value={data.issueCount} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {data.issueCount === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <Clock3 className="h-4 w-4 text-secondary" aria-hidden="true" />
              )}
              {data.issueCount === 0
                ? "Ready for production use"
                : "Review queued changes"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

export { DashboardOverview, queryKeys };
