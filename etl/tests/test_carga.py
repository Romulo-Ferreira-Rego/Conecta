"""Testes da carga no banco de testes (cada teste é desfeito no final)."""

from decimal import Decimal

from sqlalchemy import text

from etl import carga

ARQUIVO = "teste/amostra.csv"


def scalar(conn, sql: str, **params):
    return conn.execute(text(sql), params).scalar()


def test_load_inserts_valid_rows(conn, cleaned):
    result = carga.load(conn, cleaned, ARQUIVO, size=123, sha256="a" * 64)

    assert result.rows_inserted == 4
    assert scalar(conn, "SELECT COUNT(*) FROM dados.coleta_preco WHERE importacao_id = :id", id=result.importacao_id) == 4
    importacao = conn.execute(
        text("SELECT status, linhas_lidas, linhas_inseridas, tamanho_bytes FROM dados.importacao WHERE id = :id"),
        {"id": result.importacao_id},
    ).one()
    assert tuple(importacao) == ("sucesso", 12, 4, 123)


def test_same_station_is_stored_once(conn, cleaned):
    carga.load(conn, cleaned, ARQUIVO, size=None, sha256=None)
    assert scalar(conn, "SELECT COUNT(*) FROM dados.revenda WHERE cnpj = '11.111.111/0001-11'") == 1
    assert scalar(
        conn,
        "SELECT COUNT(*) FROM dados.municipio m JOIN dados.estado e ON e.id = m.estado_id "
        "WHERE m.nome = 'SAO LUIS' AND e.sigla = 'MA'",
    ) == 1


def test_loading_twice_does_not_duplicate(conn, cleaned):
    """RF02: reimportar o mesmo arquivo não insere nada de novo."""
    carga.load(conn, cleaned, ARQUIVO, size=None, sha256=None)
    total = scalar(conn, "SELECT COUNT(*) FROM dados.coleta_preco")

    second = carga.load(conn, cleaned, ARQUIVO, size=None, sha256=None)

    assert second.rows_inserted == 0
    assert scalar(conn, "SELECT COUNT(*) FROM dados.coleta_preco") == total
    assert scalar(conn, "SELECT COUNT(*) FROM dados.importacao WHERE arquivo = :a", a=ARQUIVO) == 1


def test_station_keeps_most_recent_brand(conn, cleaned):
    carga.load(conn, cleaned, ARQUIVO, size=None, sha256=None)
    bandeira = scalar(
        conn,
        "SELECT b.nome FROM dados.revenda r JOIN dados.bandeira b ON b.id = r.bandeira_id "
        "WHERE r.cnpj = '11.111.111/0001-11'",
    )
    assert bandeira == "RAIZEN"


def test_view_shows_monthly_average_after_refresh(conn, cleaned):
    carga.load(conn, cleaned, ARQUIVO, size=None, sha256=None)
    carga.refresh_view(conn)
    media = scalar(
        conn,
        """
        SELECT v.preco_medio FROM dados.preco_medio_mensal v
        JOIN dados.produto p ON p.id = v.produto_id
        JOIN dados.estado e ON e.id = v.estado_id
        WHERE p.nome = 'GASOLINA' AND e.sigla = 'MA' AND v.mes = '2026-01-01'
        """,
    )
    assert media == Decimal("6.34")  # (6,29 + 6,39) / 2


def test_retention_deletes_only_old_collections(conn, cleaned):
    """Retenção: apaga coletas anteriores ao corte e mantém as demais."""
    from datetime import date

    result = carga.load(conn, cleaned, ARQUIVO, size=None, sha256=None)
    ids = {"id": result.importacao_id}
    # A amostra tem coletas em 02/01, 05/01 e 09/01/2026
    assert carga.count_older_than(conn, date(2026, 1, 5)) >= 2
    removed = carga.delete_older_than(conn, date(2026, 1, 5))
    assert removed >= 2
    restantes = conn.execute(
        text("SELECT MIN(data_coleta) FROM dados.coleta_preco WHERE importacao_id = :id"), ids
    ).scalar()
    assert restantes == date(2026, 1, 5)


def test_record_failure_marks_file_for_retry(engine):
    """Em caso de erro, o registro fica sem hash, para a próxima execução tentar de novo."""
    arquivo = "teste/falha.csv"
    try:
        carga.record_failure(engine, arquivo, size=999)
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT status, hash_sha256, tamanho_bytes FROM dados.importacao WHERE arquivo = :a"),
                {"a": arquivo},
            ).one()
        assert tuple(row) == ("erro", None, 999)
    finally:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM dados.importacao WHERE arquivo = :a"), {"a": arquivo})
