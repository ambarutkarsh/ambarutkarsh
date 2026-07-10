"""Handoff provider selection by configuration (HANDOFF_PROVIDER env)."""

import os

from app.handoff.base import HandoffProvider
from app.handoff.null import NullHandoffProvider
from app.handoff.salesforce import SalesforceConfig, SalesforceHandoffProvider


def get_handoff_provider(name: str | None = None) -> HandoffProvider:
    provider = (name or os.environ.get("HANDOFF_PROVIDER", "null")).lower()
    if provider == "null":
        return NullHandoffProvider()
    if provider == "salesforce":
        config = SalesforceConfig(
            base_url=os.environ["SALESFORCE_BASE_URL"],
            client_id=os.environ["SALESFORCE_CLIENT_ID"],
            client_secret=os.environ["SALESFORCE_CLIENT_SECRET"],
            api_version=os.environ.get("SALESFORCE_API_VERSION", "v61.0"),
            case_record_type_id=os.environ.get("SALESFORCE_CASE_RECORD_TYPE_ID"),
        )
        return SalesforceHandoffProvider(config)
    raise ValueError(f"Unknown handoff provider: {provider!r}")
