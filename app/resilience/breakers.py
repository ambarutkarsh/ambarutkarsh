"""Simple circuit breaker for external calls (build doc Section 14).

States: closed (normal) -> open (failing, calls short-circuited) -> half_open
(after reset_timeout, one probe allowed) -> closed on success / open on failure.
Clock is injectable for deterministic tests.
"""

import time
from collections.abc import Callable


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        reset_timeout: float = 30.0,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self.name = name
        self._failure_threshold = failure_threshold
        self._reset_timeout = reset_timeout
        self._clock = clock
        self._failures = 0
        self._opened_at: float | None = None
        self._probing = False

    @property
    def state(self) -> str:
        if self._opened_at is None:
            return "closed"
        if self._clock() - self._opened_at >= self._reset_timeout:
            return "half_open"
        return "open"

    def allow(self) -> bool:
        state = self.state
        if state == "closed":
            return True
        if state == "half_open" and not self._probing:
            self._probing = True
            return True
        return False

    def record_success(self) -> None:
        self._failures = 0
        self._opened_at = None
        self._probing = False

    def record_failure(self) -> None:
        self._probing = False
        if self._opened_at is not None:
            # Failed probe (or failure while open): re-open from now.
            self._opened_at = self._clock()
            return
        self._failures += 1
        if self._failures >= self._failure_threshold:
            self._opened_at = self._clock()
