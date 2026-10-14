"""The loop: every cycle, read replies, send what is due, write drafts, and research when the pipeline runs low."""

from __future__ import annotations

import time
import traceback
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from .brain import Brain, BrainError
from .config import Product, load_env
from .db import DB, STOPPED
from .emails import Verifier
from .mailer import Mailbox, MailError
from .replies import process_replies
from .research import research
from .writer import sendable, write_pending

MIN_PIPELINE = 10          # research more once fewer than this many prospects are waiting
MAX_BOUNCE_RATE = 0.05     # pause a product's sending above this, once 20+ emails have gone out


def in_quiet_hours(product: Product, now: datetime) -> bool:
    local = now.astimezone(ZoneInfo(product.timezone)).strftime("%H:%M")
    start, end = product.quiet_hours
    return (start <= local or local < end) if start > end else (start <= local < end)


def local_midnight_utc(product: Product, now: datetime) -> str:
    local = now.astimezone(ZoneInfo(product.timezone))
    midnight = local.replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight.astimezone(timezone.utc).isoformat(timespec="seconds")


def bounce_rate(db: DB, product: Product) -> float:
    contacted = db.one("SELECT COUNT(*) c FROM prospects WHERE product=? AND status NOT IN"
                       " ('new','drafted','no_email')", product.slug)["c"]
    bounced = db.one("SELECT COUNT(*) c FROM prospects WHERE product=? AND status='bounced'",
                     product.slug)["c"]
    return bounced / contacted if contacted >= 20 else 0.0


def due_messages(db: DB, product: Product, now: datetime) -> list:
    """Approved messages whose time has come, in send order."""
    due = []
    rows = db.q("SELECT m.*, p.status AS p_status FROM messages m JOIN prospects p ON p.id=m.prospect_id"
                " WHERE m.product=? AND m.direction='out' AND m.status='approved' ORDER BY m.id", product.slug)
    for m in rows:
        if m["step"] == 0:                         # a reply we drafted and you approved
            due.append(m)
            continue
        if m["p_status"] in STOPPED:
            continue
        if m["step"] == 1:
            due.append(m)
            continue
        prev = db.one("SELECT * FROM messages WHERE prospect_id=? AND step=? AND direction='out'",
                      m["prospect_id"], m["step"] - 1)
        if not prev or prev["status"] != "sent":
            continue
        wait = product.follow_up_days[m["step"] - 2] if m["step"] - 2 < len(product.follow_up_days) else 7
        if datetime.fromisoformat(prev["sent_at"]) + timedelta(days=wait) <= now:
            due.append(m)
    return due


def signature(product: Product) -> str:
    title = product.sender.get("title", "")
    return f"\n\n{product.sender_name}\n{title + ', ' if title else ''}{product.name}\n\n--\n{product.footer.strip()}"


def send_due(product: Product, db: DB, mailbox: Mailbox, now: datetime) -> int:
    if problems := product.setup_problems():
        db.log(product.slug, "send_blocked", "; ".join(problems))
        return 0
    if in_quiet_hours(product, now):
        return 0
    if bounce_rate(db, product) > MAX_BOUNCE_RATE:
        db.log(product.slug, "send_paused", "bounce rate above 5%; check your list and verifier")
        return 0
    room = product.daily_limit - db.sent_since(product.slug, local_midnight_utc(product, now))
    sent = 0
    for m in due_messages(db, product, now):
        if sent >= room:
            break
        p = db.prospect(m["prospect_id"])
        if m["step"] > 0 and not sendable(product, p):
            continue
        thread = [x for x in db.thread(p["id"]) if x["message_id"] and x["id"] != m["id"]]
        in_reply_to = m["in_reply_to"] or (thread[-1]["message_id"] if m["step"] > 1 and thread else "")
        references = " ".join(x["message_id"] for x in thread[:-1]) if in_reply_to else ""
        try:
            message_id = mailbox.send(product.sender_name, product.sender_email, p["email"],
                                      m["subject"], m["body"] + signature(product), in_reply_to, references)
        except MailError as e:
            db.update_message(m["id"], status="failed", error=str(e)[:500])
            db.log(product.slug, "send_failed", f"{p['email']}: {e}")
            continue
        db.update_message(m["id"], status="sent", message_id=message_id,
                          sent_at=now.astimezone(timezone.utc).isoformat(timespec="seconds"),
                          in_reply_to=in_reply_to)
        if p["status"] in ("new", "drafted"):
            db.update_prospect(p["id"], status="contacted")
        db.log(product.slug, "sent", f"step {m['step']} to {p['name']} <{p['email']}>")
        sent += 1
    return sent


def cycle(products: list[Product], db: DB, brain: Brain, env: dict, now: datetime | None = None,
          mailboxes: dict | None = None) -> dict:
    """One pass over every product. Returns a summary for printing."""
    now = now or datetime.now(timezone.utc)
    verifier = Verifier(env)
    summary = {}
    mailboxes = mailboxes if mailboxes is not None else {
        p.slug: Mailbox.from_env(p.slug, env) for p in products}

    # Replies first: a reply must stop a follow-up that would otherwise go out this cycle.
    by_user: dict[str, tuple[Mailbox, dict]] = {}
    for p in products:
        if mb := mailboxes.get(p.slug):
            by_user.setdefault(mb.user, (mb, {}))[1][p.slug] = p
    for mb, prods in by_user.values():
        try:
            n = process_replies(prods, db, mb, brain)
            for slug in prods:
                summary.setdefault(slug, {})["replies"] = n
        except (MailError, BrainError) as e:
            db.log("", "replies_failed", str(e))

    for p in products:
        s = summary.setdefault(p.slug, {})
        if mb := mailboxes.get(p.slug):
            s["sent"] = send_due(p, db, mb, now)
        try:
            s["drafted"] = write_pending(p, db, brain, limit=10)
            ok = ("'verified','catch_all'" if p.send_to_catch_all else "'verified'")
            waiting = db.one("SELECT COUNT(*) c FROM prospects WHERE product=? AND status IN ('new','drafted')"
                             f" AND email_status IN ({ok})", p.slug)["c"]
            runs_today = db.events_today(p.slug, "research", local_midnight_utc(p, now))
            if waiting < MIN_PIPELINE and runs_today < int(p.research.get("runs_per_day", 1)):
                s["researched"] = research(p, db, brain, verifier)
                s["drafted"] += write_pending(p, db, brain, limit=10)
        except BrainError as e:
            db.log(p.slug, "brain_failed", str(e))
            s["error"] = str(e)
    return summary


def run_forever(products: list[Product], db: DB, brain: Brain, interval_minutes: int = 15) -> None:
    print(f"Closer is running for: {', '.join(p.name for p in products)}. Ctrl+C to stop.")
    while True:
        env = load_env()
        try:
            summary = cycle(products, db, brain, env)
            stamp = datetime.now().strftime("%H:%M")
            for slug, s in summary.items():
                print(f"[{stamp}] {slug}: " + ", ".join(f"{k} {v}" for k, v in s.items()))
        except Exception:   # keep the loop alive; the error is in the log
            db.log("", "cycle_crashed", traceback.format_exc()[-1500:])
            traceback.print_exc()
        time.sleep(interval_minutes * 60)
