from datetime import datetime, timedelta, timezone

import pytest

from closer import engine
from closer.brain import BrainError, extract_json
from closer.config import load_product
from closer.db import DB
from closer.emails import Verifier, candidates, find_email, split_name
from closer.research import _store
from closer.writer import write_pending


class FakeBrain:
    def __init__(self, reply_category="interested"):
        self.calls = []
        self.reply_category = reply_category

    def ask_json(self, prompt, research=False):
        self.calls.append(prompt)
        if research:
            return [{"company": "Acme Health", "domain": "acmehealth.com", "country": "India",
                     "hook": "posted a Head of Retention role", "people": [
                         {"name": "Priya Sharma", "title": "Chief Customer Officer", "source_url": "x"}]}]
        if "NEW REPLY" in prompt:
            return {"category": self.reply_category, "summary": "s", "response": "Happy to talk."}
        return {"emails": [{"subject": "renewals at acme", "body": "Hi Priya"},
                           {"subject": "", "body": "Following up"},
                           {"subject": "", "body": "Last one"}]}


class FakeVerifier(Verifier):
    def __init__(self, good=("priya.sharma@acmehealth.com",)):
        self.reoon, self.zerobounce, self.good, self.checked = "k", "", good, []

    def verify(self, email):
        self.checked.append(email)
        return "verified" if email in self.good else "invalid"


class FakeMailbox:
    user = "me@send.example"

    def __init__(self):
        self.sent, self.inbox = [], []

    def send(self, from_name, from_email, to, subject, body, in_reply_to="", references=""):
        self.sent.append({"to": to, "subject": subject, "body": body, "in_reply_to": in_reply_to})
        return f"<m{len(self.sent)}@send.example>"

    def fetch_recent(self, days=14):
        return self.inbox


@pytest.fixture
def product():
    p = load_product("retentionos")
    p.sender["email"] = "ambar@send.example"
    p.footer = "RetentionOS Ltd, 1 Street, City\nReply unsubscribe to opt out."
    p.sending["quiet_hours"] = {"start": "00:00", "end": "00:00"}
    return p


def test_extract_json_variants():
    assert extract_json('{"a": 1}') == {"a": 1}
    assert extract_json('Sure!\n```json\n[1, 2]\n```') == [1, 2]
    assert extract_json('text before {"a": [1]} after') == {"a": [1]}
    with pytest.raises(BrainError):
        extract_json("no json here")


def test_names_and_candidates():
    assert split_name("Dr. José Álvarez-Ruiz") == ("jose", "alvarezruiz")
    emails = [e for _, e in candidates("Priya Sharma", "acme.com")]
    assert emails[:3] == ["priya.sharma@acme.com", "priya@acme.com", "psharma@acme.com"]


def test_find_email_learns_domain_pattern():
    db, v = DB(":memory:"), FakeVerifier(good=("priya@acme.com", "rahul@acme.com"))
    a = db.add_prospect("x", company="Acme", domain="acme.com", name="Priya Sharma")
    assert find_email(db, db.prospect(a), v) == ("priya@acme.com", "verified")
    b = db.add_prospect("x", company="Acme", domain="acme.com", name="Rahul Mehta")
    v.checked.clear()
    assert find_email(db, db.prospect(b), v) == ("rahul@acme.com", "verified")
    assert v.checked == ["rahul@acme.com"]   # pattern reused: one check, not three


def test_without_verifier_emails_are_guesses_and_never_written(product):
    db = DB(":memory:")
    no_verifier = Verifier({})
    _store(product, db, no_verifier, FakeBrain().ask_json("", research=True))
    assert db.q("SELECT email_status FROM prospects")[0]["email_status"] == "guess"
    assert write_pending(product, db, FakeBrain()) == 0


def test_quiet_hours(product):
    product.sending.update(timezone="Asia/Kolkata", quiet_hours={"start": "20:00", "end": "08:00"})
    ist_23 = datetime(2026, 10, 14, 17, 30, tzinfo=timezone.utc)   # 23:00 IST
    ist_11 = datetime(2026, 10, 14, 5, 30, tzinfo=timezone.utc)    # 11:00 IST
    assert engine.in_quiet_hours(product, ist_23)
    assert not engine.in_quiet_hours(product, ist_11)


