import secrets
import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import EmailVerificationCode, User
from app.integrations.email_sender import EmailSender

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def register(self, email: str, password: str) -> User:
        user = User(email=email.lower(), hashed_password=hash_password(password))
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self.get_user_by_email(email)
        if user is None:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def issue_token(user: User) -> str:
        return create_access_token(user.id)


class EmailVerificationService:
    purpose = "register"

    def __init__(self, session: AsyncSession, email_sender: EmailSender | None = None):
        self.session = session
        self.email_sender = email_sender or EmailSender()

    async def send_code(self, email: str) -> str | None:
        normalized_email = email.lower()
        if not settings.email_verification_enabled:
            return None

        latest_code = await self._get_latest_code(normalized_email)
        if latest_code is not None:
            elapsed = datetime.now(UTC) - latest_code.created_at
            if elapsed.total_seconds() < settings.email_verification_resend_cooldown_seconds:
                remaining = settings.email_verification_resend_cooldown_seconds - int(elapsed.total_seconds())
                raise ValueError(f"Please wait {remaining} seconds before requesting another code.")

        code = self._generate_code()
        verification_code = EmailVerificationCode(
            email=normalized_email,
            code_hash=hash_password(code),
            purpose=self.purpose,
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.email_verification_code_ttl_minutes),
            attempt_count=0,
        )
        self.session.add(verification_code)
        await self.session.commit()
        if settings.email_verification_log_code:
            logger.warning("Email verification code for %s: %s", normalized_email, code)
        self.email_sender.send_verification_code(normalized_email, code)
        return code if settings.email_verification_log_code else None

    async def verify_code(self, email: str, code: str) -> User:
        normalized_email = email.lower()
        user = await AuthService(self.session).get_user_by_email(normalized_email)
        if user is None:
            raise ValueError("Verification code is invalid or expired.")
        if user.email_verified:
            return user

        verification_code = await self._get_latest_code(normalized_email)
        now = datetime.now(UTC)
        if (
            verification_code is None
            or verification_code.consumed_at is not None
            or verification_code.expires_at < now
        ):
            raise ValueError("Verification code is invalid or expired.")

        if verification_code.attempt_count >= settings.email_verification_max_attempts:
            raise ValueError("Verification code has too many failed attempts. Please request a new code.")

        verification_code.attempt_count += 1
        if not verify_password(code.strip(), verification_code.code_hash):
            await self.session.commit()
            raise ValueError("Verification code is invalid or expired.")

        verification_code.consumed_at = now
        user.email_verified = True
        user.email_verified_at = now
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def _get_latest_code(self, email: str) -> EmailVerificationCode | None:
        result = await self.session.execute(
            select(EmailVerificationCode)
            .where(
                EmailVerificationCode.email == email,
                EmailVerificationCode.purpose == self.purpose,
            )
            .order_by(EmailVerificationCode.created_at.desc())
        )
        return result.scalars().first()

    @staticmethod
    def _generate_code() -> str:
        digits = settings.email_verification_code_length
        lower = 10 ** (digits - 1)
        upper = (10**digits) - 1
        return str(secrets.randbelow(upper - lower + 1) + lower)
