"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui";

import {
  fetchLanding,
  fetchLandingVersions,
  fetchVersionDiff,
  restoreLandingVersion
} from "../../../../../lib/api";
import { JsonDiff } from "../../../../../features/diff/json-diff";

export default function LandingVersionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cursor = searchParams.get("cursor") ?? undefined;
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);

  const landingQuery = useQuery({
    queryKey: ["crm", "landing", id],
    queryFn: () => fetchLanding(id)
  });

  const versionsQuery = useQuery({
    queryKey: ["crm", "landing", id, "versions", cursor],
    queryFn: () => fetchLandingVersions(id, { cursor, take: 20 })
  });

  const diffQuery = useQuery({
    enabled: Boolean(fromId && toId),
    queryKey: ["crm", "version-diff", fromId, toId],
    queryFn: () => fetchVersionDiff(fromId!, toId!)
  });

  const restoreMutation = useMutation({
    mutationFn: restoreLandingVersion,
    onSuccess: () => {
      void versionsQuery.refetch();
    }
  });

  const versionItems = versionsQuery.data?.items ?? [];

  const selectedPair = useMemo(() => {
    const from = versionItems.find((item) => item.id === fromId) ?? null;
    const to = versionItems.find((item) => item.id === toId) ?? null;
    return { from, to };
  }, [fromId, toId, versionItems]);

  return (
    <div className="space-y-4">
      <Link
        className="text-sm underline-offset-2 hover:underline"
        href={`/landings/${id}`}
      >
        Back to landing
      </Link>
      <h1 className="text-2xl font-semibold">
        {landingQuery.data?.name ?? "Landing"} versions
      </h1>

      <div className="rounded-md border">
        {versionItems.map((version) => (
          <div
            key={version.id}
            className="flex flex-wrap items-center gap-2 border-b p-3 last:border-b-0"
          >
            <span className="rounded border px-2 py-0.5 text-xs">
              v{version.versionNum}
            </span>
            <span className="text-sm">
              {version.author?.name ?? version.author?.email ?? "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(version.createdAt).toLocaleString("en")}
            </span>
            <span className="text-xs text-muted-foreground">
              {version.message ?? "No reason"}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant={fromId === version.id ? "default" : "outline"}
                onClick={() => setFromId(version.id)}
              >
                From
              </Button>
              <Button
                size="sm"
                variant={toId === version.id ? "default" : "outline"}
                onClick={() => setToId(version.id)}
              >
                To
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate(version.id)}
              >
                Restore
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={!versionsQuery.data?.nextCursor}
          onClick={() => {
            if (!versionsQuery.data?.nextCursor) return;
            const next = new URLSearchParams(searchParams.toString());
            next.set("cursor", versionsQuery.data.nextCursor);
            router.push(`/landings/${id}/versions?${next.toString()}`);
          }}
        >
          Next page
        </Button>
      </div>

      {selectedPair.from && selectedPair.to ? (
        <div className="space-y-3 rounded-md border p-4">
          <h2 className="text-lg font-semibold">
            Diff v{selectedPair.from.versionNum} -&gt; v{selectedPair.to.versionNum}
          </h2>

          {diffQuery.data?.priceHighlights?.length ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="font-medium">Price changes</p>
              {diffQuery.data.priceHighlights.map((change) => (
                <p key={change.key}>
                  {change.key}: {change.from ?? "-"} -&gt; {change.to ?? "-"}
                </p>
              ))}
            </div>
          ) : null}

          {diffQuery.data?.fields
            ?.filter((field) => field.changed)
            .map((field) => (
              <div key={field.field} className="space-y-2">
                <h3 className="text-sm font-semibold">{field.field}</h3>
                <JsonDiff from={field.from} to={field.to} />
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
