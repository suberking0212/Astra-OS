import { FileText, History } from "lucide-react";

import type { HistoryTaskView, ResultView } from "@/features/workspace/contract/view-model";

type ResultHistoryPanelProps = {
  result: ResultView | null;
  history: HistoryTaskView[];
};

export function ResultHistoryPanel({ result, history }: ResultHistoryPanelProps) {
  return (
    <section className="workspace-task-card" aria-labelledby="result-history-title">
      <div className="workspace-task-card-head">
        <div>
          <span className="workspace-task-eyebrow">Result / History</span>
          <h2 id="result-history-title">Delivery and recent outcomes</h2>
        </div>
        <FileText className="icon" aria-hidden="true" />
      </div>

      {result ? (
        <div className="workspace-result-stack">
          <div className="workspace-task-card-subhead">
            <strong>{result.title}</strong>
            <span className={`workspace-state-pill ${result.status}`}>{result.status}</span>
          </div>
          <p className="workspace-task-intent">{result.summary}</p>
          <div className="workspace-result-grid">
            {result.businessObjects.map((object) => (
              <div className="workspace-result-item" key={object.id}>
                <strong>{object.label}</strong>
                <span>{object.value ?? object.type}</span>
              </div>
            ))}
            <div className="workspace-result-item">
              <strong>Next actions</strong>
              <span>{result.nextActions.join(" ")}</span>
            </div>
            {result.failureReason ? (
              <div className="workspace-result-item">
                <strong>Failure reason</strong>
                <span>{result.failureReason}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="workspace-history-head">
        <History className="icon" aria-hidden="true" />
        <span>Recent history</span>
      </div>
      <div className="workspace-history-list">
        {history.map((item) => (
          <div className="workspace-history-item" key={item.id}>
            <div className="workspace-history-item-head">
              <strong>{item.title}</strong>
              <span className={`workspace-state-pill ${item.status}`}>{item.status}</span>
            </div>
            <p>{item.summary}</p>
            <span className="workspace-history-meta">{item.updatedAt}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
