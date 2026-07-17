from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.db.models import User
from app.mock.workspace_runtime import mock_workspace_runtime
from app.modules.workspace.projector import WorkspacePresentationProjector
from app.modules.workspace.schemas import (
    InteractionResponseRequest, ResultView, SubmitTaskRequest, WorkspaceTaskSurfaceView,
    WorkspaceApiErrorEnvelope, WorkspaceTaskView,
)

router = APIRouter(prefix="/api", tags=["workspace-presentation-v1"])
projector = WorkspacePresentationProjector()
ERROR_RESPONSES = {
    404: {"model": WorkspaceApiErrorEnvelope, "description": "Workspace task resource not found"},
    409: {"model": WorkspaceApiErrorEnvelope, "description": "Task state conflict"},
    422: {"model": WorkspaceApiErrorEnvelope, "description": "Invalid Workspace request"},
}


@router.get("/workspaces/{workspace_id}/task-view", response_model=WorkspaceTaskSurfaceView, response_model_by_alias=True, responses=ERROR_RESPONSES)
async def get_workspace_task_view(workspace_id: str, user: User = Depends(get_current_user)):
    task, history = mock_workspace_runtime.get_surface_state(str(user.id), workspace_id)
    return projector.surface(workspace_id, task, history)


@router.post("/workspaces/{workspace_id}/tasks", response_model=WorkspaceTaskView, response_model_by_alias=True, responses=ERROR_RESPONSES)
async def submit_task(request: SubmitTaskRequest, workspace_id: str, user: User = Depends(get_current_user)):
    task = mock_workspace_runtime.submit(str(user.id), workspace_id, request.intent, [item.name for item in request.references])
    return projector.task(task)


@router.post("/tasks/{task_id}/interactions/{interaction_id}/responses", response_model=WorkspaceTaskView, response_model_by_alias=True, responses=ERROR_RESPONSES)
async def submit_interaction_response(request: InteractionResponseRequest, task_id: str, interaction_id: str, user: User = Depends(get_current_user)):
    return projector.task(mock_workspace_runtime.respond(str(user.id), task_id, interaction_id, request.action, request.data))


@router.post("/tasks/{task_id}/commands/retry", response_model=WorkspaceTaskView, response_model_by_alias=True, responses=ERROR_RESPONSES)
async def retry_task(task_id: str, user: User = Depends(get_current_user)):
    return projector.task(mock_workspace_runtime.retry(str(user.id), task_id))


@router.post("/tasks/{task_id}/commands/cancel", response_model=WorkspaceTaskView, response_model_by_alias=True, responses=ERROR_RESPONSES)
async def cancel_task(task_id: str, user: User = Depends(get_current_user)):
    return projector.task(mock_workspace_runtime.cancel(str(user.id), task_id))


@router.get("/tasks/{task_id}", response_model=WorkspaceTaskView, response_model_by_alias=True, responses=ERROR_RESPONSES)
async def get_task(task_id: str, user: User = Depends(get_current_user)):
    return projector.task(mock_workspace_runtime.get_task(str(user.id), task_id))


@router.get("/tasks/{task_id}/result", response_model=ResultView | None, response_model_by_alias=True, responses=ERROR_RESPONSES)
async def get_task_result(task_id: str, user: User = Depends(get_current_user)):
    return projector.task(mock_workspace_runtime.get_task(str(user.id), task_id)).result
