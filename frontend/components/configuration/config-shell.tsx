import { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { ConfigurationOverview } from "@/lib/api";

import { ConfigurationNav } from "./configuration-nav";

export function ConfigurationShell({
  title,
  subtitle,
  overview,
  children,
}: {
  title: string;
  subtitle: string;
  overview: ConfigurationOverview;
  children: ReactNode;
}) {
  return (
    <AppShell title={title} subtitle={subtitle} eyebrow="Configuration">
      <ConfigurationNav overview={overview} />
      {children}
    </AppShell>
  );
}
