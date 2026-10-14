"""A small local web page at http://127.0.0.1:5555 to approve emails and watch the pipeline.

Standard library only. Every value from email or the web is HTML-escaped.
"""

from __future__ import annotations

from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .config import list_products, load_product
from .db import DB

CSS = """
:root{--bg:#fafaf7;--fg:#1d1d1b;--muted:#6b6b66;--line:#e2e1db;--card:#fff;--accent:#2f5d50;--warn:#9a3b2e}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--fg:#ecebe6;--muted:#9a9993;--line:#2e2e2b;--card:#1f1f1d;--accent:#7fb8a4;--warn:#e08b7c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif}
header{display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:14px 16px;border-bottom:1px solid var(--line)}
header b{font-size:17px}nav a{margin-right:14px;color:var(--muted);text-decoration:none}nav a.on{color:var(--fg);font-weight:600}
main{max-width:980px;margin:0 auto;padding:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px;margin:0 0 14px}
.meta{color:var(--muted);font-size:13px}textarea,input[type=text]{width:100%;font:inherit;background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:6px;padding:8px}
textarea{min-height:170px}button{font:inherit;padding:6px 14px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--fg);cursor:pointer;margin-right:6px}
button.go{background:var(--accent);color:var(--bg);border-color:var(--accent)}button.no{color:var(--warn)}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.wrap{overflow-x:auto}.stats{display:flex;flex-wrap:wrap;gap:10px}.stat{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 14px;min-width:120px}
.stat b{display:block;font-size:22px}pre{white-space:pre-wrap;font:inherit;margin:6px 0}
"""


def _page(title: str, product: str, tab: str, body: str) -> bytes:
    tabs = "".join(
        f'<a class="{"on" if t == tab else ""}" href="/{t}?product={escape(product)}">{t.title()}</a>'
        for t in ("overview", "outbox", "prospects", "conversations", "activity"))
    picker = "".join(
        f'<a class="{"on" if s == product else ""}" href="/{tab}?product={s}">{escape(s)}</a>'
        for s in list_products())
    return (f"<!doctype html><html><head><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'>"
            f"<title>Closer · {escape(title)}</title><style>{CSS}</style></head><body>"
            f"<header><b>Closer</b><nav>{picker}</nav><nav>{tabs}</nav></header><main>{body}</main></body></html>").encode()


