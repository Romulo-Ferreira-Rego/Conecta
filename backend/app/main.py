"""Aplicação FastAPI do Conecta Dados.

Para rodar localmente (a partir da raiz do projeto):
    uvicorn backend.app.main:app --reload

Documentação interativa: http://localhost:8000/docs
"""

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import Settings, get_settings
from backend.app.limite import RateLimiter
from backend.app.rotas import catalogo, meta, precos

log = logging.getLogger("conecta.api")

DESCRIPTION = """
API pública e **somente leitura** do painel **Conecta Dados — Combustíveis**.

Os dados vêm da [Série Histórica de Preços de Combustíveis da ANP](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis)
e são agregados por mês, UF e município. Os preços são em R$ por litro (ou por m³, no GNV).
"""


def _configure_logging() -> None:
    # LGPD (seção 7.2): o log de acesso padrão do uvicorn grava o IP completo
    # de cada visitante. Ele é desligado e substituído pelo log abaixo, sem IP.
    logging.getLogger("uvicorn.access").disabled = True
    if not log.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%H:%M:%S"))
        log.addHandler(handler)
        log.setLevel(logging.INFO)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    _configure_logging()

    app = FastAPI(
        title="Conecta Dados API",
        description=DESCRIPTION,
        version="1.0.0",
        docs_url="/docs",
        redoc_url=None,
    )
    app.dependency_overrides[get_settings] = lambda: settings
    limiter = RateLimiter(settings.rate_limit_per_minute, window=60)

    @app.middleware("http")
    async def rate_limit_log_and_cache(request: Request, call_next):
        started = time.perf_counter()
        ip = request.client.host if request.client else "desconhecido"

        if request.url.path.startswith("/api/") and not limiter.allow(ip):
            response = JSONResponse(
                status_code=429,
                content={"detail": "Muitas requisições. Aguarde um minuto e tente novamente."},
                headers={"Retry-After": str(limiter.retry_after(ip))},
            )
        else:
            response = await call_next(request)
            if request.method == "GET" and response.status_code == 200 and request.url.path != "/api/saude":
                response.headers["Cache-Control"] = f"public, max-age={settings.cache_max_age}"

        log.info(
            "%s %s %d %.0fms",
            request.method, request.url.path, response.status_code,
            (time.perf_counter() - started) * 1000,
        )
        return response

    # Adicionado por último para ser o mais externo: até respostas de erro levam os cabeçalhos de CORS.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    for router in (catalogo.router, precos.router, meta.router):
        app.include_router(router, prefix="/api")
    return app


app = create_app()
