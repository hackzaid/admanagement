import { WorkspaceLoadingPage } from "@/components/loading/workspace-loading";

export default function Loading() {
  return (
    <WorkspaceLoadingPage
      title="Administrative user actions"
      subtitle="Loading current operator activity, object changes, and recent event rows."
      eyebrow="AD Changes"
    />
  );
}
