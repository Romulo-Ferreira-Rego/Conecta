"""Testes da estrutura do banco criada pelas migrações (etapa 2)."""

from datetime import date
from decimal import Decimal

import pytest
from alembic import command
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

EXPECTED_TABLES = {
    "regiao",
    "estado",
    "municipio",
    "produto",
    "bandeira",
    "revenda",
    "importacao",
    "coleta_preco",
}

INSERT_COLETA = text(
    """
    INSERT INTO dados.coleta_preco
        (revenda_id, produto_id, data_coleta, valor_venda, importacao_id)
    VALUES (:revenda, :produto, :data, :valor, :importacao)
    """
)


def test_tables_exist_in_dados_schema(engine):
    tables = set(inspect(engine).get_table_names(schema="dados"))
    assert tables == EXPECTED_TABLES


def test_materialized_view_exists(engine):
    views = inspect(engine).get_materialized_view_names(schema="dados")
    assert "preco_medio_mensal" in views


def test_regions_and_states_loaded(conn):
    assert conn.execute(text("SELECT COUNT(*) FROM dados.regiao")).scalar() == 5
    assert conn.execute(text("SELECT COUNT(*) FROM dados.estado")).scalar() == 27


def test_state_names_keep_accents(conn):
    nome = conn.execute(
        text("SELECT nome FROM dados.estado WHERE sigla = 'SP'")
    ).scalar()
    assert nome == "São Paulo"


def test_duplicate_coleta_is_rejected(conn, sample_ids):
    """RF02: a mesma coleta (revenda, produto, data) não pode entrar duas vezes."""
    params = {**sample_ids, "data": date(2026, 1, 5), "valor": Decimal("6.299")}
    conn.execute(INSERT_COLETA, params)
    with pytest.raises(IntegrityError, match="coleta_preco_revenda_id_produto_id_data_coleta_key"):
        conn.execute(INSERT_COLETA, params)


def test_coleta_with_unknown_product_is_rejected(conn, sample_ids):
    params = {**sample_ids, "produto": -1, "data": date(2026, 1, 5), "valor": 6}
    with pytest.raises(IntegrityError, match="foreign key"):
        conn.execute(INSERT_COLETA, params)


def test_non_positive_price_is_rejected(conn, sample_ids):
    params = {**sample_ids, "data": date(2026, 1, 5), "valor": 0}
    with pytest.raises(IntegrityError, match="check constraint"):
        conn.execute(INSERT_COLETA, params)


def test_importacao_status_must_be_valid(conn):
    with pytest.raises(IntegrityError, match="check constraint"):
        conn.execute(
            text(
                "INSERT INTO dados.importacao (arquivo, status) "
                "VALUES ('x.csv', 'talvez')"
            )
        )


def test_view_refresh_computes_monthly_average(conn, sample_ids):
    """A visão agrega por mês e aceita o REFRESH CONCURRENTLY (sem travar leituras)."""
    for dia, valor in [(5, "6.000"), (20, "7.000")]:
        conn.execute(
            INSERT_COLETA,
            {**sample_ids, "data": date(2026, 1, dia), "valor": Decimal(valor)},
        )
    conn.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY dados.preco_medio_mensal"))

    row = conn.execute(
        text(
            "SELECT mes, preco_medio, preco_min, preco_max, qtd_coletas "
            "FROM dados.preco_medio_mensal WHERE produto_id = :produto"
        ),
        sample_ids,
    ).one()
    assert row.mes == date(2026, 1, 1)
    assert row.preco_medio == Decimal("6.5")
    assert (row.preco_min, row.preco_max) == (Decimal("6.000"), Decimal("7.000"))
    assert row.qtd_coletas == 2


def test_migrations_are_reversible(alembic_config, engine):
    """Desfazer tudo e reaplicar deve funcionar e voltar ao mesmo estado."""
    command.downgrade(alembic_config, "base")
    assert "dados" not in inspect(engine).get_schema_names()

    command.upgrade(alembic_config, "head")
    assert set(inspect(engine).get_table_names(schema="dados")) == EXPECTED_TABLES
