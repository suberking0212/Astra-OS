import { Brain, Clock3 } from "lucide-react";

import type { WorkspaceTaskView } from "@/features/workspace/contract/view-model";

type ActiveTaskPanelProps = {
  task: WorkspaceTaskView;
  busy?: boolean;
  onRetry?: () => Promise<void>;
  onCancel?: () => Promise<void>;
};

export function ActiveTaskPanel({ task, busy, onRetry, onCancel }: ActiveTaskPanelProps) {
  return (
    <section className="workspace-task-card workspace-task-card-wide" aria-labelledby="active-task-title">
      <div className="workspace-task-card-head">
        <div>
          <span className="workspace-task-eyebrow">Active Task</span>
          <h2 id="active-task-title">{task.title}</h2>
        </div>
        <span className={`workspace-state-pill ${task.status}`}>{task.statusLabel}</span>
      </div>

      <p className="workspace-task-intent">{task.userIntent}</p>

      <div className="workspace-task-understanding">
        <div className="workspace-task-understanding-head">
          <Brain className="icon" aria-hidden="true" />
          <span>System understanding</span>
        </div>
        <ul>
          {task.understanding.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="workspace-task-facts" aria-label="Task facts">
        {task.facts.map((fact) => (
          <span key={`${fact.label}-${fact.value}`}>
            {fact.label}: {fact.value}
          </span>
        ))}
      </div>

      <div className="workspace-task-meta">
        <Clock3 className="icon" aria-hidden="true" />
        <span>{task.progressSummary}</span>
      </div>
      <div className="workspace-action-row" aria-label="Task actions">
        {task.status === "failed" && onRetry ? <button className="workspace-action-button primary" disabled={busy} onClick={() => void onRetry()} type="button">Retry task</button> : null}
        {!['completed', 'cancelled'].includes(task.status) && onCancel ? <button className="workspace-action-button secondary" disabled={busy} onClick={() => void onCancel()} type="button">Cancel task</button> : null}
      </div>
    </section>
  );
}
