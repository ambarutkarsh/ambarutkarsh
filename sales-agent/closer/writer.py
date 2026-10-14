"""Writes a personalised email sequence (first email + follow-ups) for each new prospect."""

from __future__ import annotations

from .brain import Brain, BrainError
from .config import Product, playbook
from .db import DB

WRITE_PROMPT = """{brief}

---
{rules}

---
PROSPECT
Name: {name}
Title: {title}
Organisation: {company} ({country})
What we know about them: {hook}

TASK: Write a {n}-email sequence to this prospect: one first email and {f} follow-up(s)
(follow-ups are sent {days} days after the first, in the same thread, only if there is no reply).
Do NOT include a signature, sign-off name or unsubscribe line; they are added automatically.

Return JSON: {{"emails": [{{"subject": "...", "body": "..."}}, ...]}}
Follow-ups reuse the first subject (they are sent as replies), so give them subject "".
"""


def sendable(product: Product, prospect) -> bool:
    return prospect["email_status"] == "verified" or (
        product.send_to_catch_all and prospect["email_status"] == "catch_all")


def write_sequence(product: Product, brain: Brain, prospect) -> list[dict]:
    days = product.follow_up_days
    data = brain.ask_json(WRITE_PROMPT.format(
        brief=product.brief(), rules=playbook("writing_rules"), name=prospect["name"],
        title=prospect["title"], company=prospect["company"], country=prospect["country"] or "unknown",
        hook=prospect["hook"] or "nothing specific", n=len(days) + 1, f=len(days),
        days=", ".join(map(str, days)),
    ))
    emails = data.get("emails") if isinstance(data, dict) else data
    if not isinstance(emails, list) or not emails or not emails[0].get("body"):
        raise BrainError(f"writer returned no usable emails: {str(data)[:200]}")
    return emails[: len(days) + 1]


def write_pending(product: Product, db: DB, brain: Brain, limit: int = 10) -> int:
    rows = db.q("SELECT * FROM prospects WHERE product=? AND status='new' ORDER BY id LIMIT ?",
                product.slug, limit * 3)
    written = 0
    for p in rows:
        if written >= limit:
            break
        if not sendable(product, p):
            continue
        try:
            emails = write_sequence(product, brain, p)
        except BrainError as e:
            db.log(product.slug, "write_failed", f"{p['name']} @ {p['company']}: {e}")
            continue
        subject = emails[0].get("subject") or f"{p['company']}"
        status = "draft" if product.require_approval else "approved"
        for step, e in enumerate(emails, start=1):
            db.add_message(p["id"], product.slug, "out", status, step=step,
                           subject=subject if step == 1 else f"Re: {subject}", body=e["body"].strip())
        db.update_prospect(p["id"], status="drafted")
        db.log(product.slug, "drafted", f"{len(emails)} emails for {p['name']} @ {p['company']}")
        written += 1
    return written
