from app.modules.workspace.runtime_dto import MockInteraction, MockTask
from app.modules.workspace.schemas import (
    BusinessObjectView, HistoryTaskView, InteractionActionView, InteractionFieldView,
    InteractionOptionView, InteractionView, ResultView, TaskComposerView, TaskFactView,
    TaskProgressItemView, TaskProgressView, WorkspaceIdentityView, WorkspaceTaskSurfaceView,
    WorkspaceTaskView,
)


class WorkspacePresentationProjector:
    """The single deterministic mapping from internal task state to public Workspace semantics."""

    STATUS_LABELS = {
        "needs_context": "Needs context", "needs_approval": "Needs approval",
        "completed": "Completed", "failed": "Failed", "cancelled": "Cancelled",
    }

    def task(self, task: MockTask) -> WorkspaceTaskView:
        result = self._result(task) if task.result else None
        completed_steps = {"needs_context": 1, "needs_approval": 2, "completed": 4}.get(task.status, 0)
        current_step = {
            "needs_context": "Collecting customer context", "needs_approval": "Waiting for approval",
            "failed": "Waiting for recovery", "cancelled": None, "completed": None,
        }[task.status]
        progress_summary = {
            "needs_context": "Waiting for customer details.",
            "needs_approval": "Reply drafted; waiting for approval.",
            "completed": "Mock result delivered without external action.",
            "failed": "The task needs a recovery decision.",
            "cancelled": "The task stopped before any external action.",
        }[task.status]
        item_status = "failed" if task.status == "failed" else "completed" if task.status in {"completed", "cancelled"} else "running"
        return WorkspaceTaskView(
            id=task.id, title="Customer complaint reply and follow-up", user_intent=task.intent,
            status=task.status, status_label=self.STATUS_LABELS[task.status], progress_summary=progress_summary,
            progress=TaskProgressView(
                summary=progress_summary, current_step=current_step, completed_steps=completed_steps,
                total_steps=4, updated_at=task.updated_at,
                items=[
                    TaskProgressItemView(id=f"{task.id}_understood", label="Task understood", description="The customer-support intent was normalized.", status="completed", timestamp=task.created_at),
                    TaskProgressItemView(id=f"{task.id}_current", label=progress_summary, description="Deterministic Phase 2 mock state.", status=item_status, timestamp=task.updated_at),
                ],
            ),
            interactions=[self._interaction(task, item) for item in task.interactions], result=result,
            understanding=[
                "The customer needs an empathetic response.",
                "Shipping facts must be verified before promising an outcome.",
                "No external action is allowed in Phase 2.",
            ],
            facts=[TaskFactView(label=label, value=value) for label, value in task.facts.items()],
            updated_at=task.updated_at,
        )

    def surface(self, workspace_id: str, task: MockTask | None, history: list[MockTask]) -> WorkspaceTaskSurfaceView:
        return WorkspaceTaskSurfaceView(
            contract_version="workspace-presentation-v1",
            workspace=WorkspaceIdentityView(id=workspace_id, name="Astra Workspace"),
            status_label="Phase 2 isolated Mock API",
            task=self.task(task) if task else None,
            history=[
                HistoryTaskView(
                    id=item.id, title="Customer complaint reply and follow-up", status=item.status,
                    summary=self.task(item).progress_summary, updated_at=item.updated_at,
                    result_status=item.result.status if item.result else None,
                ) for item in history
            ],
            composer=TaskComposerView(
                current_requirement="Delegate a customer support task through the isolated Phase 2 API.",
                placeholder="Describe the customer issue and desired outcome.", prefill="",
                suggested_prompts=["Draft a missing-delivery reply", "Simulate failure for recovery"],
                supports_attachments=True, disabled=False, disabled_reason=None,
                submit_label="Submit task", add_context_label="Add reference metadata",
            ),
        )

    def _interaction(self, task: MockTask, item: MockInteraction) -> InteractionView:
        fields = [InteractionFieldView(**field) for field in item.schema.get("fields", [])]
        options = [InteractionOptionView(**option) for option in item.payload.get("options", [])]
        action_labels = {
            "submit": ("Continue", "primary"), "approve": ("Approve mock action", "primary"),
            "reject": ("Reject", "danger"), "edit": ("Edit context", "primary"),
            "cancel": ("Cancel task", "secondary"),
        }
        titles = {
            "needs_customer_context": ("Provide customer context", "Add the customer email and order number so AstraOS can prepare a useful response."),
            "approve_mock_follow_up": ("Prepare a support follow-up?", "The mock represents a prepared follow-up without creating any real record or side effect."),
            "recover_missing_message": ("Choose a recovery path", "Retry with corrected context or cancel without any side effect."),
        }
        title, body = titles[item.reason_code]
        return InteractionView(
            id=item.id, task_id=task.id, kind=item.kind, title=title, body=body,
            fields=fields, options=options,
            actions=[InteractionActionView(action=action, label=action_labels[action][0], emphasis=action_labels[action][1]) for action in item.actions],
            risk_level=item.risk_level, expires_at=None, status_label=task.status,
            emphasis_note="Phase 2 approval validates product semantics only; Governance is not connected." if item.kind == "approval" else None,
        )

    def _result(self, task: MockTask) -> ResultView:
        assert task.result
        titles = {"succeeded": "Customer reply and follow-up ready", "failed": "Reply could not be prepared", "cancelled": "Task cancelled"}
        return ResultView(
            status=task.result.status, result_type="customer_support_reply", title=titles[task.result.status],
            summary=task.result.summary,
            business_objects=[BusinessObjectView(type=obj["type"], id=obj["id"], label=obj["label"], url=None, value=obj["value"]) for obj in task.result.objects],
            next_actions={
                "succeeded": ["Review the reply draft.", "Connect a governed write path in Phase 4 before any real follow-up."],
                "failed": ["Retry and provide the missing context.", "Cancel the task."],
                "cancelled": ["Submit a new task when ready."],
            }[task.result.status],
            failure_reason=task.result.failure_reason,
        )
