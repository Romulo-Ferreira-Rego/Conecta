"""Testes de /api/resumo, /api/serie, /api/ranking e /api/etanol-gasolina.

Os valores esperados estão explicados no cenário de conftest.py.
"""

import pytest

from backend.app.consultas import recommend_fuel


# --- /api/resumo ---------------------------------------------------------------

def test_resumo_national_average_is_weighted_by_collections(client):
    [gasolina] = client.get("/api/resumo", params={"produto": "gasolina"}).json()
    assert gasolina["mes"] == "2026-09-01"
    assert gasolina["preco_medio"] == pytest.approx(6.288)
    assert gasolina["qtd_coletas"] == 52


def test_resumo_variation_against_previous_month(client):
    [gasolina] = client.get("/api/resumo", params={"produto": "gasolina"}).json()
    assert gasolina["mes_anterior"] == "2026-08-01"
    assert gasolina["preco_anterior"] == pytest.approx(5.80)
    assert gasolina["variacao"] == pytest.approx(0.488)
    assert gasolina["variacao_percentual"] == pytest.approx(8.41)


def test_resumo_state_average_is_weighted(client):
    [gasolina] = client.get("/api/resumo", params={"produto": "gasolina", "uf": "MA"}).json()
    assert gasolina["preco_medio"] == pytest.approx(6.30)  # e não 6,20 (média simples)


def test_resumo_without_product_returns_all_with_data(client):
    produtos = [r["produto"] for r in client.get("/api/resumo").json()]
    assert produtos == ["etanol", "gasolina"]  # diesel-s10 não tem coletas


def test_resumo_without_previous_month_has_no_variation(client):
    [etanol] = client.get("/api/resumo", params={"produto": "etanol"}).json()
    assert etanol["mes_anterior"] is None
    assert etanol["variacao"] is None


def test_resumo_by_city(client, seeded):
    [gasolina] = client.get("/api/resumo", params={"produto": "gasolina", "municipio": seeded["IMPERATRIZ"]}).json()
    assert gasolina["preco_medio"] == pytest.approx(6.40)


def test_resumo_unknown_product_returns_404(client):
    response = client.get("/api/resumo", params={"produto": "querosene"})
    assert response.status_code == 404
    assert "/api/produtos" in response.json()["detail"]


def test_resumo_city_outside_state_returns_400(client, seeded):
    response = client.get("/api/resumo", params={"uf": "SP", "municipio": seeded["SAO LUIS"]})
    assert response.status_code == 400


# --- /api/serie ----------------------------------------------------------------

def test_serie_by_state(client):
    body = client.get("/api/serie", params={"produto": "gasolina", "uf": "MA"}).json()
    assert body["produto"] == "gasolina"
    assert body["unidade"] == "R$ / litro"
    assert body["pontos"] == [
        {"mes": "2026-08-01", "preco_medio": 5.8, "preco_min": 5.8, "preco_max": 5.8, "qtd_coletas": 10},
        {"mes": "2026-09-01", "preco_medio": 6.3, "preco_min": 6.0, "preco_max": 6.4, "qtd_coletas": 40},
    ]


def test_serie_period_filter(client):
    pontos = client.get("/api/serie", params={"produto": "gasolina", "inicio": "2026-09", "fim": "2026-09"}).json()["pontos"]
    assert [p["mes"] for p in pontos] == ["2026-09-01"]


def test_serie_empty_for_product_without_data(client):
    body = client.get("/api/serie", params={"produto": "diesel-s10"}).json()
    assert body["pontos"] == []


@pytest.mark.parametrize("inicio", ["2026-13", "09/2026", "2026-9"])
def test_serie_invalid_month_format_returns_422(client, inicio):
    assert client.get("/api/serie", params={"produto": "gasolina", "inicio": inicio}).status_code == 422


def test_serie_start_after_end_returns_400(client):
    response = client.get("/api/serie", params={"produto": "gasolina", "inicio": "2026-09", "fim": "2026-01"})
    assert response.status_code == 400


def test_serie_requires_product(client):
    assert client.get("/api/serie").status_code == 422


# --- /api/ranking --------------------------------------------------------------

def test_ranking_states_most_expensive_first(client):
    body = client.get("/api/ranking", params={"produto": "gasolina"}).json()
    assert body["mes"] == "2026-09-01"
    assert [(i["posicao"], i["uf"], i["preco_medio"]) for i in body["itens"]] == [
        (1, "PI", 7.0),
        (2, "MA", 6.3),
        (3, "SP", 6.1),
    ]


def test_ranking_states_cheapest_first_with_limit(client):
    itens = client.get("/api/ranking", params={"produto": "gasolina", "ordem": "asc", "limite": 2}).json()["itens"]
    assert [i["uf"] for i in itens] == ["SP", "MA"]


