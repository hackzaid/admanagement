import { WorkspaceLoadingPage } from "@/components/loading/workspace-loading";

export default function Loading() {
  return (
    <WorkspaceLoadingPage
      title="Active Directory home"
      subtitle="Loading current directory posture, authentication pressure, and operational summaries."
      eyebrow="Overview"
    />
  );
}
