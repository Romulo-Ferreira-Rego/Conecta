"""Fixtures compartilhadas pelos testes do banco.

Os testes rodam contra o PostgreSQL do Docker (docker compose up -d).
Cada teste roda dentro de uma transação desfeita no final (rollback),
então nada do que eles inserem fica gravado no banco.
"""

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text

from db.connection import PROJECT_ROOT, get_database_url


@pytest.fixture(scope="session")
def alembic_config() -> Config:
    return Config(str(PROJECT_ROOT / "db" / "alembic.ini"))


@pytest.fixture(scope="session")
def engine(alembic_config):
    command.upgrade(alembic_config, "head")
    engine = create_engine(get_database_url())
    yield engine
    engine.dispose()


@pytest.fixture
def conn(engine):
    with engine.connect() as connection:
        transaction = connection.begin()
        yield connection
        transaction.rollback()


@pytest.fixture
def sample_ids(conn) -> dict:
    """Cria um conjunto mínimo de registros relacionados para os testes."""

    def insert(sql: str, **params) -> int:
        return conn.execute(text(sql), params).scalar_one()

    estado_id = insert("SELECT id FROM dados.estado WHERE sigla = 'MA'")
    municipio_id = insert(
        "INSERT INTO dados.municipio (nome, estado_id) "
        "VALUES ('SAO LUIS', :estado_id) RETURNING id",
        estado_id=estado_id,
    )
    produto_id = insert(
        "INSERT INTO dados.produto (nome, unidade_medida) "
        "VALUES ('GASOLINA TESTE', 'R$ / litro') RETURNING id"
    )
    revenda_id = insert(
        "INSERT INTO dados.revenda (cnpj, razao_social, municipio_id) "
        "VALUES ('00.000.000/0001-00', 'POSTO TESTE', :municipio_id) RETURNING id",
        municipio_id=municipio_id,
    )
    importacao_id = insert(
        "INSERT INTO dados.importacao (arquivo, status) "
        "VALUES ('teste.csv', 'sucesso') RETURNING id"
    )
    return {
        "estado": estado_id,
        "municipio": municipio_id,
        "produto": produto_id,
        "revenda": revenda_id,
        "importacao": importacao_id,
    }
