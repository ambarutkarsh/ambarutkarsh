.PHONY: install test lint type check eval up down

install:
	uv sync

test:
	uv run pytest -q

lint:
	uv run ruff check .

type:
	uv run mypy

check: lint type test

eval:
	@echo "Evaluation suites (RAGAS/DeepEval) are wired in Phase 6."
	@echo "Golden set lives in eval/golden/, adversarial seeds in eval/adversarial/."

up:
	docker compose up -d

down:
	docker compose down
