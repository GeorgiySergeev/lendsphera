"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchLanding, promoteLegacyLanding } from "../../../../../lib/api";

export default function LandingPromotePage() {
  const { id } = useParams<{ id: string }>();
  const wrappedQuery = useQuery({
    queryKey: ["crm", "landing", id],
    queryFn: () => fetchLanding(id)
  });
  const promote = useMutation({
    mutationFn: () => promoteLegacyLanding(id)
  });
  const candidateId = promote.data?.nativeDraftLandingId;
  const candidateQuery = useQuery({
    queryKey: ["crm", "landing", candidateId],
    queryFn: () => fetchLanding(candidateId as string),
    enabled: Boolean(candidateId)
  });

  return (
    <div className="space-y-4">
      <Link
        className="text-sm underline-offset-2 hover:underline"
        href={`/landings/${id}`}
      >
        Back to landing
      </Link>
      <h1 className="text-2xl font-semibold">Promote To Native</h1>
      <p className="text-sm text-muted-foreground">
        Runs parser, detector, mapper, and asset uploader to create a draft native
        landing.
      </p>
      <button
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        disabled={promote.isPending}
        onClick={() => promote.mutate()}
        type="button"
      >
        {promote.isPending ? "Promoting..." : "Run Promote"}
      </button>
      {promote.data ? (
        <div className="rounded border bg-card p-3 text-sm">
          <p>Draft ID: {promote.data.nativeDraftLandingId}</p>
          <p>Idempotent: {promote.data.idempotent ? "yes" : "no"}</p>
          <p>Detected blocks: {promote.data.detectedBlocks}</p>
          <p>Uploaded assets: {promote.data.uploadedAssets}</p>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border bg-card p-3">
          <h2 className="mb-2 font-semibold">Legacy Wrapped</h2>
          <p className="mb-2 text-xs text-muted-foreground">
            {wrappedQuery.data?.name ?? "Loading..."} ({wrappedQuery.data?.origin ?? "-"})
          </p>
          <pre className="max-h-[420px] overflow-auto rounded bg-muted/30 p-2 text-xs">
            {JSON.stringify(
              {
                id: wrappedQuery.data?.id,
                slug: wrappedQuery.data?.slug,
                status: wrappedQuery.data?.status,
                legacyFrom: wrappedQuery.data?.legacyFrom
              },
              null,
              2
            )}
          </pre>
        </div>
        <div className="rounded border bg-card p-3">
          <h2 className="mb-2 font-semibold">Candidate Native Draft</h2>
          {candidateId ? (
            <>
              <p className="mb-2 text-xs text-muted-foreground">
                {candidateQuery.data?.name ?? "Loading..."} (
                {candidateQuery.data?.origin ?? "-"})
              </p>
              <pre className="max-h-[420px] overflow-auto rounded bg-muted/30 p-2 text-xs">
                {JSON.stringify(
                  {
                    id: candidateQuery.data?.id,
                    slug: candidateQuery.data?.slug,
                    status: candidateQuery.data?.status
                  },
                  null,
                  2
                )}
              </pre>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run promote to generate native draft.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
