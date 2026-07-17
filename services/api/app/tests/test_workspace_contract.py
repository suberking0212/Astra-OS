import json
import os
from pathlib import Path
import subprocess
import sys

from app.main import app
from app.modules.workspace.projector import WorkspacePresentationProjector
from app.modules.workspace.runtime_dto import MockResult, MockTask

async def auth_headers(client):
    await client.post("/auth/register", json={"email": "workspace@example.com", "password": "Password123!"})
    response = await client.post("/auth/login", json={"email": "workspace@example.com", "password": "Password123!"})
    return {"Authorization": f'Bearer {response.json()["access_token"]}'}


async def submit(client, headers, intent="Draft a reply for a missing delivery"):
    return await client.post(
        "/api/workspaces/default/tasks",
        headers=headers,
        json={"intent": intent, "references": [{"name": "complaint.txt", "mediaType": "text/plain"}]},
    )


async def test_mock_api_completes_customer_support_loop(client):
    headers = await auth_headers(client)
    initial = await client.get("/api/workspaces/default/task-view", headers=headers)
    assert initial.status_code == 200
    assert initial.json()["contractVersion"] == "workspace-presentation-v1"
    assert initial.json()["task"] is None

    submitted = await submit(client, headers)
    assert submitted.status_code == 200
    task = submitted.json()
    assert task["status"] == "needs_context"
    assert task["facts"] == [{"label": "References", "value": "complaint.txt"}]

    context = task["interactions"][0]
    approved_context = await client.post(
        f'/api/tasks/{task["id"]}/interactions/{context["id"]}/responses',
        headers=headers,
        json={"action": "submit", "data": {"customer_email": "alex@example.com", "order_number": "ACME-10492"}},
    )
    task = approved_context.json()
    assert task["status"] == "needs_approval"

    approval = task["interactions"][0]
    completed = await client.post(
        f'/api/tasks/{task["id"]}/interactions/{approval["id"]}/responses',
        headers=headers,
        json={"action": "approve", "data": {}},
    )
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"
    assert completed.json()["result"]["status"] == "succeeded"
    assert "not written to any real system" in completed.json()["result"]["businessObjects"][1]["value"]

    result = await client.get(f'/api/tasks/{task["id"]}/result', headers=headers)
    assert result.json()["status"] == "succeeded"


async def test_mock_api_reject_and_cancel_are_side_effect_free(client):
    headers = await auth_headers(client)
    task = (await submit(client, headers)).json()
    interaction = task["interactions"][0]
    task = (await client.post(
        f'/api/tasks/{task["id"]}/interactions/{interaction["id"]}/responses', headers=headers,
        json={"action": "submit", "data": {"customer_email": "a@example.com", "order_number": "A-1"}},
    )).json()
    approval = task["interactions"][0]
    rejected = await client.post(
        f'/api/tasks/{task["id"]}/interactions/{approval["id"]}/responses', headers=headers,
        json={"action": "reject", "data": {}},
    )
    assert rejected.json()["status"] == "cancelled"
    assert rejected.json()["result"]["status"] == "cancelled"

    task = (await submit(client, headers, "Another support task")).json()
    cancelled = await client.post(f'/api/tasks/{task["id"]}/commands/cancel', headers=headers)
    assert cancelled.json()["status"] == "cancelled"


async def test_mock_api_failure_retry_and_recovery(client):
    headers = await auth_headers(client)
    task = (await submit(client, headers, "Simulate failure for recovery")).json()
    assert task["status"] == "failed"
    assert task["interactions"][0]["kind"] == "error_recovery"

    retried = await client.post(f'/api/tasks/{task["id"]}/commands/retry', headers=headers)
    assert retried.status_code == 200
    assert retried.json()["status"] == "needs_context"


async def test_mock_api_returns_stable_error_envelope(client):
    headers = await auth_headers(client)
    response = await client.post("/api/tasks/missing/commands/retry", headers=headers)
    assert response.status_code == 404
    assert response.json() == {
        "code": "task_not_found", "message": "Task was not found.",
        "retryable": False, "details": None,
    }
    invalid = await client.post(
        "/api/workspaces/default/tasks", headers=headers,
        json={"intent": "", "references": []},
    )
    assert invalid.status_code == 422
    assert invalid.json()["code"] == "invalid_request"
    assert invalid.json()["retryable"] is False


def test_projector_maps_terminal_states_without_runtime_dto_leakage():
    projector = WorkspacePresentationProjector()
    for status, result_status in [("completed", "succeeded"), ("failed", "failed"), ("cancelled", "cancelled")]:
        task = MockTask(
            id=f"task-{status}", workspace_id="default", intent="test", status=status,
            created_at="2026-07-17T00:00:00Z", updated_at="2026-07-17T00:00:01Z",
            result=MockResult(status=result_status, summary="summary", failure_reason="reason" if status == "failed" else None),
        )
        payload = projector.task(task).model_dump(by_alias=True)
        assert payload["status"] == status
        assert payload["result"]["status"] == result_status
        assert not {"runtimeInvocation", "toolCall", "workflowRun", "stepRun"}.intersection(payload)


def test_openapi_is_frozen_and_matches_workspace_contract():
    artifact = Path(__file__).resolve().parents[2] / "openapi" / "astraos-v1.json"
    assert json.loads(artifact.read_text(encoding="utf-8")) == app.openapi()
    schemas = app.openapi()["components"]["schemas"]
    assert schemas["WorkspaceTaskSurfaceView"]["properties"]["contractVersion"]["const"] == "workspace-presentation-v1"
    assert set(schemas["WorkspaceTaskView"]["required"]) == {
        "id", "title", "userIntent", "status", "statusLabel", "progressSummary", "progress",
        "interactions", "result", "understanding", "facts", "updatedAt",
    }
    forbidden = {"RuntimeInvocation", "ToolCall", "WorkflowRun", "StepRun", "ExecutorEvent"}
    assert forbidden.isdisjoint(schemas)
    assert set(schemas["WorkspaceApiErrorEnvelope"]["required"]) == {
        "code", "message", "retryable", "details",
    }


def test_mock_workspace_api_is_disabled_by_default():
    environment = os.environ.copy()
    environment["ENABLE_MOCK_WORKSPACE_API"] = "false"
    result = subprocess.run(
        [sys.executable, "-c", "from app.main import app; print('/api/workspaces/{workspace_id}/task-view' in app.openapi()['paths'])"],
        cwd=Path(__file__).resolve().parents[2],
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.stdout.strip() == "False"
