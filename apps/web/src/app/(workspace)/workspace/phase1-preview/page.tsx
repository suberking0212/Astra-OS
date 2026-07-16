import { Brain, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { WorkspaceOverview } from "@/features/workspace/components/workspace-overview";
import { phase1WorkspacePreview } from "@/mock/preview/workspace/phase1-task-preview";

export const dynamic = "force-dynamic";

export default function WorkspacePhase1PreviewPage() {
  if (process.env.ENABLE_WORKSPACE_PREVIEWS !== "true") {
    notFound();
  }

  const preview = phase1WorkspacePreview;

  return (
    <main className="agent-experience agent-workspace-view">
      <section className="agent-workspace" aria-labelledby="workspace-title">
        <aside className="agent-sidebar" aria-label="Workspace preview navigation">
          <div className="agent-sidebar-head">
            <div className="agent-brand" aria-label="Astra Workspace">
              <div className="agent-brand-mark" aria-hidden="true" />
              <div className="agent-brand-name">
                <span className="agent-brand-title">Astra</span>
                <span className="agent-brand-subtitle">Workspace</span>
              </div>
            </div>
          </div>

          <button className="agent-inbox-card" type="button">
            <span className="agent-inbox-name red-dot">
              <Sparkles className="icon" aria-hidden="true" />
              <span className="agent-inbox-copy">
                <strong>Phase 1 Preview</strong>
                <span className="agent-inbox-status">workspace product shape</span>
              </span>
            </span>
          </button>

          <div className="agent-nav-area">
            <p className="agent-section-label">Preview Scenario</p>
            <div className="agent-task-item">
              <Brain className="icon" aria-hidden="true" />
              <span className="agent-task-item-text">Customer support complaint flow</span>
            </div>
          </div>
        </aside>

        <section className="agent-work-main">
          <WorkspaceOverview
            workspaceName={preview.workspace.name}
            statusLabel={preview.statusLabel}
            previewStates={preview.previewStates}
            task={preview.activeTask}
            history={preview.history}
            composer={preview.composer}
          />
        </section>
      </section>
    </main>
  );
}
