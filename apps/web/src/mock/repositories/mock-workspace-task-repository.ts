import {
  WORKSPACE_PRESENTATION_CONTRACT_VERSION,
  type HistoryTaskView,
  type InteractionView,
  type ResultView,
  type SubmitInteractionResponseInput,
  type SubmitTaskInput,
  type TaskCommandInput,
  type WorkspaceTaskSurfaceView,
  type WorkspaceTaskView,
} from "@astraos/shared";

import {
  WorkspaceRepositoryError,
  type WorkspaceTaskRepository,
} from "@/features/workspace/repositories/workspace-task-repository";

const now = () => new Date().toISOString();

export class MockWorkspaceTaskRepository implements WorkspaceTaskRepository {
  private task: WorkspaceTaskView | null = null;
  private history: HistoryTaskView[] = [];
  private sequence = 0;

  constructor(private readonly workspaceId = "demo") {}

  async loadWorkspaceTaskView(workspaceId: string): Promise<WorkspaceTaskSurfaceView> {
    this.assertWorkspace(workspaceId);
    return this.surface();
  }

  async submitTask(input: SubmitTaskInput): Promise<WorkspaceTaskView> {
    this.assertWorkspace(input.workspaceId);
    const intent = input.intent.trim();
    if (!intent) throw this.error("invalid_task", "Task intent is required.");
    if (this.task) this.history.unshift(this.toHistory(this.task));
    this.sequence += 1;
    const id = `mock_task_${this.sequence}`;
    const shouldFail = /simulate failure|missing message|失败/i.test(intent);
    this.task = shouldFail ? this.failedTask(id, intent) : this.contextTask(id, intent, input.references.map((item) => item.name));
    return structuredClone(this.task);
  }

  async submitInteractionResponse(input: SubmitInteractionResponseInput): Promise<WorkspaceTaskView> {
    const task = this.requireTask(input.taskId);
    const interaction = task.interactions.find((item) => item.id === input.interactionId);
    if (!interaction) throw this.error("interaction_not_found", "Interaction is not pending.");

    if (input.action === "cancel") return this.cancelTask({ taskId: task.id });
    if (interaction.kind === "input" && input.action === "submit") {
      for (const field of interaction.fields.filter((item) => item.required)) {
        if (!String(input.data[field.key] ?? "").trim()) {
          throw this.error("invalid_interaction_response", `${field.label} is required.`);
        }
      }
      this.task = this.approvalTask(task, input.data);
    } else if (interaction.kind === "approval" && input.action === "approve") {
      this.task = this.completedTask(task);
    } else if (interaction.kind === "approval" && input.action === "reject") {
      this.task = this.cancelledTask(task, "The proposed follow-up was rejected. No side effect occurred.");
    } else if (interaction.kind === "error_recovery" && input.action === "edit") {
      this.task = this.contextTask(task.id, task.userIntent, []);
    } else {
      throw this.error("invalid_interaction_action", "This action is not valid for the pending interaction.");
    }
    return structuredClone(this.task);
  }

  async retryTask(input: TaskCommandInput): Promise<WorkspaceTaskView> {
    const task = this.requireTask(input.taskId);
    if (task.status !== "failed") throw this.error("task_not_retryable", "Only failed tasks can be retried.");
    this.task = this.contextTask(task.id, task.userIntent, []);
    return structuredClone(this.task);
  }

  async cancelTask(input: TaskCommandInput): Promise<WorkspaceTaskView> {
    const task = this.requireTask(input.taskId);
    if (["completed", "cancelled"].includes(task.status)) {
      throw this.error("task_not_cancellable", "Completed or cancelled tasks cannot be cancelled.");
    }
    this.task = this.cancelledTask(task, "The task was cancelled before any external action occurred.");
    return structuredClone(this.task);
  }

  async loadTask(taskId: string): Promise<WorkspaceTaskView> {
    return structuredClone(this.requireTask(taskId));
  }

