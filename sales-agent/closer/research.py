"""Finding prospects: Claude searches the web, or you import a CSV."""

from __future__ import annotations

import csv
from pathlib import Path

from .brain import Brain
from .config import Product, playbook
from .db import DB
from .emails import Verifier, find_email

RESEARCH_PROMPT = """{brief}

---
{rules}

---
TASK: Find {count} organisations that fit WHO WE EMAIL above, and for each the named
decision-makers whose titles match TITLES. {where}

Do NOT return any of these organisations, we already have them:
{known}

Return a JSON array. Each item:
{{"company": "...", "domain": "company email domain, e.g. acme.com", "country": "...",
  "why_fit": "one sentence",
  "hook": "one specific, recent, verifiable fact about this organisation that an email could open with",
  "hook_source_url": "URL where you found the hook",
  "people": [{{"name": "Full Name", "title": "...", "source_url": "URL that names this person in this role"}}]}}
"""


def research(product: Product, db: DB, brain: Brain, verifier: Verifier, count: int | None = None) -> int:
    count = count or int(product.research.get("per_run", 10))
    known = db.known_companies(product.slug)
    where = product.research.get("where_to_look", "")
    prompt = RESEARCH_PROMPT.format(
        brief=product.brief(), rules=playbook("research_rules"), count=count,
        where=f"Good places to look: {where}" if where else "",
        known="\n".join(f"- {k}" for k in known) or "(none yet)",
    )
    db.log(product.slug, "research", f"asking Claude for {count} organisations")
    found = brain.ask_json(prompt, research=True)
    if not isinstance(found, list):
        found = found.get("organisations", []) if isinstance(found, dict) else []
    added = _store(product, db, verifier, found)
    db.log(product.slug, "research_done", f"{len(found)} organisations, {added} new people")
    return added


def _store(product: Product, db: DB, verifier: Verifier, orgs: list) -> int:
    added = 0
    for org in orgs:
        if not isinstance(org, dict) or not org.get("company"):
            continue
        hook = org.get("hook", "")
        if org.get("why_fit"):
            hook = f"{hook} (fit: {org['why_fit']})" if hook else org["why_fit"]
        for person in org.get("people") or []:
            if not isinstance(person, dict) or not person.get("name"):
                continue
            pid = db.add_prospect(
                product.slug, company=org["company"], domain=_domain(org.get("domain", "")),
                country=org.get("country", ""), name=person["name"], title=person.get("title", ""),
                hook=hook, source_url=person.get("source_url") or org.get("hook_source_url", ""),
                email=person.get("email", ""),
            )
            if pid:
                added += 1
                find_email(db, db.prospect(pid), verifier)
    return added


def _domain(d: str) -> str:
    d = d.strip().lower().removeprefix("https://").removeprefix("http://").removeprefix("www.")
    return d.split("/")[0]


def import_csv(product: Product, db: DB, verifier: Verifier, path: Path) -> int:
    """Columns: company, name, title, email, domain, country, hook (company and name required)."""
    added = 0
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            row = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
            if not row.get("company") or not row.get("name"):
                continue
            domain = _domain(row.get("domain") or row.get("email", "").partition("@")[2])
            pid = db.add_prospect(product.slug, company=row["company"], name=row["name"],
                                  title=row.get("title", ""), email=row.get("email", ""),
                                  domain=domain, country=row.get("country", ""),
                                  hook=row.get("hook", ""), source_url="csv import")
            if pid:
                added += 1
                find_email(db, db.prospect(pid), verifier)
    db.log(product.slug, "import", f"{added} prospects from {path}")
    return added
