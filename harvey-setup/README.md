# Harvey setup: RetentionOS + Class

Ready-made configs for [Harvey](https://github.com/ethanplusai/harvey), the autonomous cold-email agent, for two products. Each product runs in its own Harvey instance.

| Folder | Sells | To |
|---|---|---|
| `retentionos/` | RetentionOS | Retention, renewal and CX leaders at health insurers worldwide |
| `class/` | 6-month AI PM course; Class Pro (all artifacts, 5k) | Students and professionals moving into AI Product Management |

## Run it (on your own computer)

```bash
bash install.sh
```

This clones Harvey into `~/harvey-retentionos` and `~/harvey-class`, copies these configs in, and installs everything.

## Before the first send

1. In each `harvey.yaml`, fill in the lines marked `TODO`: sending email, LinkedIn URL, booking link, timezone, and Class pricing/currency.
2. In each `.env`, add Gmail OAuth keys and at least one email verifier (Reoon has 600 free checks a month). Without a verifier, Harvey sends nothing.
3. Run `harvey gmail auth`, then `harvey signals --confirm free`, then `harvey run`.

Every email waits in the Outbox for your approval (`require_approval: true`). Use a dedicated sending domain, not your main one.
