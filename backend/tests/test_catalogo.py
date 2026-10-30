"""Testes de /api/produtos, /api/estados e /api/municipios."""


def test_produtos_have_url_friendly_codes(client):
    response = client.get("/api/produtos")
    assert response.status_code == 200
    codigos = {p["codigo"]: p["nome"] for p in response.json()}
    assert codigos == {"gasolina": "GASOLINA", "etanol": "ETANOL", "diesel-s10": "DIESEL S10"}


def test_estados_lists_all_27_with_region(client):
    estados = client.get("/api/estados").json()
    assert len(estados) == 27
    assert {"sigla": "MA", "nome": "Maranhão", "regiao": "Nordeste"} in estados


def test_municipios_of_a_state(client, seeded):
    response = client.get("/api/municipios", params={"uf": "ma"})  # minúscula também vale
    assert response.status_code == 200
    assert response.json() == [
        {"id": seeded["IMPERATRIZ"], "nome": "IMPERATRIZ", "uf": "MA"},
        {"id": seeded["SAO LUIS"], "nome": "SAO LUIS", "uf": "MA"},
    ]


def test_municipios_requires_uf(client):
    assert client.get("/api/municipios").status_code == 422


def test_unknown_uf_returns_404_in_portuguese(client):
    response = client.get("/api/municipios", params={"uf": "ZZ"})
    assert response.status_code == 404
    assert "UF 'ZZ' não encontrada" in response.json()["detail"]


def test_invalid_uf_format_returns_422(client):
    assert client.get("/api/municipios", params={"uf": "MAR"}).status_code == 422
