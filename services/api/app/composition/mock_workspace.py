from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.mock import workspace_api
from app.mock.workspace_runtime import MockRuntimeError


def compose_mock_workspace(app: FastAPI) -> None:
    app.include_router(workspace_api.router)

    @app.exception_handler(MockRuntimeError)
    async def mock_runtime_error(_request: Request, exc: MockRuntimeError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.code, "message": exc.message, "retryable": False, "details": None},
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_error(request: Request, exc: RequestValidationError):
        if request.url.path.startswith("/api/"):
            return JSONResponse(
                status_code=422,
                content={
                    "code": "invalid_request", "message": "The Workspace request is invalid.",
                    "retryable": False, "details": {"errors": jsonable_encoder(exc.errors())},
                },
            )
        return JSONResponse(status_code=422, content={"detail": jsonable_encoder(exc.errors())})

    @app.exception_handler(HTTPException)
    async def workspace_http_error(request: Request, exc: HTTPException):
        if request.url.path.startswith("/api/"):
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "code": "unauthorized" if exc.status_code == 401 else "workspace_http_error",
                    "message": str(exc.detail), "retryable": False, "details": None,
                },
                headers=exc.headers,
            )
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail}, headers=exc.headers)
