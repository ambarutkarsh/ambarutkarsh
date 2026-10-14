"""Find a person's work email: learn the company's address pattern, verify one candidate at a time.

Without a verifier key every address stays 'guess', and guesses are never sent.
"""

from __future__ import annotations

import re
import unicodedata

import httpx

from .db import DB

PATTERNS = ["{first}.{last}", "{first}", "{f}{last}", "{first}{last}",
            "{f}.{last}", "{first}_{last}", "{first}{l}", "{last}"]

SENDABLE = ("verified",)


def _clean(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def split_name(name: str) -> tuple[str, str]:
    parts = [p for p in re.split(r"\s+", re.sub(r"\(.*?\)|,.*$", "", name).strip()) if p]
    parts = [p for p in parts if _clean(p) not in ("dr", "mr", "mrs", "ms", "prof")]
    if not parts:
        return "", ""
    return _clean(parts[0]), _clean(parts[-1]) if len(parts) > 1 else ""


def candidates(name: str, domain: str) -> list[tuple[str, str]]:
    """(pattern, address) pairs, most common patterns first."""
    first, last = split_name(name)
    if not first or not domain:
        return []
    out, seen = [], set()
    for p in PATTERNS:
        if ("{last}" in p or "{l}" in p) and not last:
            continue
        local = p.format(first=first, last=last, f=first[:1], l=last[:1])
        if local not in seen:
            seen.add(local)
            out.append((p, f"{local}@{domain}"))
    return out


def apply_pattern(pattern: str, name: str, domain: str) -> str:
    first, last = split_name(name)
    if not first or (("{last}" in pattern or "{l}" in pattern) and not last):
        return ""
    return pattern.format(first=first, last=last, f=first[:1], l=last[:1]) + "@" + domain


class Verifier:
    """Reoon or ZeroBounce. verify() returns verified | catch_all | invalid | unknown."""

    def __init__(self, env: dict[str, str]):
        self.reoon = env.get("REOON_API_KEY", "")
        self.zerobounce = env.get("ZEROBOUNCE_API_KEY", "")

    @property
    def available(self) -> bool:
        return bool(self.reoon or self.zerobounce)

    def verify(self, email: str) -> str:
        try:
            if self.reoon:
                r = httpx.get("https://emailverifier.reoon.com/api/v1/verify",
                              params={"email": email, "key": self.reoon, "mode": "power"}, timeout=60)
                status = (r.json().get("status") or "").lower()
                return {"safe": "verified", "catch_all": "catch_all", "unknown": "unknown",
                        "role_account": "unknown"}.get(status, "invalid" if status else "unknown")
            if self.zerobounce:
                r = httpx.get("https://api.zerobounce.net/v2/validate",
                              params={"api_key": self.zerobounce, "email": email}, timeout=60)
                status = (r.json().get("status") or "").lower()
                return {"valid": "verified", "catch-all": "catch_all", "unknown": "unknown"}.get(
                    status, "invalid" if status else "unknown")
        except (httpx.HTTPError, ValueError):
            return "unknown"
        return "unknown"


def find_email(db: DB, prospect, verifier: Verifier, max_checks: int = 3) -> tuple[str, str]:
    """Returns (email, status) and stores it on the prospect."""
    pid, name, domain = prospect["id"], prospect["name"], prospect["domain"]

    def save(email: str, status: str) -> tuple[str, str]:
        if email and db.email_taken(email, pid):
            status = "duplicate"
        db.update_prospect(pid, email=email, email_status=status,
                           status="no_email" if status in ("invalid", "duplicate") or not email
                           else prospect["status"])
        return email, status

    # Address supplied by an import: just verify it.
    if prospect["email"]:
        status = verifier.verify(prospect["email"]) if verifier.available else "guess"
        return save(prospect["email"], status)

    if not domain:
        return save("", "unknown")

    known = db.domain_pattern(domain)
    if known == "*":   # catch-all domain: cannot verify, best guess only
        return save(apply_pattern(PATTERNS[0], name, domain), "catch_all")
    if known:
        email = apply_pattern(known, name, domain)
        if not verifier.available:
            return save(email, "guess")
        status = verifier.verify(email)
        if status != "invalid":
            return save(email, status)

    options = candidates(name, domain)
    if not options:
        return save("", "unknown")
    if not verifier.available:
        return save(options[0][1], "guess")

    for pattern, email in options[:max_checks]:
        status = verifier.verify(email)
        if status == "verified":
            db.set_domain_pattern(domain, pattern)
            return save(email, "verified")
        if status == "catch_all":
            db.set_domain_pattern(domain, "*")
            return save(options[0][1], "catch_all")
        if status == "unknown":
            return save(email, "unknown")
    return save("", "invalid")
