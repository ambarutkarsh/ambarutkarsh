"""Loads products/<slug>/product.yaml, the playbook files, and .env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_DIR = ROOT / "products"
PLAYBOOK_DIR = ROOT / "playbook"
DATA_DIR = ROOT / "data"

PLACEHOLDER_MARKERS = ("TODO", "YOUR-", "your-")


class ConfigError(Exception):
    pass


@dataclass
class Product:
    slug: str
    name: str
    sender: dict
    pitch: str
    offer: dict
    audience: dict
    research: dict
    sending: dict
    footer: str
    knowledge: str

    @property
    def sender_name(self) -> str:
        return self.sender.get("name", "")

    @property
    def sender_email(self) -> str:
        return self.sender.get("email", "")

    @property
    def daily_limit(self) -> int:
        return int(self.sending.get("daily_limit", 30))

    @property
    def follow_up_days(self) -> list[int]:
        return [int(d) for d in self.sending.get("follow_up_days", [3, 7])]

    @property
    def require_approval(self) -> bool:
        return bool(self.sending.get("require_approval", True))

    @property
    def send_to_catch_all(self) -> bool:
        return bool(self.sending.get("send_to_catch_all", False))

    @property
    def timezone(self) -> str:
        return self.sending.get("timezone", "UTC")

    @property
    def quiet_hours(self) -> tuple[str, str]:
        q = self.sending.get("quiet_hours") or {}
        return q.get("start", "20:00"), q.get("end", "08:00")

    def setup_problems(self) -> list[str]:
        """Things that must be filled in before this product may send email."""
        problems = []
        for label, value in (
            ("sender.email", self.sender_email),
            ("sender.name", self.sender_name),
            ("footer", self.footer),
        ):
            if not value.strip() or any(m in value for m in PLACEHOLDER_MARKERS):
                problems.append(f"{self.slug}: fill in {label} in products/{self.slug}/product.yaml")
        return problems

    def brief(self) -> str:
        """The product context every Claude prompt starts from."""
        a = self.audience
        lines = [
            f"PRODUCT: {self.name}",
            f"SENDER: {self.sender_name}, {self.sender.get('title', '')} ({self.sender_email})",
            f"PITCH: {self.pitch.strip()}",
            f"ENTRY OFFER: {self.offer.get('entry', '')}",
            f"MAIN OFFER: {self.offer.get('main', '')}",
            f"GOAL OF OUTREACH: {self.offer.get('goal', '')}",
        ]
        if self.offer.get("booking_url"):
            lines.append(f"BOOKING LINK: {self.offer['booking_url']}")
        lines += [
            f"WHO WE EMAIL: {a.get('who', '')}",
            "ORGANISATION TYPES: " + ", ".join(a.get("organisation_types", [])),
            "TITLES: " + ", ".join(a.get("titles", [])),
            "COUNTRIES: " + ", ".join(a.get("countries", [])),
            "AVOID: " + "; ".join(a.get("avoid", [])),
            "",
            "PRODUCT KNOWLEDGE:",
            self.knowledge.strip(),
        ]
        return "\n".join(lines)


def list_products() -> list[str]:
    return sorted(p.name for p in PRODUCTS_DIR.iterdir() if (p / "product.yaml").exists())


def load_product(slug: str) -> Product:
    folder = PRODUCTS_DIR / slug
    path = folder / "product.yaml"
    if not path.exists():
        raise ConfigError(f"No product '{slug}'. Known products: {', '.join(list_products())}")
    raw = yaml.safe_load(path.read_text()) or {}
    knowledge_path = folder / "knowledge.md"
    try:
        return Product(
            slug=slug,
            name=raw["name"],
            sender=raw.get("sender") or {},
            pitch=raw.get("pitch", ""),
            offer=raw.get("offer") or {},
            audience=raw.get("audience") or {},
            research=raw.get("research") or {},
            sending=raw.get("sending") or {},
            footer=raw.get("footer", ""),
            knowledge=knowledge_path.read_text() if knowledge_path.exists() else "",
        )
    except KeyError as e:
        raise ConfigError(f"{path}: missing required field {e}") from None


def resolve_products(arg: str | None) -> list[Product]:
    if not arg or arg == "all":
        return [load_product(s) for s in list_products()]
    return [load_product(arg)]


def playbook(name: str) -> str:
    return (PLAYBOOK_DIR / f"{name}.md").read_text()


def load_env(path: Path | None = None) -> dict[str, str]:
    """Read .env (KEY=VALUE lines) layered over the real environment."""
    env = dict(os.environ)
    path = path or ROOT / ".env"
    if path.exists():
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            value = value.split(" #", 1)[0].strip().strip('"').strip("'")
            if value:
                env.setdefault(key.strip(), value)
    return env