  async loadTaskResult(taskId: string): Promise<ResultView | null> {
    return structuredClone(this.requireTask(taskId).result);
  }

  private surface(): WorkspaceTaskSurfaceView {
    return {
      contractVersion: WORKSPACE_PRESENTATION_CONTRACT_VERSION,
      workspace: { id: this.workspaceId, name: "Astra Mock Workspace" },
      statusLabel: "Phase 2 isolated mock",
      task: structuredClone(this.task),
      history: structuredClone(this.history),
      composer: {
        currentRequirement: "Delegate a customer support task through the isolated Phase 2 mock loop.",
        placeholder: "Describe the customer issue and desired outcome.",
        prefill: "",
        suggestedPrompts: ["Draft a missing-delivery reply", "Simulate failure for recovery"],
        supportsAttachments: true,
        disabled: false,
        disabledReason: null,
        submitLabel: "Submit task",
        addContextLabel: "Add reference metadata",
      },
    };
  }

  private contextTask(id: string, intent: string, referenceNames: string[]): WorkspaceTaskView {
    const interaction: InteractionView = {
      id: `${id}_context`, taskId: id, kind: "input", title: "Provide customer context",
      body: "Add the customer email and order number so AstraOS can prepare a useful response.",
      fields: [
        { key: "customer_email", label: "Customer email", type: "text", required: true, placeholder: "alex@example.com" },
        { key: "order_number", label: "Order number", type: "text", required: true, placeholder: "ACME-10492" },
        { key: "preferred_tone", label: "Preferred tone", type: "text", required: false, placeholder: "Calm and apologetic" },
      ], options: [],
      actions: [{ action: "submit", label: "Continue", emphasis: "primary" }, { action: "cancel", label: "Cancel task", emphasis: "secondary" }],
      riskLevel: "none", expiresAt: null, statusLabel: "needs_context",
    };
    return this.baseTask(id, intent, "needs_context", "Needs context", "Waiting for customer details.", [interaction], null, [
      ...(referenceNames.length ? [{ label: "References", value: referenceNames.join(", ") }] : []),
    ]);
  }

  private approvalTask(task: WorkspaceTaskView, data: Record<string, unknown>): WorkspaceTaskView {
    const interaction: InteractionView = {
      id: `${task.id}_approval`, taskId: task.id, kind: "approval", title: "Prepare a support follow-up?",
      body: "The mock will represent a prepared follow-up without creating any real record or external side effect.",
      fields: [], options: [],
      actions: [{ action: "approve", label: "Approve mock action", emphasis: "primary" }, { action: "reject", label: "Reject", emphasis: "danger" }],
      riskLevel: "medium", expiresAt: null, statusLabel: "needs_approval",
      emphasisNote: "Phase 2 approval is product-contract validation only; Governance is not connected.",
    };
    return this.baseTask(task.id, task.userIntent, "needs_approval", "Needs approval", "Reply drafted; waiting for approval.", [interaction], null, [
      { label: "Customer email", value: String(data.customer_email) },
      { label: "Order number", value: String(data.order_number) },
      { label: "Preferred tone", value: String(data.preferred_tone || "Calm and apologetic") },
    ]);
  }

  private completedTask(task: WorkspaceTaskView): WorkspaceTaskView {
    const email = task.facts.find((item) => item.label === "Customer email")?.value ?? "the customer";
    const result: ResultView = {
      status: "succeeded", resultType: "customer_support_reply", title: "Customer reply and follow-up ready",
      summary: "A customer-facing draft and a mock follow-up summary are ready. No external action was performed.",
      businessObjects: [
        { type: "reply_draft", id: `${task.id}_reply`, label: "Customer reply draft", url: null, value: "I’m sorry your device has not arrived. We are checking the order and will share a verified update as soon as possible." },
        { type: "mock_follow_up", id: `${task.id}_followup`, label: "Mock follow-up", url: null, value: `Prepared locally for ${email}; not written to any real system.` },
      ],
      nextActions: ["Review the reply draft.", "Connect a governed write path in Phase 4 before any real follow-up is created."],
      failureReason: null,
    };
    return this.baseTask(task.id, task.userIntent, "completed", "Completed", "Mock result delivered.", [], result, task.facts);
  }

