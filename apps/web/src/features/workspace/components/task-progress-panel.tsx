import { Clock3 } from "lucide-react";

import type { TaskProgressView } from "@/features/workspace/contract/view-model";

const progressClassName = {
  pending: "",
  running: "running",
  completed: "succeeded",
  failed: "failed",
  cancelled: "failed",
} as const;

type TaskProgressPanelProps = {
  progress: TaskProgressView;
};

export function TaskProgressPanel({ progress }: TaskProgressPanelProps) {
  return (
    <section className="workspace-task-card workspace-task-card-wide workspace-timeline-card" aria-labelledby="task-progress-title">
      <div className="workspace-task-card-head">
        <div>
          <span className="workspace-task-eyebrow">Task Timeline</span>
          <h2 id="task-progress-title">Business progress</h2>
        </div>
        <Clock3 className="icon" aria-hidden="true" />
      </div>

      <p className="workspace-task-note">{progress.summary}</p>

      <div className="workspace-plan-list">
        {progress.items.map((item, index) => (
          <div className={`agent-task-step ${progressClassName[item.status]}`} key={item.id}>
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
  );
}