def test_ranking_cities_skips_small_samples(client, seeded):
    itens = client.get("/api/ranking", params={"produto": "gasolina", "nivel": "municipio"}).json()["itens"]
    nomes = [i["nome"] for i in itens]
    assert nomes == ["IMPERATRIZ", "SAO PAULO", "SAO LUIS"]  # TERESINA tem só 2 coletas
    assert itens[0]["municipio_id"] == seeded["IMPERATRIZ"]


def test_ranking_cities_within_state(client):
    itens = client.get("/api/ranking", params={"produto": "gasolina", "nivel": "municipio", "uf": "MA"}).json()["itens"]
    assert [i["nome"] for i in itens] == ["IMPERATRIZ", "SAO LUIS"]


def test_ranking_minimum_is_configurable(conn, seeded):
    from backend.tests.conftest import make_client

    client = make_client(conn, rate_limit_per_minute=1000, ranking_min_coletas=1)
    itens = client.get("/api/ranking", params={"produto": "gasolina", "nivel": "municipio"}).json()["itens"]
    assert itens[0]["nome"] == "TERESINA"


def test_ranking_empty_for_product_without_data(client):
    body = client.get("/api/ranking", params={"produto": "diesel-s10"}).json()
    assert body["mes"] is None
    assert body["itens"] == []


@pytest.mark.parametrize("params", [{"nivel": "bairro"}, {"ordem": "maior"}, {"limite": 0}, {"limite": 51}])
def test_ranking_invalid_parameters_return_422(client, params):
    assert client.get("/api/ranking", params={"produto": "gasolina", **params}).status_code == 422


# --- /api/etanol-gasolina ------------------------------------------------------

def test_etanol_compensates_in_ma(client):
    body = client.get("/api/etanol-gasolina", params={"uf": "MA"}).json()
    assert body["preco_etanol"] == pytest.approx(4.20)
    assert body["preco_gasolina"] == pytest.approx(6.30)
    assert body["percentual"] == pytest.approx(66.7)
    assert body["recomendacao"] == "etanol"


def test_gasolina_compensates_in_sp(client):
    body = client.get("/api/etanol-gasolina", params={"uf": "SP"}).json()
    assert body["percentual"] == pytest.approx(73.8)
    assert body["recomendacao"] == "gasolina"


def test_etanol_gasolina_without_data_returns_null(client, seeded):
    response = client.get("/api/etanol-gasolina", params={"municipio": seeded["TERESINA"]})
    assert response.status_code == 200
    assert response.json() is None


@pytest.mark.parametrize(
    "etanol, gasolina, expected",
    [(4.20, 6.00, "etanol"), (4.30, 6.00, "gasolina"), (4.90, 7.00, "etanol")],  # 70% exato: etanol
)
def test_seventy_percent_rule(etanol, gasolina, expected):
    assert recommend_fuel(etanol, gasolina)[1] == expected


# --- /api/mapa -----------------------------------------------------------------

def test_mapa_by_state_lists_states_with_data(client):
    body = client.get("/api/mapa", params={"produto": "gasolina"}).json()
    assert body["nivel"] == "uf"
    assert body["mes"] == "2026-09-01"
    assert body["mes_anterior"] == "2026-08-01"
    assert body["min_coletas"] == 10
    precos = {item["uf"]: item["preco_medio"] for item in body["itens"]}
    assert precos == pytest.approx({"MA": 6.30, "PI": 7.00, "SP": 6.10})


def test_mapa_state_variation_against_previous_month(client):
    itens = {i["uf"]: i for i in client.get("/api/mapa", params={"produto": "gasolina"}).json()["itens"]}
    # Em agosto só São Luís tinha coletas no MA (5,80); em setembro o MA ficou em 6,30
    assert itens["MA"]["preco_anterior"] == pytest.approx(5.80)
    assert itens["MA"]["variacao_percentual"] == pytest.approx(8.62)
    assert itens["SP"]["variacao_percentual"] is None  # SP não tinha coletas em agosto


def test_mapa_by_city_includes_ibge_code_and_small_samples(client, seeded):
    body = client.get("/api/mapa", params={"produto": "gasolina", "uf": "ma"}).json()
    assert body["nivel"] == "municipio"
    assert body["uf"] == "MA"
    assert [(i["nome"], i["codigo_ibge"], i["municipio_id"]) for i in body["itens"]] == [
        ("IMPERATRIZ", 2105302, seeded["IMPERATRIZ"]),
        ("SAO LUIS", 2111300, seeded["SAO LUIS"]),
    ]

    # Teresina tem só 2 coletas: entra no mapa (o site avisa que a amostra é pequena)
    [teresina] = client.get("/api/mapa", params={"produto": "gasolina", "uf": "PI"}).json()["itens"]
    assert teresina["qtd_coletas"] == 2


def test_mapa_product_without_data_is_empty(client):
    body = client.get("/api/mapa", params={"produto": "diesel-s10"}).json()
    assert body["mes"] is None
    assert body["itens"] == []


def test_mapa_unknown_state_returns_404(client):
    assert client.get("/api/mapa", params={"produto": "gasolina", "uf": "XX"}).status_code == 404
