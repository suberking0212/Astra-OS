import type { InteractionView } from "@/features/workspace/contract/view-model";

type InteractionRendererProps = {
  interaction: InteractionView;
};

export function InteractionRenderer({ interaction }: InteractionRendererProps) {
  return (
    <article className={`workspace-interaction-card ${interaction.kind}`} aria-label={interaction.title}>
      <div className="workspace-interaction-head">
        <div>
          <span className="workspace-task-eyebrow">{interaction.kind.replace("_", " ")}</span>
          <h3>{interaction.title}</h3>
        </div>
        <span className={`workspace-state-pill ${interaction.riskLevel === "high" ? "failed" : interaction.riskLevel}`}>
          {interaction.statusLabel ?? interaction.riskLevel}
        </span>
      </div>

      <p className="workspace-task-note">{interaction.body}</p>

      {interaction.emphasisNote ? <p className="workspace-interaction-emphasis">{interaction.emphasisNote}</p> : null}

      {interaction.fields.length > 0 ? (
        <div className="workspace-interaction-fields">
          {interaction.fields.map((field) => (
            <div className="workspace-result-item" key={field.key}>
              <strong>{field.label}</strong>
              <span>{field.value ?? field.placeholder ?? "Required"}</span>
            </div>
          ))}
        </div>
      ) : null}

      {interaction.options.length > 0 ? (
        <div className="workspace-interaction-options">
          {interaction.options.map((option) => (
            <div className="workspace-result-item" key={option.value}>
              <strong>{option.label}</strong>
              <span>{option.description ?? option.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {interaction.responseSummary ? <p className="workspace-interaction-response">{interaction.responseSummary}</p> : null}

      <div className="workspace-action-row" aria-label="Interaction actions">
        {interaction.actions.map((action) => (
          <button
            key={`${interaction.id}-${action.action}`}
            type="button"
            className={`workspace-action-button ${action.emphasis}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </article>
  );
}
