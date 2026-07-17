import type {
  ResultView,
  SubmitInteractionResponseInput,
  SubmitTaskInput,
  TaskCommandInput,
  WorkspaceTaskSurfaceView,
  WorkspaceTaskView,
} from "@astraos/shared";

export interface WorkspaceTaskRepository {
  loadWorkspaceTaskView(workspaceId: string): Promise<WorkspaceTaskSurfaceView>;
  submitTask(input: SubmitTaskInput): Promise<WorkspaceTaskView>;
  submitInteractionResponse(input: SubmitInteractionResponseInput): Promise<WorkspaceTaskView>;
  retryTask(input: TaskCommandInput): Promise<WorkspaceTaskView>;
  cancelTask(input: TaskCommandInput): Promise<WorkspaceTaskView>;
  loadTask(taskId: string): Promise<WorkspaceTaskView>;
  loadTaskResult(taskId: string): Promise<ResultView | null>;
}

export class WorkspaceRepositoryError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "WorkspaceRepositoryError";
  }
}
