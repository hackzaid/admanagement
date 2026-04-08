import { WorkspaceLoadingPage } from "@/components/loading/workspace-loading";

export default function Loading() {
  return (
    <WorkspaceLoadingPage
      title="System and release management"
      subtitle="Loading runtime posture, scheduler status, and deployment health."
      eyebrow="System"
    />
  );
}
