from copy import deepcopy
from datetime import UTC, datetime
from uuid import uuid4

from app.modules.workspace.runtime_dto import MockInteraction, MockResult, MockTask


class MockRuntimeError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 409):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


class IsolatedMockWorkspaceRuntime:
    """In-memory product-loop simulator. It has no DB, Executor, Tool, network, or side effect."""

    def __init__(self) -> None:
        self._tasks: dict[tuple[str, str], MockTask] = {}
        self._history: dict[tuple[str, str], list[MockTask]] = {}

    def reset(self) -> None:
        self._tasks.clear()
        self._history.clear()

    def get_surface_state(self, owner_id: str, workspace_id: str) -> tuple[MockTask | None, list[MockTask]]:
        key = (owner_id, workspace_id)
        return deepcopy(self._tasks.get(key)), deepcopy(self._history.get(key, []))

    def submit(self, owner_id: str, workspace_id: str, intent: str, references: list[str]) -> MockTask:
        key = (owner_id, workspace_id)
        if current := self._tasks.get(key):
            self._history.setdefault(key, []).insert(0, deepcopy(current))
        task_id = str(uuid4())
        task = self._failed_task(task_id, workspace_id, intent) if self._should_fail(intent) else self._context_task(task_id, workspace_id, intent, references)
        self._tasks[key] = task
        return deepcopy(task)

    def get_task(self, owner_id: str, task_id: str) -> MockTask:
        _, task = self._find(owner_id, task_id)
        return deepcopy(task)

    def respond(self, owner_id: str, task_id: str, interaction_id: str, action: str, data: dict) -> MockTask:
        key, task = self._find(owner_id, task_id)
        interaction = next((item for item in task.interactions if item.id == interaction_id), None)
        if not interaction:
            raise MockRuntimeError("interaction_not_found", "Interaction is not pending.", 404)
        if action == "cancel":
            updated = self._cancelled(task, "The task was cancelled before any external action occurred.")
        elif interaction.kind == "input" and action == "submit":
            for field in interaction.schema["fields"]:
                if field["required"] and not str(data.get(field["key"], "")).strip():
                    raise MockRuntimeError("invalid_interaction_response", f'{field["label"]} is required.', 422)
            updated = self._approval(task, data)
        elif interaction.kind == "approval" and action == "approve":
            updated = self._completed(task)
        elif interaction.kind == "approval" and action == "reject":
            updated = self._cancelled(task, "The proposed follow-up was rejected. No side effect occurred.")
        elif interaction.kind == "error_recovery" and action == "edit":
            updated = self._context_task(task.id, task.workspace_id, task.intent, [])
        else:
            raise MockRuntimeError("invalid_interaction_action", "This action is not valid for the pending interaction.")
        self._tasks[key] = updated
        return deepcopy(updated)

    def retry(self, owner_id: str, task_id: str) -> MockTask:
        key, task = self._find(owner_id, task_id)
        if task.status != "failed":
            raise MockRuntimeError("task_not_retryable", "Only failed tasks can be retried.")
        updated = self._context_task(task.id, task.workspace_id, task.intent, [])
        self._tasks[key] = updated
        return deepcopy(updated)

    def cancel(self, owner_id: str, task_id: str) -> MockTask:
        key, task = self._find(owner_id, task_id)
        if task.status in {"completed", "cancelled"}:
            raise MockRuntimeError("task_not_cancellable", "Completed or cancelled tasks cannot be cancelled.")
        updated = self._cancelled(task, "The task was cancelled before any external action occurred.")
        self._tasks[key] = updated
        return deepcopy(updated)

    def _find(self, owner_id: str, task_id: str) -> tuple[tuple[str, str], MockTask]:
        for key, task in self._tasks.items():
            if key[0] == owner_id and task.id == task_id:
                return key, task
        raise MockRuntimeError("task_not_found", "Task was not found.", 404)

    def _context_task(self, task_id: str, workspace_id: str, intent: str, references: list[str]) -> MockTask:
        timestamp = self._now()
        facts = {"References": ", ".join(references)} if references else {}
        return MockTask(
            id=task_id, workspace_id=workspace_id, intent=intent, status="needs_context",
            created_at=timestamp, updated_at=timestamp, facts=facts,
            interactions=[MockInteraction(
                id=f"{task_id}_context", kind="input", reason_code="needs_customer_context",
                schema={"fields": [
                    {"key": "customer_email", "label": "Customer email", "type": "text", "required": True, "placeholder": "alex@example.com"},
                    {"key": "order_number", "label": "Order number", "type": "text", "required": True, "placeholder": "ACME-10492"},
                    {"key": "preferred_tone", "label": "Preferred tone", "type": "text", "required": False, "placeholder": "Calm and apologetic"},
                ]}, actions=["submit", "cancel"],
            )],
        )

    def _approval(self, task: MockTask, data: dict) -> MockTask:
        updated = deepcopy(task)
        updated.status = "needs_approval"
        updated.updated_at = self._now()
        updated.facts.update({
            "Customer email": str(data["customer_email"]), "Order number": str(data["order_number"]),
            "Preferred tone": str(data.get("preferred_tone") or "Calm and apologetic"),
        })
        updated.interactions = [MockInteraction(
            id=f"{task.id}_approval", kind="approval", reason_code="approve_mock_follow_up",
            actions=["approve", "reject"], risk_level="medium",
        )]
        return updated

    def _completed(self, task: MockTask) -> MockTask:
        updated = deepcopy(task)
        updated.status = "completed"
        updated.updated_at = self._now()
        updated.interactions = []
        email = updated.facts.get("Customer email", "the customer")
        updated.result = MockResult(status="succeeded", summary="A customer-facing draft and mock follow-up are ready. No external action was performed.", objects=[
            {"type": "reply_draft", "id": f"{task.id}_reply", "label": "Customer reply draft", "value": "I’m sorry your device has not arrived. We are checking the order and will share a verified update as soon as possible."},
            {"type": "mock_follow_up", "id": f"{task.id}_followup", "label": "Mock follow-up", "value": f"Prepared locally for {email}; not written to any real system."},
        ])
        return updated

    def _failed_task(self, task_id: str, workspace_id: str, intent: str) -> MockTask:
        timestamp = self._now()
        return MockTask(
            id=task_id, workspace_id=workspace_id, intent=intent, status="failed", created_at=timestamp, updated_at=timestamp,
            interactions=[MockInteraction(
                id=f"{task_id}_recovery", kind="error_recovery", reason_code="recover_missing_message",
                payload={"options": [{"value": "retry", "label": "Retry", "description": "Return to context collection."}]},
                actions=["edit", "cancel"],
            )],
            result=MockResult(status="failed", summary="The isolated scenario simulated a missing customer message.", failure_reason="The customer message was missing from the mock scenario."),
        )

    def _cancelled(self, task: MockTask, reason: str) -> MockTask:
        updated = deepcopy(task)
        updated.status = "cancelled"
        updated.updated_at = self._now()
        updated.interactions = []
        updated.result = MockResult(status="cancelled", summary=reason)
        return updated

    @staticmethod
    def _should_fail(intent: str) -> bool:
        lowered = intent.lower()
        return "simulate failure" in lowered or "missing message" in lowered or "失败" in intent

    @staticmethod
    def _now() -> str:
        return datetime.now(UTC).isoformat()


mock_workspace_runtime = IsolatedMockWorkspaceRuntime()
