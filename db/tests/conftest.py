"""Fixtures compartilhadas pelos testes do banco (usadas também pelo ETL).

Os testes rodam em um banco SEPARADO (conecta_test, no mesmo PostgreSQL do
Docker), criado automaticamente. Assim, testes que apagam o schema (ex.:
reversibilidade das migrações) nunca tocam nos dados de desenvolvimento.
Além disso, cada teste roda dentro de uma transação desfeita no final.
"""

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from db.connection import PROJECT_ROOT, get_database_url, get_test_database_url


def _create_test_database(test_url: str) -> None:
    url = make_url(test_url)
    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": url.database}
        ).scalar()
        if not exists:
            conn.exec_driver_sql(f'CREATE DATABASE "{url.database}"')
    admin.dispose()


@pytest.fixture(scope="session")
def test_database_url() -> str:
    url = get_test_database_url()
    if make_url(url).database == make_url(get_database_url()).database:
        pytest.exit("O banco de testes não pode ser o mesmo da DATABASE_URL.", returncode=1)
    _create_test_database(url)
    return url


@pytest.fixture(scope="session")
def alembic_config(test_database_url) -> Config:
    config = Config(str(PROJECT_ROOT / "db" / "alembic.ini"))
    config.attributes["database_url"] = test_database_url
    return config


@pytest.fixture(scope="session")
def engine(alembic_config, test_database_url):
    command.upgrade(alembic_config, "head")
    engine = create_engine(test_database_url)
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
