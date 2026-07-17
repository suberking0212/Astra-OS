"use client";

import { ArrowUp, Plus } from "lucide-react";
import { FormEvent, useRef, useState } from "react";

import type { TaskComposerView } from "@/features/workspace/contract/view-model";

type TaskComposerProps = {
  composer: TaskComposerView;
  busy?: boolean;
  onSubmit?: (intent: string, references: Array<{ name: string; mediaType: string | null }>) => Promise<void>;
};

export function TaskComposer({ composer, busy = false, onSubmit }: TaskComposerProps) {
  const [intent, setIntent] = useState(composer.prefill);
  const [references, setReferences] = useState<Array<{ name: string; mediaType: string | null }>>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!intent.trim() || !onSubmit) return;
    await onSubmit(intent.trim(), references);
    setIntent("");
    setReferences([]);
  }
  return (
    <section className="agent-bottom-stack" aria-label="Task composer">
      <div className="workspace-composer-shell">
        <div className="workspace-current-requirement">
          <span>Current requirement</span>
          <p>{composer.currentRequirement}</p>
        </div>

        <form className="agent-composer" onSubmit={handleSubmit}>
          <label>
            <span className="sr-only">Describe your task</span>
            <textarea
              aria-label="Task prompt"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              disabled={composer.disabled || busy}
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

          {references.length ? <p className="workspace-composer-hint">References: {references.map((item) => item.name).join(", ")}</p> : null}

          <div className="agent-composer-footer">
            <button
              className="agent-composer-plus"
              type="button"
              disabled={composer.disabled || busy || !composer.supportsAttachments}
              aria-label={composer.addContextLabel}
              onClick={() => fileInput.current?.click()}
            >
              <Plus className="icon" aria-hidden="true" />
            </button>
            <input
              ref={fileInput}
              type="file"
              hidden
              multiple
              disabled={!composer.supportsAttachments || composer.disabled || busy}
              onChange={(event) => setReferences(Array.from(event.target.files ?? []).map((file) => ({ name: file.name, mediaType: file.type || null })))}
            />
            <span className="agent-composer-spacer" />
            <button
              className="agent-send"
              type="submit"
              disabled={composer.disabled || busy || !intent.trim()}
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
