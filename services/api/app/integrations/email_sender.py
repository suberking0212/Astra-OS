import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

from app.core.config import settings


class EmailSender:
    def __init__(self):
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        self.from_email = settings.smtp_from_email or settings.smtp_username
        self.from_name = settings.smtp_from_name
        self.use_ssl = settings.smtp_use_ssl
        self.use_starttls = settings.smtp_use_starttls

    def send_verification_code(self, to_email: str, code: str) -> None:
        if not self.username or not self.password or not self.from_email:
            raise RuntimeError("SMTP sender is not configured.")

        message = EmailMessage()
        message["Subject"] = "AstraOS verification code"
        message["From"] = self.from_email
        message["To"] = to_email
        message["Date"] = formatdate(localtime=True)
        message["Message-ID"] = make_msgid(domain="qq.com")
        message.set_content(
            "\n".join(
                [
                    "Your AstraOS verification code is:",
                    "",
                    f"{code} ",
                    "",
                    f"This code expires in {settings.email_verification_code_ttl_minutes} minutes.",
                    "If you did not request this code, you can ignore this email.",
                ]
            )
        )

        if self.use_ssl:
            with smtplib.SMTP_SSL(self.host, self.port, timeout=20) as server:
                server.login(self.username, self.password)
                refused = server.send_message(message)
                if refused:
                    raise RuntimeError(f"SMTP refused recipients: {', '.join(refused)}")
            return

        with smtplib.SMTP(self.host, self.port, timeout=20) as server:
            if self.use_starttls:
                server.starttls()
            server.login(self.username, self.password)
            refused = server.send_message(message)
            if refused:
                raise RuntimeError(f"SMTP refused recipients: {', '.join(refused)}")
