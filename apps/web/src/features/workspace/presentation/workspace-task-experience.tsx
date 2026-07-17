"use client";

import { useCallback, useEffect, useState } from "react";

import { WorkspaceOverview } from "@/features/workspace/components/workspace-overview";
import type { WorkspaceTaskSurfaceView, WorkspaceUnavailableView } from "@/features/workspace/contract/view-model";
import type { WorkspaceTaskRepository } from "@/features/workspace/repositories/workspace-task-repository";

type Props = {
  workspaceId: string;
  repository: WorkspaceTaskRepository;
  fallbackWorkspaceName: string;
};

export function WorkspaceTaskExperience({ workspaceId, repository, fallbackWorkspaceName }: Props) {
  const [surface, setSurface] = useState<WorkspaceTaskSurfaceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setSurface(await repository.loadWorkspaceTaskView(workspaceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task experience is unavailable.");
    }
  }, [repository, workspaceId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const execute = useCallback(async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update the task.");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const unavailable: WorkspaceUnavailableView | undefined = !surface ? {
    title: "Task experience is unavailable",
    description: error ?? "Loading the Workspace Presentation API.",
    note: "The production composition root only uses the API Repository. Enable the isolated Mock API explicitly for Phase 2 development.",
  } : undefined;

  return (
    <>
      {error && surface ? <div className="form-alert error">{error}</div> : null}
      <WorkspaceOverview
        workspaceName={surface?.workspace.name ?? fallbackWorkspaceName}
        statusLabel={busy ? "Updating task" : surface?.statusLabel ?? "Workspace API unavailable"}
        task={surface?.task ?? null}
        history={surface?.history ?? []}
        composer={surface?.composer ?? {
          currentRequirement: "Connect the versioned Workspace Presentation API.",
          placeholder: "Task submission is unavailable.", prefill: "", suggestedPrompts: [], supportsAttachments: false,
          disabled: true, disabledReason: error ?? "Loading task experience.", submitLabel: "Unavailable", addContextLabel: "Unavailable",
        }}
        unavailable={unavailable}
        busy={busy}
        onSubmitTask={(intent, references) => execute(() => repository.submitTask({ workspaceId, intent, references }))}
        onInteractionAction={(interactionId, action, data) => {
          if (!surface?.task) return Promise.resolve();
          return execute(() => repository.submitInteractionResponse({ taskId: surface.task!.id, interactionId, action, data }));
        }}
        onRetry={() => surface?.task ? execute(() => repository.retryTask({ taskId: surface.task!.id })) : Promise.resolve()}
        onCancel={() => surface?.task ? execute(() => repository.cancelTask({ taskId: surface.task!.id })) : Promise.resolve()}
      />
    </>
  );
}
