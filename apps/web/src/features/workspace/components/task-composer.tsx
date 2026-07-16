import { ArrowUp, Plus } from "lucide-react";

import type { TaskComposerView } from "@/features/workspace/contract/view-model";

type TaskComposerProps = {
  composer: TaskComposerView;
};

export function TaskComposer({ composer }: TaskComposerProps) {
  return (
    <section className="agent-bottom-stack" aria-label="Task composer">
      <div className="workspace-composer-shell">
        <div className="workspace-current-requirement">
          <span>Current requirement</span>
          <p>{composer.currentRequirement}</p>
        </div>

        <form className="agent-composer">
          <label>
            <span className="sr-only">Describe your task</span>
            <textarea
              aria-label="Task prompt"
              defaultValue={composer.prefill}
              disabled={composer.disabled}
              placeholder={composer.placeholder}
              rows={3}
            />
          </label>

          {composer.disabledReason ? (
            <p className="workspace-composer-hint">{composer.disabledReason}</p>
          ) : (
            <div className="workspace-composer-suggestions" aria-label="Suggested prompts">
              {composer.suggestedPrompts.map((prompt) => (
                <span key={prompt}>{prompt}</span>
              ))}
            </div>
          )}

          <div className="agent-composer-footer">
            <button
              className="agent-composer-plus"
              type="button"
              disabled={composer.disabled}
              aria-label={composer.addContextLabel}
            >
              <Plus className="icon" aria-hidden="true" />
            </button>
            <span className="agent-composer-spacer" />
            <button
              className="agent-send"
              type="button"
              disabled={composer.disabled}
              aria-label={composer.submitLabel}
            >
              <ArrowUp className="icon" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
