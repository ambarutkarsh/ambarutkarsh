"""FastAPI surface: POST /chat and GET /healthz (build doc Sections 5 and 9).

The default app wires the deterministic dev components from app.testing so the
service runs end-to-end without GPUs or external services; production wiring
replaces the orchestrator via create_app(orchestrator=...) in later phases.
WebSocket streaming (/ws) is added in Phase 5 with the frontend.
"""

from fastapi import FastAPI

from app.api.schemas import ChatRequest, ChatResponse
from app.orchestrator.pipeline import Orchestrator
from app.orchestrator.state import DialogueState, SessionContext


def create_app(orchestrator: Orchestrator | None = None) -> FastAPI:
    if orchestrator is None:
        from app.testing.fixtures import build_dev_orchestrator

        orchestrator = build_dev_orchestrator()

    app = FastAPI(title="RenewAssist", version="0.1.0")
    # In-process session store; production keeps hot dialogue state in Redis.
    sessions: dict[str, DialogueState] = {}

    @app.get("/healthz")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/chat", response_model=ChatResponse)
    async def chat(request: ChatRequest) -> ChatResponse:
        ctx = SessionContext(
            session_id=request.session_id,
            policy_ref_token=request.policy_context_token,
        )
        state = sessions.setdefault(request.session_id, DialogueState())
        return await orchestrator.handle_turn(request.message, ctx, state)

    return app
