export type WorkspaceTaskStatus =
  | "thinking"
  | "running"
  | "needs_context"
  | "needs_approval"
  | "needs_attention"
  | "completed"
  | "failed"
  | "cancelled";

export type InteractionKind =
  | "input"
  | "selection"
  | "confirmation"
  | "approval"
  | "result"
  | "takeover"
  | "progress"
  | "error_recovery"
  | "file_request"
  | "authentication";

export type InteractionAction =
  | "submit"
  | "select"
  | "approve"
  | "reject"
  | "edit"
  | "takeover"
  | "cancel";

export type TaskProgressItemView = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  timestamp: string | null;
};

export type TaskProgressView = {
  summary: string;
  currentStep: string | null;
  completedSteps: number;
  totalSteps: number | null;
  updatedAt: string;
  items: TaskProgressItemView[];
};

export type InteractionFieldView = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "file";
  required: boolean;
  placeholder: string | null;
  value?: string | null;
};

export type InteractionOptionView = {
  value: string;
  label: string;
  description: string | null;
};

export type InteractionActionView = {
  action: InteractionAction;
  label: string;
  emphasis: "primary" | "secondary" | "danger";
};

export type InteractionView = {
  id: string;
  taskId: string;
  kind: InteractionKind;
  title: string;
  body: string;
  fields: InteractionFieldView[];
  options: InteractionOptionView[];
  actions: InteractionActionView[];
  riskLevel: "none" | "low" | "medium" | "high";
  expiresAt: string | null;
  statusLabel?: string;
  responseSummary?: string | null;
  emphasisNote?: string | null;
};

export type BusinessObjectView = {
  type: string;
  id: string;
  label: string;
  url: string | null;
  value?: string;
};

export type ResultView = {
  status: "succeeded" | "partially_succeeded" | "failed" | "cancelled";
  resultType: string;
  title: string;
  summary: string;
  businessObjects: BusinessObjectView[];
  nextActions: string[];
  failureReason: string | null;
};

export type TaskFactView = {
  label: string;
  value: string;
};

export type WorkspaceTaskView = {
  id: string;
  title: string;
  userIntent: string;
  status: WorkspaceTaskStatus;
  statusLabel: string;
  progressSummary: string;
  progress: TaskProgressView | null;
  interactions: InteractionView[];
  result: ResultView | null;
  understanding: string[];
  facts: TaskFactView[];
  updatedAt: string;
};

export type HistoryTaskView = {
  id: string;
  title: string;
  status: WorkspaceTaskStatus;
  summary: string;
  updatedAt: string;
  resultStatus: ResultView["status"] | null;
};

export type TaskComposerView = {
  currentRequirement: string;
  placeholder: string;
  prefill: string;
  suggestedPrompts: string[];
  supportsAttachments: boolean;
  disabled: boolean;
  disabledReason: string | null;
  submitLabel: string;
  addContextLabel: string;
};

export type WorkspaceUnavailableView = {
  title: string;
  description: string;
  note: string;
};

export type WorkspacePreviewStateView = {
  id: string;
  label: string;
  status: WorkspaceTaskStatus;
  summary: string;
};
