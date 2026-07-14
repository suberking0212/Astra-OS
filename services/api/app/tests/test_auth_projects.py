from sqlalchemy import select

from app.db.models import EmailVerificationCode, Project, User
from app.db.session import AsyncSessionLocal


async def register(client, email="owner@example.com", password="Password123!"):
    return await client.post("/auth/register", json={"email": email, "password": password})


async def login(client, email="owner@example.com", password="Password123!"):
    return await client.post("/auth/login", json={"email": email, "password": password})


async def auth_headers(client, email="owner@example.com", password="Password123!"):
    await register(client, email=email, password=password)
    response = await login(client, email=email, password=password)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_auth_register_success(client):
    response = await register(client)

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["email"] == "owner@example.com"
    assert body["user"]["email_verified"] is False
    assert body["user"]["id"]


async def test_auth_duplicate_register_fails(client):
    await register(client)
    response = await register(client)

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


async def test_auth_login_success(client):
    await register(client)
    response = await login(client)

    assert response.status_code == 200
    assert response.json()["access_token"]


async def test_auth_login_wrong_password_fails(client):
    await register(client)
    response = await login(client, password="WrongPassword123!")

    assert response.status_code == 401


async def test_protected_endpoint_without_jwt_fails(client):
    response = await client.get("/auth/me")

    assert response.status_code == 401


async def test_protected_endpoint_with_invalid_jwt_fails(client):
    response = await client.get("/auth/me", headers={"Authorization": "Bearer invalid-token"})

    assert response.status_code == 401


async def test_auth_me_with_valid_jwt_returns_current_user(client):
    headers = await auth_headers(client)
    response = await client.get("/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["email"] == "owner@example.com"
    assert response.json()["email_verified"] is False


async def test_register_sends_email_verification_code(client, prevent_real_email):
    response = await register(client, email="verify@example.com")

    assert response.status_code == 201
    assert prevent_real_email
    assert prevent_real_email[0][0] == "verify@example.com"

    async with AsyncSessionLocal() as session:
      result = await session.execute(
          select(EmailVerificationCode).where(EmailVerificationCode.email == "verify@example.com")
      )
      code = result.scalar_one()
      assert code.code_hash != prevent_real_email[0][1]
      assert code.attempt_count == 0


async def test_verify_email_success(client, prevent_real_email):
    await register(client, email="verify@example.com")
    code = prevent_real_email[0][1]

    response = await client.post(
        "/auth/email/verify",
        json={"email": "verify@example.com", "code": code},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["user"]["email_verified"] is True

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "verify@example.com"))
        user = result.scalar_one()
        assert user.email_verified is True
        assert user.email_verified_at is not None


async def test_verify_email_wrong_code_fails(client, prevent_real_email):
    await register(client, email="verify@example.com")

    response = await client.post(
        "/auth/email/verify",
        json={"email": "verify@example.com", "code": "000000"},
    )

    assert response.status_code == 400

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(EmailVerificationCode).where(EmailVerificationCode.email == "verify@example.com")
        )
        verification_code = result.scalar_one()
        assert verification_code.attempt_count == 1


async def test_resend_email_verification_respects_cooldown(client, prevent_real_email):
    await register(client, email="verify@example.com")

    response = await client.post("/auth/email/resend", json={"email": "verify@example.com"})

    assert response.status_code == 429


async def test_create_project_success_and_owner_persisted(client):
    headers = await auth_headers(client)
    response = await client.post(
        "/projects",
        headers=headers,
        json={"name": "Support Operations", "description": "Customer support workspace"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Support Operations"
    assert body["owner_user_id"]

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Project).where(Project.id == body["id"]))
        project = result.scalar_one()
        assert str(project.owner_user_id) == body["owner_user_id"]


async def test_project_list_only_returns_current_users_projects(client):
    owner_headers = await auth_headers(client, email="owner@example.com")
    other_headers = await auth_headers(client, email="other@example.com")

    await client.post("/projects", headers=owner_headers, json={"name": "Owner Project"})
    await client.post("/projects", headers=other_headers, json={"name": "Other Project"})

    response = await client.get("/projects", headers=owner_headers)

    assert response.status_code == 200
    projects = response.json()
    assert len(projects) == 1
    assert projects[0]["name"] == "Owner Project"


async def test_user_cannot_access_another_users_project(client):
    owner_headers = await auth_headers(client, email="owner@example.com")
    other_headers = await auth_headers(client, email="other@example.com")
    created = await client.post("/projects", headers=owner_headers, json={"name": "Private Project"})
    project_id = created.json()["id"]

    response = await client.get(f"/projects/{project_id}", headers=other_headers)

    assert response.status_code == 404
