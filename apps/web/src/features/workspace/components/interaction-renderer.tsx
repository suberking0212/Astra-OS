"use client";

import { useState } from "react";
import type { InteractionAction, InteractionView } from "@/features/workspace/contract/view-model";

type Props = {
  interaction: InteractionView;
  busy?: boolean;
  onAction?: (interactionId: string, action: InteractionAction, data: Record<string, unknown>) => Promise<void>;
};

export function InteractionRenderer({ interaction, busy = false, onAction }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(
    interaction.fields.map((field) => [field.key, field.value ?? ""]),
  ));

  return (
    <article className={`workspace-interaction-card ${interaction.kind}`} aria-label={interaction.title}>
      <div className="workspace-interaction-head">
        <div><span className="workspace-task-eyebrow">{interaction.kind.replace("_", " ")}</span><h3>{interaction.title}</h3></div>
        <span className={`workspace-state-pill ${interaction.riskLevel === "high" ? "failed" : interaction.riskLevel}`}>{interaction.statusLabel ?? interaction.riskLevel}</span>
      </div>
      <p className="workspace-task-note">{interaction.body}</p>
      {interaction.emphasisNote ? <p className="workspace-interaction-emphasis">{interaction.emphasisNote}</p> : null}
      {interaction.fields.length ? <div className="workspace-interaction-fields">{interaction.fields.map((field) => (
        <label className="workspace-result-item" key={field.key}>
          <strong>{field.label}</strong>
          {field.type === "textarea" ? <textarea value={values[field.key] ?? ""} placeholder={field.placeholder ?? undefined} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} /> : <input type={field.type === "file" ? "text" : field.type} value={values[field.key] ?? ""} placeholder={field.placeholder ?? undefined} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} />}
        </label>
      ))}</div> : null}
      {interaction.options.length ? <div className="workspace-interaction-options">{interaction.options.map((option) => <div className="workspace-result-item" key={option.value}><strong>{option.label}</strong><span>{option.description ?? option.value}</span></div>)}</div> : null}
      {interaction.responseSummary ? <p className="workspace-interaction-response">{interaction.responseSummary}</p> : null}
      <div className="workspace-action-row" aria-label="Interaction actions">
        {interaction.actions.map((action) => <button key={`${interaction.id}-${action.action}`} type="button" disabled={busy || !onAction} className={`workspace-action-button ${action.emphasis}`} onClick={() => void onAction?.(interaction.id, action.action, values)}>{action.label}</button>)}
      </div>
    </article>
  );
}