def test_full_flow_research_write_approve_send_followup_reply(product):
    db, brain, mb = DB(":memory:"), FakeBrain(), FakeMailbox()
    env = {"REOON_API_KEY": "k"}
    t0 = datetime(2026, 10, 14, 6, 0, tzinfo=timezone.utc)

    # research -> verified email -> drafted sequence, waiting for approval
    _store(product, db, FakeVerifier(), brain.ask_json("", research=True))
    assert write_pending(product, db, brain) == 1
    drafts = db.q("SELECT * FROM messages WHERE status='draft' ORDER BY step")
    assert [d["step"] for d in drafts] == [1, 2, 3]
    assert engine.send_due(product, db, mb, t0) == 0          # nothing approved yet

    db.run("UPDATE messages SET status='approved'")
    assert engine.send_due(product, db, mb, t0) == 1          # only the first email
    assert mb.sent[0]["to"] == "priya.sharma@acmehealth.com"
    assert "unsubscribe" in mb.sent[0]["body"] and "Ambar Utkarsh" in mb.sent[0]["body"]

    assert engine.send_due(product, db, mb, t0 + timedelta(days=2)) == 0
    assert engine.send_due(product, db, mb, t0 + timedelta(days=3, minutes=1)) == 1
    assert mb.sent[1]["subject"].startswith("Re: ") and mb.sent[1]["in_reply_to"] == "<m1@send.example>"

    # they reply: follow-up 3 is cancelled, a response is drafted for approval
    mb.inbox = [{"from_email": "priya.sharma@acmehealth.com", "subject": "Re: renewals at acme",
                 "message_id": "<r1@acme>", "in_reply_to": "<m2@send.example>",
                 "body": "Sounds interesting, tell me more", "full_body": ""}]
    summary = engine.cycle([product], db, brain, env, now=t0 + timedelta(days=4),
                           mailboxes={product.slug: mb})
    assert summary[product.slug]["replies"] == 1
    assert db.prospect(1)["status"] == "interested"
    assert db.one("SELECT status FROM messages WHERE step=3")["status"] == "cancelled"
    reply = db.one("SELECT * FROM messages WHERE step=0 AND direction='out'")
    assert reply["status"] == "draft" and reply["in_reply_to"] == "<r1@acme>"

    # same inbox again: not handled twice
    engine.cycle([product], db, brain, env, now=t0 + timedelta(days=4), mailboxes={product.slug: mb})
    assert db.one("SELECT COUNT(*) c FROM messages WHERE direction='in'")["c"] == 1

    db.update_message(reply["id"], status="approved")
    assert engine.send_due(product, db, mb, t0 + timedelta(days=4)) == 1
    assert mb.sent[-1]["in_reply_to"] == "<r1@acme>"


def test_unsubscribe_stops_everything(product):
    db, mb = DB(":memory:"), FakeMailbox()
    _store(product, db, FakeVerifier(), FakeBrain().ask_json("", research=True))
    write_pending(product, db, FakeBrain())
    db.run("UPDATE messages SET status='approved'")
    t0 = datetime(2026, 10, 14, 6, 0, tzinfo=timezone.utc)
    engine.send_due(product, db, mb, t0)
    mb.inbox = [{"from_email": "priya.sharma@acmehealth.com", "subject": "Re: x", "message_id": "<u@a>",
                 "in_reply_to": "", "body": "unsubscribe", "full_body": ""}]
    engine.cycle([product], db, FakeBrain("unsubscribe"), {}, now=t0, mailboxes={product.slug: mb})
    assert db.prospect(1)["status"] == "do_not_contact"
    assert db.one("SELECT COUNT(*) c FROM messages WHERE direction='out' AND step=0")["c"] == 0
    assert engine.send_due(product, db, mb, t0 + timedelta(days=30)) == 0


def test_placeholder_sender_blocks_sending(product):
    product.sender["email"] = "TODO@your-sending-domain.com"
    db, mb = DB(":memory:"), FakeMailbox()
    _store(product, db, FakeVerifier(), FakeBrain().ask_json("", research=True))
    write_pending(product, db, FakeBrain())
    db.run("UPDATE messages SET status='approved'")
    assert engine.send_due(product, db, mb, datetime(2026, 10, 14, 6, tzinfo=timezone.utc)) == 0
    assert mb.sent == []


def test_daily_limit(product):
    product.sending["daily_limit"] = 1
    db, mb = DB(":memory:"), FakeMailbox()
    v = FakeVerifier(good=("priya.sharma@acmehealth.com", "rahul.mehta@acmehealth.com"))
    _store(product, db, v, [{"company": "Acme Health", "domain": "acmehealth.com", "people": [
        {"name": "Priya Sharma"}, {"name": "Rahul Mehta"}]}])
    write_pending(product, db, FakeBrain())
    db.run("UPDATE messages SET status='approved'")
    now = datetime.now(timezone.utc)
    assert engine.send_due(product, db, mb, now) == 1
    assert engine.send_due(product, db, mb, now) == 0
