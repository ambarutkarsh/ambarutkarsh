"""Sending over SMTP and reading replies over IMAP (Gmail with an App Password by default)."""

from __future__ import annotations

import email
import imaplib
import re
import smtplib
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr, make_msgid, parseaddr


class MailError(Exception):
    pass


class Mailbox:
    def __init__(self, user: str, password: str, smtp_host: str = "smtp.gmail.com", smtp_port: int = 587,
                 imap_host: str = "imap.gmail.com", imap_port: int = 993):
        self.user, self.password = user, password
        self.smtp_host, self.smtp_port = smtp_host, smtp_port
        self.imap_host, self.imap_port = imap_host, imap_port

    @classmethod
    def from_env(cls, slug: str, env: dict[str, str]) -> "Mailbox | None":
        def get(key: str, default: str = "") -> str:
            return env.get(f"{slug.upper()}_{key}") or env.get(key) or default

        user, password = get("SMTP_USER"), get("SMTP_PASSWORD")
        if not user or not password:
            return None
        return cls(user, password, get("SMTP_HOST", "smtp.gmail.com"), int(get("SMTP_PORT", "587")),
                   get("IMAP_HOST", "imap.gmail.com"), int(get("IMAP_PORT", "993")))

    def send(self, from_name: str, from_email: str, to: str, subject: str, body: str,
             in_reply_to: str = "", references: str = "") -> str:
        msg = EmailMessage()
        msg["From"] = formataddr((from_name, from_email))
        msg["To"] = to
        msg["Subject"] = subject
        msg["Message-ID"] = make_msgid(domain=from_email.partition("@")[2] or None)
        if in_reply_to:
            msg["In-Reply-To"] = in_reply_to
            msg["References"] = (references + " " + in_reply_to).strip()
        msg["List-Unsubscribe"] = f"<mailto:{from_email}?subject=unsubscribe>"
        msg.set_content(body)
        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=60) as s:
                s.starttls()
                s.login(self.user, self.password)
                s.send_message(msg)
        except (smtplib.SMTPException, OSError) as e:
            raise MailError(str(e)) from e
        return msg["Message-ID"]

    def fetch_recent(self, days: int = 14) -> list[dict]:
        """Inbox messages from the last `days` days, newest last."""
        since = (datetime.now() - timedelta(days=days)).strftime("%d-%b-%Y")
        out = []
        try:
            with imaplib.IMAP4_SSL(self.imap_host, self.imap_port) as m:
                m.login(self.user, self.password)
                m.select("INBOX", readonly=True)
                _, data = m.search(None, "SINCE", since)
                for num in (data[0] or b"").split():
                    _, parts = m.fetch(num, "(BODY.PEEK[])")
                    raw = next((p[1] for p in parts if isinstance(p, tuple)), None)
                    if raw:
                        out.append(parse_message(raw))
        except (imaplib.IMAP4.error, OSError) as e:
            raise MailError(str(e)) from e
        return out


def parse_message(raw: bytes) -> dict:
    msg = email.message_from_bytes(raw)
    return {
        "from_email": parseaddr(msg.get("From", ""))[1].lower(),
        "from_raw": msg.get("From", ""),
        "subject": str(email.header.make_header(email.header.decode_header(msg.get("Subject", "")))),
        "message_id": (msg.get("Message-ID") or "").strip(),
        "in_reply_to": (msg.get("In-Reply-To") or "").strip(),
        "body": strip_quoted(_text_body(msg)),
        "full_body": _text_body(msg),
    }


def _text_body(msg) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain" and not part.get_filename():
                return _decode(part)
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                return re.sub(r"<[^>]+>", " ", _decode(part))
        return ""
    text = _decode(msg)
    return re.sub(r"<[^>]+>", " ", text) if msg.get_content_type() == "text/html" else text


def _decode(part) -> str:
    payload = part.get_payload(decode=True) or b""
    return payload.decode(part.get_content_charset() or "utf-8", errors="replace")


def strip_quoted(text: str) -> str:
    """Drop the quoted earlier thread so Claude reads only what they just wrote."""
    lines = []
    for line in text.splitlines():
        if line.startswith(">") or re.match(r"^On .+wrote:\s*$", line) or line.strip() == "-----Original Message-----":
            break
        lines.append(line)
    return "\n".join(lines).strip()
