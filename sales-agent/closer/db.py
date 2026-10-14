"""SQLite storage: prospects, messages (both directions), domain email patterns, activity log."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS prospects (
    id INTEGER PRIMARY KEY,
    product TEXT NOT NULL,
    company TEXT NOT NULL,
    domain TEXT DEFAULT '',
    country TEXT DEFAULT '',
    name TEXT NOT NULL,
    title TEXT DEFAULT '',
    email TEXT DEFAULT '',
    -- unknown | guess | verified | catch_all | invalid
    email_status TEXT DEFAULT 'unknown',
    hook TEXT DEFAULT '',
    source_url TEXT DEFAULT '',
    -- new | drafted | contacted | replied | interested | not_interested
    -- | do_not_contact | bounced | no_email
    status TEXT DEFAULT 'new',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(product, company, name)
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY,
    prospect_id INTEGER NOT NULL REFERENCES prospects(id),
    product TEXT NOT NULL,
    direction TEXT NOT NULL,          -- out | in
    step INTEGER DEFAULT 0,           -- 1..n = sequence email, 0 = reply
    subject TEXT DEFAULT '',
    body TEXT DEFAULT '',
    -- out: draft | approved | sent | rejected | cancelled | failed ; in: received
    status TEXT NOT NULL,
    category TEXT DEFAULT '',         -- inbound: what Claude classified it as
    message_id TEXT DEFAULT '',
    in_reply_to TEXT DEFAULT '',
    error TEXT DEFAULT '',
    sent_at TEXT DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS domain_patterns (
    domain TEXT PRIMARY KEY,
    pattern TEXT NOT NULL,            -- e.g. {first}.{last} ; '*' = catch-all domain
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    product TEXT DEFAULT '',
    kind TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_prospect ON messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
"""

# Prospects in these states are never emailed again.
STOPPED = ("replied", "interested", "not_interested", "do_not_contact", "bounced")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class DB:
    def __init__(self, path: Path | str):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)

    # ---- generic ----
    def q(self, sql: str, *args) -> list[sqlite3.Row]:
        return self.conn.execute(sql, args).fetchall()

    def one(self, sql: str, *args) -> sqlite3.Row | None:
        return self.conn.execute(sql, args).fetchone()

    def run(self, sql: str, *args) -> int:
        cur = self.conn.execute(sql, args)
        self.conn.commit()
        return cur.lastrowid

    def log(self, product: str, kind: str, detail: str = "") -> None:
        self.run("INSERT INTO events(product, kind, detail, created_at) VALUES (?,?,?,?)",
                 product, kind, detail[:2000], now_iso())

    # ---- prospects ----
    def add_prospect(self, product: str, **f) -> int | None:
        """Insert a prospect; returns its id, or None if it already exists."""
        ts = now_iso()
        try:
            return self.run(
                "INSERT INTO prospects(product, company, domain, country, name, title, email,"
                " email_status, hook, source_url, created_at, updated_at)"
                " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                product, f["company"].strip(), f.get("domain", "").strip().lower(),
                f.get("country", ""), f["name"].strip(), f.get("title", ""),
                f.get("email", "").strip().lower(), f.get("email_status", "unknown"),
                f.get("hook", ""), f.get("source_url", ""), ts, ts,
            )
        except sqlite3.IntegrityError:
            return None

    def update_prospect(self, pid: int, **f) -> None:
        cols = ", ".join(f"{k}=?" for k in f)
        self.run(f"UPDATE prospects SET {cols}, updated_at=? WHERE id=?", *f.values(), now_iso(), pid)

    def prospect(self, pid: int) -> sqlite3.Row | None:
        return self.one("SELECT * FROM prospects WHERE id=?", pid)

    def prospect_by_email(self, email: str) -> sqlite3.Row | None:
        return self.one("SELECT * FROM prospects WHERE email=? ORDER BY id DESC", email.lower())

    def known_companies(self, product: str) -> list[str]:
        return [r["company"] for r in self.q(
            "SELECT DISTINCT company FROM prospects WHERE product=? ORDER BY company", product)]

    def email_taken(self, email: str, exclude_id: int) -> bool:
        """Does another prospect (any product) already have this address? Avoids double-mailing a person."""
        return self.one("SELECT 1 FROM prospects WHERE email=? AND id!=?",
                        email.lower(), exclude_id) is not None

    # ---- messages ----
    def add_message(self, prospect_id: int, product: str, direction: str, status: str, **f) -> int:
        return self.run(
            "INSERT INTO messages(prospect_id, product, direction, step, subject, body, status,"
            " category, message_id, in_reply_to, sent_at, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            prospect_id, product, direction, f.get("step", 0), f.get("subject", ""),
            f.get("body", ""), status, f.get("category", ""), f.get("message_id", ""),
            f.get("in_reply_to", ""), f.get("sent_at", ""), now_iso(),
        )

    def update_message(self, mid: int, **f) -> None:
        cols = ", ".join(f"{k}=?" for k in f)
        self.run(f"UPDATE messages SET {cols} WHERE id=?", *f.values(), mid)

    def message(self, mid: int) -> sqlite3.Row | None:
        return self.one("SELECT * FROM messages WHERE id=?", mid)

    def has_message_id(self, message_id: str) -> bool:
        return bool(message_id) and self.one(
            "SELECT 1 FROM messages WHERE message_id=?", message_id) is not None

    def thread(self, prospect_id: int) -> list[sqlite3.Row]:
        return self.q("SELECT * FROM messages WHERE prospect_id=? ORDER BY id", prospect_id)

    def cancel_pending(self, prospect_id: int) -> None:
        self.run("UPDATE messages SET status='cancelled' WHERE prospect_id=? AND direction='out'"
                 " AND step>0 AND status IN ('draft','approved')", prospect_id)

    def sent_since(self, product: str, since_iso: str) -> int:
        return self.one("SELECT COUNT(*) c FROM messages WHERE product=? AND direction='out'"
                        " AND status='sent' AND sent_at>=?", product, since_iso)["c"]

    def counts(self, product: str) -> dict[str, int]:
        rows = self.q("SELECT status, COUNT(*) c FROM prospects WHERE product=? GROUP BY status", product)
        out = {r["status"]: r["c"] for r in rows}
        out["awaiting_approval"] = self.one(
            "SELECT COUNT(*) c FROM messages WHERE product=? AND status='draft'", product)["c"]
        return out

    # ---- domain patterns ----
    def domain_pattern(self, domain: str) -> str | None:
        row = self.one("SELECT pattern FROM domain_patterns WHERE domain=?", domain)
        return row["pattern"] if row else None

    def set_domain_pattern(self, domain: str, pattern: str) -> None:
        self.run("INSERT OR REPLACE INTO domain_patterns(domain, pattern, updated_at) VALUES (?,?,?)",
                 domain, pattern, now_iso())

    def events_today(self, product: str, kind: str, since_iso: str) -> int:
        return self.one("SELECT COUNT(*) c FROM events WHERE product=? AND kind=? AND created_at>=?",
                        product, kind, since_iso)["c"]
