from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Project, User
from app.modules.projects.schemas import ProjectCreate


class ProjectService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_project(self, payload: ProjectCreate, owner: User) -> Project:
        project = Project(
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            owner_user_id=owner.id,
        )
        self.session.add(project)
        await self.session.commit()
        await self.session.refresh(project)
        return project

    async def list_projects(self, owner: User) -> list[Project]:
        result = await self.session.execute(
            select(Project)
            .where(Project.owner_user_id == owner.id)
            .order_by(Project.updated_at.desc(), Project.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_project(self, project_id: UUID, owner: User) -> Project | None:
        result = await self.session.execute(
            select(Project).where(Project.id == project_id, Project.owner_user_id == owner.id)
        )
        return result.scalar_one_or_none()
