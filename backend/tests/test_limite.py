"""Testes do limitador de requisições, com um relógio simulado (sem esperar de verdade)."""

from backend.app.limite import RateLimiter


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def test_allows_up_to_the_limit_then_blocks():
    limiter = RateLimiter(3, window=60, clock=FakeClock())
    assert [limiter.allow("1.1.1.1") for _ in range(4)] == [True, True, True, False]


def test_each_ip_has_its_own_counter():
    limiter = RateLimiter(1, window=60, clock=FakeClock())
    assert limiter.allow("1.1.1.1")
    assert limiter.allow("2.2.2.2")
    assert not limiter.allow("1.1.1.1")


def test_counter_resets_when_window_ends():
    clock = FakeClock()
    limiter = RateLimiter(1, window=60, clock=clock)
    assert limiter.allow("1.1.1.1")
    clock.now += 59
    assert not limiter.allow("1.1.1.1")
    assert limiter.retry_after("1.1.1.1") == 2
    clock.now += 1
    assert limiter.allow("1.1.1.1")


def test_expired_ips_are_removed_from_memory():
    clock = FakeClock()
    limiter = RateLimiter(5, window=60, clock=clock)
    limiter.allow("1.1.1.1")
    clock.now += 61
    limiter.allow("2.2.2.2")
    assert set(limiter._counters) == {"2.2.2.2"}
