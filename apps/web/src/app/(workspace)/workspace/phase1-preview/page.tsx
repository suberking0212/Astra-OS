import {
  AlertTriangle,
  ArrowUp,
  Brain,
  Clock3,
  FileText,
  Plus,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";

import { phase1WorkspacePreview } from "@/mock/preview/workspace/phase1-task-preview";

export const dynamic = "force-dynamic";

const timelineStatusClass = {
  done: "succeeded",
  active: "running",
  failed: "failed",
  pending: "",
  blocked: "failed",
} as const;

export default function WorkspacePhase1PreviewPage() {
  if (process.env.ENABLE_WORKSPACE_PREVIEWS !== "true") {
    notFound();
  }

  const preview = phase1WorkspacePreview;

  return (
    <main className="agent-experience agent-workspace-view">
      <section className="agent-workspace" aria-labelledby="workspace-preview-title">
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
                <span className="agent-inbox-status">product shape</span>
              </span>
            </span>
          </button>

          <div className="agent-nav-area">
            <p className="agent-section-label">
              <span>Preview States</span>
            </p>
            <button className="agent-task-item" type="button">
              <Brain className="icon" aria-hidden="true" />
              <span className="agent-task-item-text">Customer complaint reply</span>
            </button>
          </div>
        </aside>

        <section className="agent-work-main">
          <header className="agent-work-top">
            <button className="agent-task-title" type="button" id="workspace-preview-title">
              <Brain className="icon" aria-hidden="true" />
              {preview.workspace.name}
            </button>

            <div className="agent-top-actions">
              <button className="agent-credit-pill" type="button" aria-label="Preview task status">
                <Clock3 className="icon" aria-hidden="true" />
                {preview.activeTask.statusLabel}
                <span className="agent-upgrade">Preview</span>
              </button>
            </div>
          </header>

          <section className="agent-conversation workspace-task-surface" aria-label="Phase 1 virtual conversation">
            <div className="agent-time">Complete virtual conversation</div>
            <div className="agent-user-bubble">{preview.activeTask.userIntent}</div>

            <div className="agent-run-feed">
              <div className="agent-run-line">
                <Sparkles className="icon" aria-hidden="true" />
                <span>{preview.activeTask.progressSummary}</span>
              </div>

              <div className="agent-thinking-card">
                <div className="agent-thinking-head">
                  <div className="agent-thinking-title">
                    <Brain className="icon" aria-hidden="true" />
                    <span>Conversation sample</span>
                  </div>
                  <span className="agent-task-step-status">All key states</span>
                </div>
                <div className="agent-thinking-body">
                  {preview.conversation.map((message) => (
                    <div className="agent-task-step succeeded" key={message.id}>
                      <span className="agent-task-step-dot" />
                      <div className="agent-task-step-content">
                        <div className="agent-task-step-heading">
                          <span className="agent-task-step-name">
                            {message.title ?? (message.role === "user" ? "User message" : "Assistant message")}
                          </span>
                          <span className="agent-task-step-status">{message.createdAt}</span>
                        </div>
                        <p>{message.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="workspace-task-grid">
                <section className="workspace-task-card workspace-task-card-wide" aria-labelledby="preview-timeline-title">
                  <div className="workspace-task-card-head">
                    <div>
                      <span className="workspace-task-eyebrow">Task Timeline</span>
                      <h2 id="preview-timeline-title">Business progress</h2>
                    </div>
                    <Clock3 className="icon" aria-hidden="true" />
                  </div>
                  <div className="workspace-plan-list">
                    {preview.timeline.items.map((item, index) => (
                      <div className={`agent-task-step ${timelineStatusClass[item.status]}`} key={item.id}>
                        <span className="agent-task-step-dot">{index + 1}</span>
                        <div className="agent-task-step-content">
                          <div className="agent-task-step-heading">
                            <span className="agent-task-step-name">{item.label}</span>
                            <span className="agent-task-step-status">{item.timestamp ?? item.status}</span>
                          </div>
                          <p>{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="workspace-task-card" aria-labelledby="preview-risk-title">
                  <div className="workspace-task-card-head">
                    <div>
                      <span className="workspace-task-eyebrow">Risk Notice</span>
                      <h2 id="preview-risk-title">Before sending</h2>
                    </div>
                    <AlertTriangle className="icon" aria-hidden="true" />
                  </div>
                  <p className="workspace-task-note">{preview.riskNotice}</p>
                </section>

                <section className="workspace-task-card" aria-labelledby="preview-failure-title">
                  <div className="workspace-task-card-head">
                    <div>
                      <span className="workspace-task-eyebrow">Failure / Cancel State</span>
                      <h2 id="preview-failure-title">{preview.failureState.title}</h2>
                    </div>
                    <AlertTriangle className="icon" aria-hidden="true" />
                  </div>
                  <p className="workspace-task-note">{preview.failureState.body}</p>
                  <p className="workspace-task-note">{preview.cancelState.body}</p>
                </section>

                <section className="workspace-task-card workspace-task-card-wide" aria-labelledby="preview-result-title">
                  <div className="workspace-task-card-head">
                    <div>
                      <span className="workspace-task-eyebrow">Task Result</span>
                      <h2 id="preview-result-title">{preview.result.title}</h2>
                    </div>
                    <FileText className="icon" aria-hidden="true" />
                  </div>
                  <p className="workspace-task-intent">{preview.result.summary}</p>
                  <div className="workspace-result-grid">
                    {preview.result.objects.map((object) => (
                      <div className="workspace-result-item" key={object.label}>
                        <strong>{object.label}</strong>
                        <span>{object.value}</span>
                      </div>
                    ))}
                    <div className="workspace-result-item">
                      <strong>Next Actions</strong>
                      <span>{preview.result.nextActions.join(" ")}</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </section>

          <section className="agent-bottom-stack" aria-label="Task composer">
            <form className="agent-composer">
              <label>
                <span className="sr-only">Describe your task</span>
                <textarea
                  aria-label="Task prompt"
                  defaultValue={preview.conversation[0]?.body}
                  placeholder={preview.composer.placeholder}
                  rows={3}
                />
              </label>
              <div className="agent-composer-footer">
                <button className="agent-composer-plus" type="button" aria-label="Add context">
                  <Plus className="icon" aria-hidden="true" />
                </button>
                <span className="agent-composer-spacer" />
                <button className="agent-send" type="button" aria-label="Submit task">
                  <ArrowUp className="icon" aria-hidden="true" />
                </button>
              </div>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}