def make_handler(db: DB):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _send(self, content: bytes, code: int = 200):
            self.send_response(code)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(content)

        def do_GET(self):
            url = urlparse(self.path)
            qs = parse_qs(url.query)
            products = list_products()
            product = qs.get("product", [products[0] if products else ""])[0]
            if product not in products:
                return self._send(b"unknown product", 404)
            tab = url.path.strip("/") or "overview"
            view = {"overview": self.overview, "outbox": self.outbox, "prospects": self.prospects,
                    "conversations": self.conversations, "activity": self.activity}.get(tab)
            if not view:
                return self._send(b"not found", 404)
            self._send(_page(tab, product, tab, view(product)))

        def do_POST(self):
            # Only accept form posts from this page itself.
            origin = self.headers.get("Origin", "")
            if origin and urlparse(origin).netloc != self.headers.get("Host", ""):
                return self._send(b"forbidden", 403)
            length = int(self.headers.get("Content-Length", 0))
            form = {k: v[0] for k, v in parse_qs(self.rfile.read(length).decode()).items()}
            mid = int(form.get("id", 0))
            m = db.message(mid)
            if m and m["status"] == "draft":
                if "subject" in form or "body" in form:
                    db.update_message(mid, subject=form.get("subject", m["subject"]),
                                      body=form.get("body", m["body"]).replace("\r\n", "\n"))
                action = form.get("action")
                if action == "approve":
                    db.update_message(mid, status="approved")
                elif action == "reject":
                    db.update_message(mid, status="rejected")
                    if m["step"] == 1:   # rejecting the first email drops the whole sequence
                        db.cancel_pending(m["prospect_id"])
                        db.update_prospect(m["prospect_id"], status="not_interested")
            self.send_response(303)
            self.send_header("Location", f"/outbox?product={m['product'] if m else ''}")
            self.end_headers()

        # ---- views ----
        def overview(self, product: str) -> str:
            p = load_product(product)
            c = db.counts(product)
            labels = [("awaiting_approval", "Waiting for you"), ("new", "New prospects"),
                      ("drafted", "Drafted"), ("contacted", "Contacted"), ("replied", "Replied"),
                      ("interested", "Interested"), ("not_interested", "Not interested"),
                      ("bounced", "Bounced"), ("no_email", "No email found")]
            stats = "".join(f'<div class="stat"><b>{c.get(k, 0)}</b>{v}</div>' for k, v in labels)
            problems = "".join(f"<li>{escape(x)}</li>" for x in p.setup_problems())
            warn = f'<div class="card"><b>Before sending</b><ul>{problems}</ul></div>' if problems else ""
            return f"<h2>{escape(p.name)}</h2>{warn}<div class='stats'>{stats}</div>"

        def outbox(self, product: str) -> str:
            rows = db.q("SELECT m.*, p.name, p.title, p.company, p.email, p.email_status, p.hook"
                        " FROM messages m JOIN prospects p ON p.id=m.prospect_id"
                        " WHERE m.product=? AND m.status='draft' ORDER BY m.step=0 DESC, m.prospect_id, m.step",
                        product)
            if not rows:
                return "<p class=meta>Nothing waiting for approval.</p>"
            cards = []
            for m in rows:
                kind = "Reply to their message" if m["step"] == 0 else f"Email {m['step']} of sequence"
                cards.append(
                    f'<form class="card" method="post"><input type=hidden name=id value="{m["id"]}">'
                    f'<div class="meta">{kind} · to {escape(m["name"])}, {escape(m["title"])} at {escape(m["company"])}'
                    f' &lt;{escape(m["email"])}&gt; ({escape(m["email_status"])})</div>'
                    f'<div class="meta">Why them: {escape(m["hook"])}</div>'
                    f'<p><input type=text name=subject value="{escape(m["subject"])}"></p>'
                    f'<p><textarea name=body>{escape(m["body"])}</textarea></p>'
                    f'<button class=go name=action value=approve>Approve</button>'
                    f'<button name=action value=save>Save edits</button>'
                    f'<button class=no name=action value=reject>Reject</button></form>')
            return f"<p class=meta>{len(rows)} waiting. Signature and unsubscribe line are added when sent.</p>" + "".join(cards)

        def prospects(self, product: str) -> str:
            rows = db.q("SELECT * FROM prospects WHERE product=? ORDER BY id DESC LIMIT 500", product)
            trs = "".join(
                f"<tr><td>{escape(r['name'])}<div class=meta>{escape(r['title'])}</div></td>"
                f"<td>{escape(r['company'])}<div class=meta>{escape(r['country'])}</div></td>"
                f"<td>{escape(r['email'])}<div class=meta>{escape(r['email_status'])}</div></td>"
                f"<td>{escape(r['status'])}</td></tr>" for r in rows)
            return f"<div class=wrap><table><tr><th>Person</th><th>Organisation</th><th>Email</th><th>Status</th></tr>{trs}</table></div>"

        def conversations(self, product: str) -> str:
            ids = db.q("SELECT DISTINCT prospect_id FROM messages WHERE product=? AND direction='in'"
                       " ORDER BY id DESC LIMIT 100", product)
            out = []
            for r in ids:
                p = db.prospect(r["prospect_id"])
                msgs = "".join(
                    f"<div class=meta>{'You' if m['direction'] == 'out' else escape(p['name'])} · {escape(m['status'])}"
                    f"{' · ' + escape(m['category']) if m['category'] else ''}</div><pre>{escape(m['body'])}</pre>"
                    for m in db.thread(p["id"]) if m["status"] in ("sent", "received", "draft", "approved"))
                out.append(f"<div class=card><b>{escape(p['name'])}</b> · {escape(p['company'])} · {escape(p['status'])}{msgs}</div>")
            return "".join(out) or "<p class=meta>No replies yet.</p>"

        def activity(self, product: str) -> str:
            rows = db.q("SELECT * FROM events WHERE product IN (?, '') ORDER BY id DESC LIMIT 200", product)
            trs = "".join(f"<tr><td class=meta>{escape(r['created_at'][:16])}</td><td>{escape(r['kind'])}</td>"
                          f"<td>{escape(r['detail'][:300])}</td></tr>" for r in rows)
            return f"<div class=wrap><table>{trs}</table></div>"

    return Handler


def serve(db: DB, port: int = 5555) -> None:
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(db))
    print(f"Dashboard: http://127.0.0.1:{port}  (Ctrl+C to stop)")
    server.serve_forever()
