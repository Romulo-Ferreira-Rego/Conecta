"""Fixtures da API: dados inventados com resultados conhecidos, no banco de testes.

Cenário (setembro/2026, salvo indicação), preços por litro:

    GASOLINA  SAO LUIS (MA)    10 coletas a 6,00   | agosto: 10 a 5,80
              IMPERATRIZ (MA)  30 coletas a 6,40
              SAO PAULO (SP)   10 coletas a 6,10
              TERESINA (PI)     2 coletas a 7,00   (abaixo do mínimo do ranking municipal)
    ETANOL    SAO LUIS (MA)    10 coletas a 4,20
              SAO PAULO (SP)   10 coletas a 4,50

Resultados esperados:
    Gasolina MA = (10x6,00 + 30x6,40) / 40 = 6,30   (média simples das cidades daria 6,20)
    Gasolina Brasil = (60 + 192 + 61 + 14) / 52 = 6,288
    Etanol MA / gasolina MA = 4,20 / 6,30 = 66,7%  -> etanol
    Etanol SP / gasolina SP = 4,50 / 6,10 = 73,8%  -> gasolina
"""

from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.config import Settings
from backend.app.database import get_connection
from backend.app.main import create_app
from db.tests.conftest import alembic_config, conn, engine, test_database_url  # noqa: F401
from etl.ibge import link_municipalities

PRODUCTS = {
    "GASOLINA": "R$ / litro",
    "ETANOL": "R$ / litro",
    "DIESEL S10": "R$ / litro",  # sem coletas: testa respostas vazias
}

# (município, UF, produto, mês, quantidade de coletas, preço)
COLETAS = [
    ("SAO LUIS", "MA", "GASOLINA", date(2026, 8, 1), 10, "5.80"),
    ("SAO LUIS", "MA", "GASOLINA", date(2026, 9, 1), 10, "6.00"),
    ("IMPERATRIZ", "MA", "GASOLINA", date(2026, 9, 1), 30, "6.40"),
    ("SAO PAULO", "SP", "GASOLINA", date(2026, 9, 1), 10, "6.10"),
    ("TERESINA", "PI", "GASOLINA", date(2026, 9, 1), 2, "7.00"),
    ("SAO LUIS", "MA", "ETANOL", date(2026, 9, 1), 10, "4.20"),
    ("SAO PAULO", "SP", "ETANOL", date(2026, 9, 1), 10, "4.50"),
]


@pytest.fixture
def seeded(conn) -> dict:
    """Insere o cenário acima e atualiza a visão. Devolve os IDs dos municípios."""

    def scalar(sql: str, **params):
        return conn.execute(text(sql), params).scalar_one()

    product_ids = {
        nome: scalar(
            "INSERT INTO dados.produto (nome, unidade_medida) VALUES (:n, :u) RETURNING id", n=nome, u=unidade
        )
        for nome, unidade in PRODUCTS.items()
    }
    importacao_id = scalar(
        "INSERT INTO dados.importacao (arquivo, status, data_importacao) "
        "VALUES ('teste/api.csv', 'sucesso', '2026-10-27 09:00:00-03') RETURNING id"
    )

    city_ids, station_ids = {}, {}
    for cidade, uf, *_ in COLETAS:
        if cidade in city_ids:
            continue
        city_ids[cidade] = scalar(
            "INSERT INTO dados.municipio (nome, estado_id) "
            "SELECT :nome, id FROM dados.estado WHERE sigla = :uf RETURNING id",
            nome=cidade, uf=uf,
        )
        # Um posto por cidade; cada coleta é em um dia diferente do mês
        station_ids[cidade] = scalar(
            "INSERT INTO dados.revenda (cnpj, razao_social, municipio_id) "
            "VALUES (:cnpj, :nome, :m) RETURNING id",
            cnpj=f"{len(city_ids):02d}.000.000/0001-00", nome=f"POSTO {cidade}", m=city_ids[cidade],
        )

    link_municipalities(conn)  # código IBGE, usado pelo /api/mapa

    rows = [
        {
            "r": station_ids[cidade],
            "p": product_ids[produto],
            "d": mes.replace(day=dia),
            "v": preco,
            "i": importacao_id,
        }
        for cidade, _, produto, mes, quantidade, preco in COLETAS
        for dia in range(1, quantidade + 1)
    ]
    conn.execute(
        text(
            "INSERT INTO dados.coleta_preco (revenda_id, produto_id, data_coleta, valor_venda, importacao_id) "
            "VALUES (:r, :p, :d, :v, :i)"
        ),
        rows,
    )
    conn.exec_driver_sql("REFRESH MATERIALIZED VIEW dados.preco_medio_mensal")
    return city_ids


def make_client(conn, **settings) -> TestClient:
    """Cliente HTTP da API usando a conexão do teste (transação desfeita no final)."""
    app = create_app(Settings(_env_file=None, **settings))
    app.dependency_overrides[get_connection] = lambda: conn
    return TestClient(app)


@pytest.fixture
def client(conn, seeded) -> TestClient:
    return make_client(conn, rate_limit_per_minute=1000)
