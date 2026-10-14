# Closer

Ambar's own cold-email agent for **RetentionOS** and **Class**. It researches prospects on the
web, finds and verifies their work email, writes a personalised email sequence, sends it after
you approve it, reads replies, and drafts the response. It thinks with Claude Code, so it runs
on your Claude subscription with no API bill.

Built from scratch for these two products, with about 1,500 lines of Python and two
dependencies. No dependence on Harvey or anyone else's code.

## How it works

Every 15 minutes `closer run` does one cycle for each product:

1. **Replies:** reads the inbox. A reply stops that person's follow-ups. Claude classifies it
   (interested, question, objection, not now, unsubscribe...) and drafts a response for you.
2. **Send:** sends approved emails that are due: first emails right away, follow-ups after
   3 and 7 days (RetentionOS) or 4 days (Class), in the same thread.
3. **Write:** drafts a sequence for every new prospect with a verified email.
4. **Research:** when fewer than 10 prospects are waiting, Claude searches the web for new
   organisations and named decision-makers (once a day per product at most).

Nothing goes out until you approve it, on the dashboard or with `closer approve`.

## Setup (once, about 15 minutes)

You need Python 3.10+ and Claude Code installed and logged in (`claude` works in your terminal).

```bash
cd sales-agent
python3 -m venv .venv && source .venv/bin/activate && pip install -e .
cp .env.example .env
```

1. **Mailbox:** create a Google Workspace mailbox on a *separate* domain (e.g. tryretentionos.com),
   not your main one. Turn on 2-step verification, create an App Password, and put the address
   and App Password in `.env` as `SMTP_USER` / `SMTP_PASSWORD`.
2. **Verifier:** sign up at reoon.com (600 free checks a month) and put the key in `.env` as
   `REOON_API_KEY`. Without it Closer never sends, because unverified addresses bounce.
3. **Fill in the TODOs:** in `products/retentionos/product.yaml` and `products/class/product.yaml`,
   add your sending email, a postal address for the footer (anti-spam law requires one), your
   timezone, and optionally a booking link.
4. Run `closer check`. When it says "Ready to send", you're done.

## Daily use

```bash
closer run              # leave this running: the full loop, every 15 minutes
closer dashboard        # http://127.0.0.1:5555: approve, edit or reject emails, see replies
```

Other commands: `closer status`, `closer research retentionos --count 5`, `closer write`,
`closer outbox`, `closer approve 12`, `closer approve all --product class`, `closer reject 12`,
`closer import class contacts.csv` (columns: company, name, title, email, domain, country, hook).

## Changing what it says

- `products/<product>/product.yaml`: offer, audience, countries, limits, follow-up timing.
- `products/<product>/knowledge.md`: what Claude knows about the product. Add real results
  here as you get them; Claude is told never to invent any.
- `playbook/*.md`: the rules for researching, writing and replying.

To add a third product, copy a folder in `products/` and edit it.

## Safety built in

- Every email and every reply waits for your approval (`require_approval: true`).
- Unverified addresses are never emailed. Sending pauses if bounces pass 5%.
- 25 emails a day per product, none during quiet hours.
- Every email carries your postal address and an unsubscribe line, plus a List-Unsubscribe header.
  "unsubscribe" or "not interested" replies remove the person permanently, with no response.
- Claude has no tools when it reads replies, so a malicious reply cannot make it do anything.
  Research gets web search and page reading only.
- The same person is never emailed by both products.

## Tests

```bash
pip install -e '.[dev]' && pytest
```
