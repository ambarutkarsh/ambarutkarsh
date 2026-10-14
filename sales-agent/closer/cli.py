"""Command line: `closer <command>`. Run `closer --help` for the list."""

from __future__ import annotations

import argparse
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from .brain import Brain, BrainError
from .config import DATA_DIR, ConfigError, list_products, load_env, resolve_products
from .db import DB
from .emails import Verifier, find_email
from .engine import cycle, run_forever, send_due
from .mailer import Mailbox, MailError
from .replies import process_replies
from .research import import_csv, research
from .writer import write_pending


def _db() -> DB:
    return DB(DATA_DIR / "closer.db")


def _brain(env: dict) -> Brain:
    return Brain(model=env.get("CLAUDE_MODEL", ""))


def cmd_check(args, env, db):
    ok = True
    print("Claude Code CLI:", "found" if shutil.which("claude") else "MISSING (install from claude.com/download)")
    ok &= bool(shutil.which("claude"))
    v = Verifier(env)
    print("Email verifier:", "Reoon" if v.reoon else "ZeroBounce" if v.zerobounce
          else "MISSING (no key: emails stay 'guess' and are never sent)")
    for p in resolve_products(args.product):
        mb = Mailbox.from_env(p.slug, env)
        print(f"\n[{p.slug}] {p.name}")
        print("  mailbox:", mb.user if mb else "MISSING (set SMTP_USER / SMTP_PASSWORD in .env)")
        for problem in p.setup_problems():
            print("  todo:", problem)
        ok &= bool(mb) and not p.setup_problems()
    print("\nReady to send." if ok and v.available else "\nNot ready to send yet; see above.")


def cmd_status(args, env, db):
    for p in resolve_products(args.product):
        c = db.counts(p.slug)
        print(f"{p.name}: " + ", ".join(f"{k} {v}" for k, v in sorted(c.items())))


def cmd_research(args, env, db):
    for p in resolve_products(args.product):
        n = research(p, db, _brain(env), Verifier(env), args.count)
        print(f"{p.name}: {n} new prospects")


def cmd_import(args, env, db):
    [p] = resolve_products(args.product)
    print(f"{import_csv(p, db, Verifier(env), Path(args.csv))} prospects imported")


def cmd_find_emails(args, env, db):
    v = Verifier(env)
    for p in resolve_products(args.product):
        rows = db.q("SELECT * FROM prospects WHERE product=? AND status='new'"
                    " AND email_status IN ('unknown','guess')", p.slug)
        for r in rows:
            email, status = find_email(db, r, v)
            print(f"{r['name']} @ {r['company']}: {email or '-'} ({status})")


def cmd_write(args, env, db):
    for p in resolve_products(args.product):
        print(f"{p.name}: {write_pending(p, db, _brain(env), args.limit)} sequences drafted")


def cmd_outbox(args, env, db):
    rows = db.q("SELECT m.id, m.product, m.step, m.subject, m.body, p.name, p.company, p.email"
                " FROM messages m JOIN prospects p ON p.id=m.prospect_id WHERE m.status='draft'"
                + (" AND m.product=?" if args.product else "") + " ORDER BY m.id",
                *([args.product] if args.product else []))
    for m in rows:
        print(f"\n#{m['id']} [{m['product']}] step {m['step']} to {m['name']} ({m['company']}) <{m['email']}>")
        print(f"Subject: {m['subject']}\n{m['body']}")
    print(f"\n{len(rows)} waiting. Approve with: closer approve <id> (or: closer approve all --product X)")


def cmd_approve(args, env, db):
    if args.id == "all":
        if not args.product:
            sys.exit("Say which product: closer approve all --product retentionos")
        db.run("UPDATE messages SET status='approved' WHERE status='draft' AND product=?", args.product)
        print("Approved all drafts for", args.product)
        return
    db.update_message(int(args.id), status="approved")
    print("Approved", args.id)


def cmd_reject(args, env, db):
    m = db.message(int(args.id))
    if m:
        db.update_message(m["id"], status="rejected")
        if m["step"] == 1:
            db.cancel_pending(m["prospect_id"])
            db.update_prospect(m["prospect_id"], status="not_interested")
    print("Rejected", args.id)


def cmd_send(args, env, db):
    now = datetime.now(timezone.utc)
    for p in resolve_products(args.product):
        mb = Mailbox.from_env(p.slug, env)
        print(f"{p.name}: " + (f"{send_due(p, db, mb, now)} sent" if mb else "no mailbox in .env"))


def cmd_replies(args, env, db):
    products = {p.slug: p for p in resolve_products(args.product)}
    seen = set()
    for p in products.values():
        mb = Mailbox.from_env(p.slug, env)
        if mb and mb.user not in seen:
            seen.add(mb.user)
            print(f"{mb.user}: {process_replies(products, db, mb, _brain(env))} new replies handled")


def cmd_run(args, env, db):
    products = resolve_products(args.product)
    if args.once:
        for slug, s in cycle(products, db, _brain(env), env).items():
            print(f"{slug}: " + ", ".join(f"{k} {v}" for k, v in s.items()))
    else:
        run_forever(products, db, _brain(env), args.interval)


def cmd_dashboard(args, env, db):
    from .dashboard import serve
    serve(db, args.port)


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="closer", description="Cold-email agent for "
                                 + ", ".join(list_products()))
    sub = ap.add_subparsers(dest="cmd", required=True)

    def add(name, fn, help_, product=True, required=False):
        sp = sub.add_parser(name, help=help_)
        if product:
            sp.add_argument("product", nargs=None if required else "?", help="product slug, or 'all'")
        sp.set_defaults(fn=fn)
        return sp

    add("check", cmd_check, "check setup: Claude, mailbox, verifier, TODOs")
    add("status", cmd_status, "pipeline counts")
    add("research", cmd_research, "have Claude find new prospects on the web").add_argument("--count", type=int)
    add("import", cmd_import, "import prospects from a CSV", required=True).add_argument("csv")
    add("find-emails", cmd_find_emails, "find and verify emails for new prospects")
    add("write", cmd_write, "draft sequences for new prospects").add_argument("--limit", type=int, default=10)
    add("outbox", cmd_outbox, "show drafts waiting for approval")
    ap_a = add("approve", cmd_approve, "approve a draft by id, or 'all'", product=False)
    ap_a.add_argument("id")
    ap_a.add_argument("--product")
    add("reject", cmd_reject, "reject a draft by id", product=False).add_argument("id")
    add("send", cmd_send, "send approved emails that are due")
    add("replies", cmd_replies, "read and handle replies")
    sp = add("run", cmd_run, "run the full loop (every 15 minutes)")
    sp.add_argument("--once", action="store_true", help="one cycle, then exit")
    sp.add_argument("--interval", type=int, default=15, help="minutes between cycles")
    add("dashboard", cmd_dashboard, "open the local dashboard", product=False).add_argument(
        "--port", type=int, default=5555)

    args = ap.parse_args(argv)
    if getattr(args, "product", None) == "all":
        args.product = None
    try:
        args.fn(args, load_env(), _db())
    except (ConfigError, BrainError, MailError) as e:
        sys.exit(f"error: {e}")
    except KeyboardInterrupt:
        print()
