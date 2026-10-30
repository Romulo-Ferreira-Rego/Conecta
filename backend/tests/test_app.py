"""Testes de /api/meta, /api/saude e das proteções da API (CORS, cache, limite, logs)."""

import logging

from backend.tests.conftest import make_client


def test_meta_shows_last_import_and_collection(client):
    body = client.get("/api/meta").json()
    assert body["ultima_importacao"].startswith("2026-10-27T")
    assert body["ultima_coleta"] == "2026-09-30"
    assert "gov.br/anp" in body["fonte"]


def test_saude(client):
    assert client.get("/api/saude").json() == {"status": "ok"}


def test_successful_responses_can_be_cached(client):
    response = client.get("/api/produtos")
    assert response.headers["Cache-Control"] == "public, max-age=3600"


def test_errors_are_not_cached(client):
    response = client.get("/api/resumo", params={"produto": "xyz"})
    assert "Cache-Control" not in response.headers


def test_cors_allows_only_configured_frontend(conn, seeded):
    client = make_client(conn, cors_origins="https://conecta.exemplo.com")
    allowed = client.get("/api/produtos", headers={"Origin": "https://conecta.exemplo.com"})
    assert allowed.headers["access-control-allow-origin"] == "https://conecta.exemplo.com"
    denied = client.get("/api/produtos", headers={"Origin": "https://site-qualquer.com"})
    assert "access-control-allow-origin" not in denied.headers


def test_only_get_is_allowed(client):
    assert client.post("/api/produtos").status_code == 405


def test_rate_limit_returns_429_in_portuguese(conn, seeded):
    client = make_client(conn, rate_limit_per_minute=2)
    assert client.get("/api/produtos").status_code == 200
    assert client.get("/api/produtos").status_code == 200
    response = client.get("/api/produtos")
    assert response.status_code == 429
    assert "Aguarde" in response.json()["detail"]
    assert int(response.headers["Retry-After"]) > 0
    # A documentação não conta no limite
    assert client.get("/docs").status_code == 200


def test_access_log_has_no_ip_or_query_string(client, caplog):
    """LGPD: o log registra rota, status e tempo, mas não o IP nem os filtros."""
    with caplog.at_level(logging.INFO, logger="conecta.api"):
        client.get("/api/resumo", params={"uf": "MA"})
    [message] = [r.getMessage() for r in caplog.records if r.name == "conecta.api"]
    assert message.startswith("GET /api/resumo 200")
    assert "testclient" not in message and "uf=" not in message


def test_docs_are_available(client):
    assert client.get("/docs").status_code == 200
    schema = client.get("/openapi.json").json()
    assert schema["info"]["title"] == "Conecta Dados API"