  private failedTask(id: string, intent: string): WorkspaceTaskView {
    const result: ResultView = {
      status: "failed", resultType: "customer_support_reply", title: "Reply could not be prepared",
      summary: "The isolated scenario simulated a missing customer message.", businessObjects: [],
      nextActions: ["Retry and provide the missing context.", "Cancel the task."],
      failureReason: "The customer message was missing from the mock scenario.",
    };
    const interaction: InteractionView = {
      id: `${id}_recovery`, taskId: id, kind: "error_recovery", title: "Choose a recovery path",
      body: "Retry with corrected context or cancel without any side effect.", fields: [],
      options: [{ value: "retry", label: "Retry", description: "Return to context collection." }],
      actions: [{ action: "edit", label: "Edit context", emphasis: "primary" }, { action: "cancel", label: "Cancel", emphasis: "secondary" }],
      riskLevel: "none", expiresAt: null, statusLabel: "failed",
    };
    return this.baseTask(id, intent, "failed", "Failed", "The task needs recovery.", [interaction], result, []);
  }

  private cancelledTask(task: WorkspaceTaskView, reason: string): WorkspaceTaskView {
    const result: ResultView = {
      status: "cancelled", resultType: "customer_support_reply", title: "Task cancelled", summary: reason,
      businessObjects: [], nextActions: ["Submit a new task when ready."], failureReason: null,
    };
    return this.baseTask(task.id, task.userIntent, "cancelled", "Cancelled", reason, [], result, task.facts);
  }

  private baseTask(
    id: string, intent: string, status: WorkspaceTaskView["status"], statusLabel: string,
    progressSummary: string, interactions: InteractionView[], result: ResultView | null,
    facts: WorkspaceTaskView["facts"],
  ): WorkspaceTaskView {
    const terminal = status === "completed" || status === "cancelled";
    return {
      id, title: "Customer complaint reply and follow-up", userIntent: intent, status, statusLabel,
      progressSummary,
      progress: {
        summary: progressSummary,
        currentStep: terminal ? null : status === "failed" ? "Waiting for recovery" : status === "needs_approval" ? "Waiting for approval" : "Collecting context",
        completedSteps: status === "completed" ? 4 : status === "needs_approval" ? 2 : status === "needs_context" ? 1 : 0,
        totalSteps: 4, updatedAt: now(),
        items: [
          { id: `${id}_understood`, label: "Task understood", description: "The customer-support intent was normalized.", status: "completed", timestamp: now() },
          { id: `${id}_current`, label: progressSummary, description: "Deterministic Phase 2 mock state.", status: status === "failed" ? "failed" : terminal ? "completed" : "running", timestamp: now() },
        ],
      },
      interactions, result,
      understanding: ["The customer needs an empathetic response.", "Shipping facts must be verified before promising an outcome.", "No external action is allowed in Phase 2."],
      facts, updatedAt: now(),
    };
  }

  private requireTask(taskId: string): WorkspaceTaskView {
    if (!this.task || this.task.id !== taskId) throw this.error("task_not_found", "Task was not found.");
    return this.task;
  }

  private assertWorkspace(workspaceId: string) {
    if (workspaceId !== this.workspaceId) throw this.error("workspace_not_found", "Workspace was not found.");
  }

  private toHistory(task: WorkspaceTaskView): HistoryTaskView {
    return { id: task.id, title: task.title, status: task.status, summary: task.progressSummary, updatedAt: task.updatedAt, resultStatus: task.result?.status ?? null };
  }

  private error(code: string, message: string) {
    return new WorkspaceRepositoryError(message, code.endsWith("not_found") ? 404 : 409, code, false);
  }
}
