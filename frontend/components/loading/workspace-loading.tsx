import { AppShell } from "@/components/app-shell";

function LoadingMetric() {
  return (
    <div className="loading-metric">
      <span className="loading-line loading-line-short" />
      <span className="loading-line loading-line-medium" />
    </div>
  );
}

function LoadingCard() {
  return (
    <article className="loading-card">
      <span className="loading-line loading-line-short" />
      <span className="loading-line loading-line-long" />
      <span className="loading-line loading-line-medium" />
    </article>
  );
}

export function WorkspaceLoadingPage({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
}) {
  return (
    <AppShell title={title} subtitle={subtitle} eyebrow={eyebrow} heroMode="none">
      <section className="report-stage motion-stage-block loading-stage">
        <div className="report-stage-copy">
          <span className="report-stage-kicker">{eyebrow}</span>
          <span className="loading-line loading-line-wide" />
          <span className="loading-line loading-line-wide-soft" />
          <span className="loading-line loading-line-medium" />
        </div>
        <div className="report-stage-side">
          <LoadingMetric />
          <LoadingMetric />
        </div>
      </section>

      <section className="card-grid card-grid-four motion-stage-block">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </section>

      <section className="two-column motion-stage-block">
        <div className="loading-panel">
          <div className="loading-panel-head">
            <span className="loading-line loading-line-short" />
            <span className="loading-line loading-line-medium" />
          </div>
          <div className="loading-stack">
            <span className="loading-line loading-line-long" />
            <span className="loading-line loading-line-long" />
            <span className="loading-line loading-line-medium" />
            <span className="loading-line loading-line-long" />
          </div>
        </div>

        <div className="loading-panel">
          <div className="loading-panel-head">
            <span className="loading-line loading-line-short" />
            <span className="loading-line loading-line-medium" />
          </div>
          <div className="loading-table">
            <span className="loading-line loading-line-medium" />
            <span className="loading-line loading-line-long" />
            <span className="loading-line loading-line-long" />
            <span className="loading-line loading-line-medium" />
            <span className="loading-line loading-line-long" />
          </div>
        </div>
      </section>
    </AppShell>
  );
}
