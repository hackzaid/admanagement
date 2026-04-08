import { WorkspaceLoadingPage } from "@/components/loading/workspace-loading";

export default function Loading() {
  return (
    <WorkspaceLoadingPage
      title="Configuration"
      subtitle="Loading domain settings, collectors, business hours, and alert controls."
      eyebrow="Configuration"
    />
  );
}
