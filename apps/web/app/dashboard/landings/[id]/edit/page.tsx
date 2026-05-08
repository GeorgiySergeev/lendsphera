import { LandingEditorShell } from "../../../../../components/editor/landing-editor-shell";

export default async function LandingEditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <LandingEditorShell landingId={id} />;
}
