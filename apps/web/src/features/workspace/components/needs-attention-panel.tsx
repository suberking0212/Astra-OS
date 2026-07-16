import { AlertTriangle } from "lucide-react";

import type { InteractionView } from "@/features/workspace/contract/view-model";
import { InteractionRenderer } from "@/features/workspace/components/interaction-renderer";

type NeedsAttentionPanelProps = {
  interactions: InteractionView[];
};

export function NeedsAttentionPanel({ interactions }: NeedsAttentionPanelProps) {
  return (
    <section className="workspace-task-card" aria-labelledby="needs-attention-title">
      <div className="workspace-task-card-head">
        <div>
          <span className="workspace-task-eyebrow">Needs Attention</span>
          <h2 id="needs-attention-title">What the user needs to do next</h2>
        </div>
        <AlertTriangle className="icon" aria-hidden="true" />
      </div>

      <div className="workspace-attention-stack">
        {interactions.map((interaction) => (
          <InteractionRenderer interaction={interaction} key={interaction.id} />
        ))}
      </div>
    </section>
  );
}
