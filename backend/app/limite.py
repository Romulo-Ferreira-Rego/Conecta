"""Limite de requisições por IP ("janela fixa"), guardado só na memória.

Cada IP pode fazer até `max_requests` requisições a cada `window` segundos;
quando a janela termina, a contagem recomeça. Os IPs nunca são gravados em
disco e somem da memória quando a janela expira (LGPD, seção 7.2).

Substitui o slowapi, que na versão 0.1.10 não encontra as rotas do
FastAPI 0.16x (incluídas como `_IncludedRouter`) e deixava a API sem limite.
"""

import time
from collections.abc import Callable


class RateLimiter:
    def __init__(self, max_requests: int, window: float = 60.0, clock: Callable[[], float] = time.monotonic):
        self.max_requests = max_requests
        self.window = window
        self.clock = clock
        self._counters: dict[str, tuple[float, int]] = {}  # ip -> (início da janela, contagem)
        self._last_cleanup = clock()

    def allow(self, key: str) -> bool:
        """Registra uma requisição e diz se ela está dentro do limite."""
        now = self.clock()
        self._cleanup(now)
        started, count = self._counters.get(key, (now, 0))
        if now - started >= self.window:
            started, count = now, 0
        if count >= self.max_requests:
            return False
        self._counters[key] = (started, count + 1)
        return True

    def retry_after(self, key: str) -> int:
        """Segundos até a janela deste IP terminar."""
        started, _ = self._counters.get(key, (self.clock(), 0))
        return max(1, int(self.window - (self.clock() - started)) + 1)

    def _cleanup(self, now: float) -> None:
        """Remove da memória os IPs cuja janela já terminou (no máximo uma vez por janela)."""
        if now - self._last_cleanup < self.window:
            return
        self._counters = {k: v for k, v in self._counters.items() if now - v[0] < self.window}
        self._last_cleanup = now
