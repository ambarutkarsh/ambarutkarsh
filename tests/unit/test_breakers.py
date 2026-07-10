from app.resilience.breakers import CircuitBreaker


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


def make_breaker(clock: FakeClock) -> CircuitBreaker:
    return CircuitBreaker("test", failure_threshold=3, reset_timeout=30.0, clock=clock)


def test_starts_closed_and_allows():
    breaker = make_breaker(FakeClock())
    assert breaker.state == "closed"
    assert breaker.allow()


def test_opens_after_threshold_failures():
    breaker = make_breaker(FakeClock())
    for _ in range(3):
        breaker.record_failure()
    assert breaker.state == "open"
    assert not breaker.allow()


def test_half_open_allows_single_probe_then_closes_on_success():
    clock = FakeClock()
    breaker = make_breaker(clock)
    for _ in range(3):
        breaker.record_failure()
    clock.advance(31)
    assert breaker.state == "half_open"
    assert breaker.allow()       # the probe
    assert not breaker.allow()   # only one probe
    breaker.record_success()
    assert breaker.state == "closed"


def test_failed_probe_reopens():
    clock = FakeClock()
    breaker = make_breaker(clock)
    for _ in range(3):
        breaker.record_failure()
    clock.advance(31)
    assert breaker.allow()
    breaker.record_failure()
    assert breaker.state == "open"
    assert not breaker.allow()
