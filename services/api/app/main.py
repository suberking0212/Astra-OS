from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import auth
from app.core.config import settings
from app.db.session import engine


async def check_postgres() -> dict[str, Any]:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover - depends on local infra
        return {"status": "unavailable", "detail": str(exc)}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="AstraOS API",
    version="0.1.0",
    description="AstraOS rebuild baseline API with Auth, Email Verification, and a single Workspace shell.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/health", tags=["system"])
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "astraos-api",
        "dependencies": {
            "postgres": await check_postgres(),
        },
    }
