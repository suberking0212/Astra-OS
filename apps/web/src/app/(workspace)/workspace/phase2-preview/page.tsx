import { notFound } from "next/navigation";

import { Phase2MockWorkspace } from "@/mock/composition/phase2-mock-workspace";

export const dynamic = "force-dynamic";

export default function WorkspacePhase2PreviewPage() {
  if (process.env.ENABLE_WORKSPACE_PREVIEWS !== "true") notFound();
  return (
    <main className="agent-experience agent-workspace-view">
      <section className="agent-workspace" aria-labelledby="workspace-title">
        <section className="agent-work-main"><Phase2MockWorkspace /></section>
      </section>
    </main>
  );
}
