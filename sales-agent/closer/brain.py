"""Thinking via the Claude Code CLI (`claude -p`), so it runs on your Claude subscription.

Writing and reply handling run with no tools at all: those prompts carry untrusted text
(prospect replies), so an injected instruction has nothing to act with. Research runs with
read-only web tools (WebSearch, WebFetch) and nothing else.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import time

SYSTEM = (
    "You are the thinking engine of Closer, a cold-email sales agent. "
    "Follow the instructions in the user message exactly. When asked for JSON, "
    "return only the JSON, with no commentary and no code fences. Never invent facts, "
    "people, customers, results or numbers."
)

RESEARCH_TOOLS = ("WebSearch", "WebFetch")


class BrainError(Exception):
    pass


def extract_json(text: str):
    """Pull the first JSON object or array out of model output."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    starts = [i for i in (text.find("{"), text.find("[")) if i >= 0]
    if not starts:
        raise BrainError(f"No JSON in model output: {text[:200]}")
    start = min(starts)
    closer = "}" if text[start] == "{" else "]"
    end = text.rfind(closer)
    try:
        return json.loads(text[start:end + 1])
    except json.JSONDecodeError as e:
        raise BrainError(f"Bad JSON in model output: {e}: {text[:200]}") from None


class Brain:
    def __init__(self, model: str = "", timeout: int = 600, retries: int = 2):
        self.model = model
        self.timeout = timeout
        self.retries = retries

    def ask(self, prompt: str, *, research: bool = False) -> str:
        if not shutil.which("claude"):
            raise BrainError("Claude Code CLI not found. Install it from https://claude.com/download "
                             "and run `claude` once to log in.")
        tools = ",".join(RESEARCH_TOOLS) if research else ""
        cmd = ["claude", "-p", "--output-format", "json", "--strict-mcp-config",
               "--system-prompt", SYSTEM, "--tools", tools]
        if research:
            cmd += ["--allowedTools", tools]
        if self.model:
            cmd += ["--model", self.model]

        last = ""
        for attempt in range(self.retries + 1):
            if attempt:
                time.sleep(5 * 2 ** (attempt - 1))
            try:
                proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True,
                                      timeout=self.timeout)
            except subprocess.TimeoutExpired:
                last = f"timed out after {self.timeout}s"
                continue
            try:
                payload = json.loads(proc.stdout)
            except json.JSONDecodeError:
                last = (proc.stderr or proc.stdout)[:500]
                continue
            if payload.get("is_error"):
                last = str(payload.get("result") or payload)[:500]
                if "login" in last.lower() or "rate" in last.lower() or "limit" in last.lower():
                    break   # retrying will not help
                continue
            return str(payload.get("result") or "")
        raise BrainError(f"Claude call failed: {last}")

    def ask_json(self, prompt: str, *, research: bool = False):
        return extract_json(self.ask(prompt, research=research))
