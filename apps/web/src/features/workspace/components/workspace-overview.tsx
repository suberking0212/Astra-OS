import { Clock3 } from "lucide-react";

import type {
  HistoryTaskView,
  TaskComposerView,
  WorkspacePreviewStateView,
  WorkspaceTaskView,
  WorkspaceUnavailableView,
} from "@/features/workspace/contract/view-model";
import { ActiveTaskPanel } from "@/features/workspace/components/active-task-panel";
import { NeedsAttentionPanel } from "@/features/workspace/components/needs-attention-panel";
import { ResultHistoryPanel } from "@/features/workspace/components/result-history-panel";
import { TaskComposer } from "@/features/workspace/components/task-composer";
import { TaskProgressPanel } from "@/features/workspace/components/task-progress-panel";

type WorkspaceOverviewProps = {
  workspaceName: string;
  statusLabel: string;
  previewStates?: WorkspacePreviewStateView[];
  task: WorkspaceTaskView | null;
  history: HistoryTaskView[];
  composer: TaskComposerView;
  unavailable?: WorkspaceUnavailableView;
};

export function WorkspaceOverview({
  workspaceName,
  statusLabel,
  previewStates,
  task,
  history,
  composer,
  unavailable,
}: WorkspaceOverviewProps) {
  return (
    <>
      <header className="agent-work-top">
        <div className="agent-task-title" id="workspace-title">
          {workspaceName}
        </div>
        <div className="agent-top-actions">
          <div className="agent-credit-pill" aria-label="Workspace status">
            <Clock3 className="icon" aria-hidden="true" />
            {statusLabel}
          </div>
        </div>
      </header>

      <section className="agent-conversation workspace-task-surface" aria-labelledby="workspace-title">
        {previewStates?.length ? (
          <div className="workspace-preview-state-row" aria-label="Preview coverage">
            {previewStates.map((item) => (
              <span className={`workspace-state-pill ${item.status}`} key={item.id}>
                {item.label}
              </span>
            ))}
          </div>
        ) : null}

        {task ? (
          <div className="workspace-task-grid">
            <ActiveTaskPanel task={task} />
            {task.progress ? <TaskProgressPanel progress={task.progress} /> : null}
            {task.interactions.length > 0 ? <NeedsAttentionPanel interactions={task.interactions} /> : null}
            <ResultHistoryPanel result={task.result} history={history} />
          </div>
        ) : unavailable ? (
          <div className="agent-run-feed workspace-task-surface">
            <div className="workspace-task-grid workspace-task-grid-single">
              <section className="workspace-task-card workspace-task-card-wide" aria-labelledby="workspace-unavailable-title">
                <div className="workspace-task-card-head">
                  <div>
                    <span className="workspace-task-eyebrow">Workspace Product Shape</span>
                    <h2 id="workspace-unavailable-title">{unavailable.title}</h2>
                  </div>
                  <span className="workspace-state-pill">Unavailable</span>
                </div>
                <p className="workspace-task-intent">{unavailable.description}</p>
                <p className="workspace-task-note">{unavailable.note}</p>
              </section>
            </div>
          </div>
        ) : null}
      </section>

      <TaskComposer composer={composer} />
    </>
  );
}
