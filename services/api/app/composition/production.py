from fastapi import FastAPI

from app.api.routes import auth


def compose_production(app: FastAPI) -> None:
    app.include_router(auth.router)
