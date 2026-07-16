import asyncio
import os
from urllib.parse import unquote, urlsplit

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, text

os.environ["DATABASE_URL"] = os.environ.get(
    "ASTRAOS_TEST_DATABASE_URL",
    "postgresql+asyncpg://astraos:astraos@localhost:55432/astraos_test",
)


def _parse_database_url(database_url: str) -> tuple[str, int, str, str, str]:
    parsed = urlsplit(database_url.replace("postgresql+asyncpg://", "postgresql://", 1))
    if not parsed.hostname or not parsed.username or not parsed.path:
        raise RuntimeError("Invalid PostgreSQL test DATABASE_URL.")

    database = parsed.path.lstrip("/")
    if not database.endswith("_test"):
        raise RuntimeError(
            "Refusing to run destructive tests against a non-test database. "
            "Use ASTRAOS_TEST_DATABASE_URL with a database name ending in _test."
        )

    return (
        parsed.hostname,
        parsed.port or 5432,
        unquote(parsed.username),
        unquote(parsed.password or ""),
        database,
    )


async def _ensure_test_database() -> None:
    host, port, user, password, database = _parse_database_url(os.environ["DATABASE_URL"])
    connection = await asyncpg.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database="postgres",
    )
    try:
        exists = await connection.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", database)
        if not exists:
            safe_database = database.replace('"', '""')
            await connection.execute(f'CREATE DATABASE "{safe_database}"')
    finally:
        await connection.close()


asyncio.run(_ensure_test_database())

from app.db.models import Base, EmailVerificationCode, User  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
async def prepare_database():
    async with engine.begin() as connection:
        await connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        await connection.execute(text("CREATE SCHEMA public"))
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()
    yield


@pytest.fixture(autouse=True)
async def clean_database():
    async def clean() -> None:
        async with engine.begin() as connection:
            await connection.execute(delete(EmailVerificationCode))
            await connection.execute(delete(User))

    await clean()
    yield
    await clean()
    await engine.dispose()


@pytest.fixture(autouse=True)
def prevent_real_email(monkeypatch):
    sent: list[tuple[str, str]] = []

    def fake_send(self, to_email: str, code: str) -> None:
        sent.append((to_email, code))

    monkeypatch.setattr("app.integrations.email_sender.EmailSender.send_verification_code", fake_send)
    return sent


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client
