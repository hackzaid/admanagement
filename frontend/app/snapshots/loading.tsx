import { WorkspaceLoadingPage } from "@/components/loading/workspace-loading";

export default function Loading() {
  return (
    <WorkspaceLoadingPage
      title="Directory compliance and state drift"
      subtitle="Loading snapshot findings, privileged exposure, and stale identity evidence."
      eyebrow="Compliance"
    />
  );
}
