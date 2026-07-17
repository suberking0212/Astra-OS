import type {
  ResultView,
  SubmitInteractionResponseInput,
  SubmitTaskInput,
  TaskCommandInput,
  WorkspaceApiErrorEnvelope,
  WorkspaceTaskSurfaceView,
  WorkspaceTaskView,
} from "@astraos/shared";

import {
  WorkspaceRepositoryError,
  type WorkspaceTaskRepository,
} from "@/features/workspace/repositories/workspace-task-repository";

type FetchLike = typeof fetch;

export class ApiWorkspaceTaskRepository implements WorkspaceTaskRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => string | null,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  loadWorkspaceTaskView(workspaceId: string) {
    return this.request<WorkspaceTaskSurfaceView>(`/api/workspaces/${workspaceId}/task-view`);
  }

  submitTask(input: SubmitTaskInput) {
    return this.request<WorkspaceTaskView>(`/api/workspaces/${input.workspaceId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ intent: input.intent, references: input.references }),
    });
  }

  submitInteractionResponse(input: SubmitInteractionResponseInput) {
    return this.request<WorkspaceTaskView>(
      `/api/tasks/${input.taskId}/interactions/${input.interactionId}/responses`,
      { method: "POST", body: JSON.stringify({ action: input.action, data: input.data }) },
    );
  }

  retryTask(input: TaskCommandInput) {
    return this.request<WorkspaceTaskView>(`/api/tasks/${input.taskId}/commands/retry`, { method: "POST" });
  }

  cancelTask(input: TaskCommandInput) {
    return this.request<WorkspaceTaskView>(`/api/tasks/${input.taskId}/commands/cancel`, { method: "POST" });
  }

  loadTask(taskId: string) {
    return this.request<WorkspaceTaskView>(`/api/tasks/${taskId}`);
  }

  loadTaskResult(taskId: string) {
    return this.request<ResultView | null>(`/api/tasks/${taskId}/result`);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      let error: WorkspaceApiErrorEnvelope = {
        code: "workspace_request_failed",
        message: `Workspace request failed with status ${response.status}.`,
        retryable: response.status >= 500,
        details: null,
      };
      try {
        const candidate = (await response.json()) as Partial<WorkspaceApiErrorEnvelope>;
        if (typeof candidate.message === "string" && typeof candidate.code === "string") {
          error = {
            code: candidate.code,
            message: candidate.message,
            retryable: candidate.retryable === true,
            details: candidate.details ?? null,
          };
        }
      } catch {
        // Keep the stable fallback envelope.
      }
      throw new WorkspaceRepositoryError(error.message, response.status, error.code, error.retryable);
    }
    return (await response.json()) as T;
  }
}
