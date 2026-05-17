"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { fetchLanding, fetchLandingRawContext } from "../../../../lib/api";

export default function LandingDetailPage() {
  const { id } = useParams<{ id: string }>();

  const landingQuery = useQuery({
    queryKey: ["crm", "landing", id],
    queryFn: () => fetchLanding(id)
  });
  const contextQuery = useQuery({
    queryKey: ["crm", "landing", id, "context"],
    queryFn: () => fetchLandingRawContext(id)
  });

  return (
    <div className="space-y-4">
      <Link className="text-sm underline-offset-2 hover:underline" href="/landings">
        Back to landings
      </Link>
      <h1 className="text-2xl font-semibold">{landingQuery.data?.name ?? "Landing"}</h1>
      <div className="grid gap-2 rounded-md border bg-card p-4 text-sm md:grid-cols-2">
        <p>
          <span className="font-medium">Public ID:</span>{" "}
          {landingQuery.data?.publicId ?? "-"}
        </p>
        <p>
          <span className="font-medium">Status:</span> {landingQuery.data?.status ?? "-"}
        </p>
        <p>
          <span className="font-medium">Origin:</span> {landingQuery.data?.origin ?? "-"}
        </p>
        <p>
          <span className="font-medium">Slug:</span> {landingQuery.data?.slug ?? "-"}
        </p>
      </div>
      <div>
        <h2 className="mb-2 text-lg font-semibold">Raw context JSON</h2>
        <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
          {JSON.stringify(contextQuery.data ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
