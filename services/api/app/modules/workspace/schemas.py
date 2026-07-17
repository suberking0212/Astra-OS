from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ContractModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


WorkspaceTaskStatus = Literal[
    "thinking", "running", "needs_context", "needs_approval", "needs_attention",
    "completed", "failed", "cancelled",
]
InteractionKind = Literal[
    "input", "selection", "confirmation", "approval", "result", "takeover",
    "progress", "error_recovery", "file_request", "authentication",
]
InteractionAction = Literal["submit", "select", "approve", "reject", "edit", "takeover", "cancel"]


class TaskProgressItemView(ContractModel):
    id: str
    label: str
    description: str
    status: Literal["pending", "running", "completed", "failed", "cancelled"]
    timestamp: str | None


class TaskProgressView(ContractModel):
    summary: str
    current_step: str | None
    completed_steps: int
    total_steps: int | None
    updated_at: str
    items: list[TaskProgressItemView]


class InteractionFieldView(ContractModel):
    key: str
    label: str
    type: Literal["text", "textarea", "number", "date", "file"]
    required: bool
    placeholder: str | None
    value: str | None = None


class InteractionOptionView(ContractModel):
    value: str
    label: str
    description: str | None


class InteractionActionView(ContractModel):
    action: InteractionAction
    label: str
    emphasis: Literal["primary", "secondary", "danger"]


class InteractionView(ContractModel):
    id: str
    task_id: str
    kind: InteractionKind
    title: str
    body: str
    fields: list[InteractionFieldView]
    options: list[InteractionOptionView]
    actions: list[InteractionActionView]
    risk_level: Literal["none", "low", "medium", "high"]
    expires_at: str | None
    status_label: str | None = None
    response_summary: str | None = None
    emphasis_note: str | None = None


class BusinessObjectView(ContractModel):
    type: str
    id: str
    label: str
    url: str | None
    value: str | None = None


class ResultView(ContractModel):
    status: Literal["succeeded", "partially_succeeded", "failed", "cancelled"]
    result_type: str
    title: str
    summary: str
    business_objects: list[BusinessObjectView]
    next_actions: list[str]
    failure_reason: str | None


class TaskFactView(ContractModel):
    label: str
    value: str


class WorkspaceTaskView(ContractModel):
    id: str
    title: str
    user_intent: str
    status: WorkspaceTaskStatus
    status_label: str
    progress_summary: str
    progress: TaskProgressView | None
    interactions: list[InteractionView]
    result: ResultView | None
    understanding: list[str]
    facts: list[TaskFactView]
    updated_at: str


class HistoryTaskView(ContractModel):
    id: str
    title: str
    status: WorkspaceTaskStatus
    summary: str
    updated_at: str
    result_status: Literal["succeeded", "partially_succeeded", "failed", "cancelled"] | None


class TaskComposerView(ContractModel):
    current_requirement: str
    placeholder: str
    prefill: str
    suggested_prompts: list[str]
    supports_attachments: bool
    disabled: bool
    disabled_reason: str | None
    submit_label: str
    add_context_label: str


class WorkspaceIdentityView(ContractModel):
    id: str
    name: str


class WorkspaceTaskSurfaceView(ContractModel):
    contract_version: Literal["workspace-presentation-v1"]
    workspace: WorkspaceIdentityView
    status_label: str
    task: WorkspaceTaskView | None
    history: list[HistoryTaskView]
    composer: TaskComposerView


class ReferenceInput(ContractModel):
    name: str = Field(min_length=1, max_length=255)
    media_type: str | None = None


class SubmitTaskRequest(ContractModel):
    intent: str = Field(min_length=1, max_length=4000)
    references: list[ReferenceInput] = Field(default_factory=list, max_length=10)


class InteractionResponseRequest(ContractModel):
    action: InteractionAction
    data: dict[str, Any] = Field(default_factory=dict)


class WorkspaceApiErrorEnvelope(ContractModel):
    code: str
    message: str
    retryable: bool
    details: dict[str, Any] | None
