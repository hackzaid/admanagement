import { WorkspaceLoadingPage } from "@/components/loading/workspace-loading";

export default function Loading() {
  return (
    <WorkspaceLoadingPage
      title="Reports"
      subtitle="Loading report context, filters, visual summaries, and detailed evidence rows."
      eyebrow="Reports"
    />
  );
}
