"""Carga idempotente dos dados limpos no schema `dados`.

Estratégia:
1. Os dados limpos vão de uma vez para uma tabela temporária, via COPY
   (carga em massa do PostgreSQL, muito mais rápida que INSERT linha a linha).
2. A partir dela, comandos SQL "em conjunto" preenchem as dimensões
   (produto, bandeira, município, revenda) e a tabela fato (coleta_preco).
3. ON CONFLICT faz a carga ser idempotente: coletas já existentes são
   ignoradas (RF02) e dimensões existentes são reaproveitadas.

Tudo roda na conexão/transação recebida: quem chama decide quando confirmar.
"""

import logging
import math
from dataclasses import dataclass

from sqlalchemy import Connection, Engine, text

from etl.limpeza import CleanResult

log = logging.getLogger(__name__)

STAGING_COLUMNS = [
    "uf", "municipio", "revenda", "cnpj", "bairro", "cep", "bandeira",
    "produto", "unidade", "data_coleta", "valor_venda", "valor_compra",
]

CREATE_STAGING = """
    CREATE TEMP TABLE staging_coleta (
        uf            CHAR(2),
        municipio     TEXT,
        revenda       TEXT,
        cnpj          TEXT,
        bairro        TEXT,
        cep           TEXT,
        bandeira      TEXT,
        produto       TEXT,
        unidade       TEXT,
        data_coleta   DATE,
        valor_venda   NUMERIC(8,3),
        valor_compra  NUMERIC(8,3)
    ) ON COMMIT DROP
"""

UPSERT_IMPORTACAO = text(
    """
    INSERT INTO dados.importacao
        (arquivo, data_importacao, linhas_lidas, linhas_inseridas, status, tamanho_bytes, hash_sha256)
    VALUES (:arquivo, NOW(), :linhas_lidas, 0, 'sucesso', :tamanho, :hash)
    ON CONFLICT (arquivo) DO UPDATE SET
        data_importacao = EXCLUDED.data_importacao,
        linhas_lidas    = EXCLUDED.linhas_lidas,
        status          = EXCLUDED.status,
        tamanho_bytes   = EXCLUDED.tamanho_bytes,
        hash_sha256     = EXCLUDED.hash_sha256
    RETURNING id
    """
)

DIMENSION_STATEMENTS = [
    # Produtos novos (a unidade vem padronizada pela limpeza)
    """
    INSERT INTO dados.produto (nome, unidade_medida)
    SELECT DISTINCT produto, unidade FROM staging_coleta
    ON CONFLICT (nome) DO NOTHING
    """,
    """
    INSERT INTO dados.bandeira (nome)
    SELECT DISTINCT LEFT(bandeira, 80) FROM staging_coleta WHERE bandeira IS NOT NULL
    ON CONFLICT (nome) DO NOTHING
    """,
    """
    INSERT INTO dados.municipio (nome, estado_id)
    SELECT DISTINCT LEFT(s.municipio, 100), e.id
    FROM staging_coleta s
    JOIN dados.estado e ON e.sigla = s.uf
    ON CONFLICT (nome, estado_id) DO NOTHING
    """,
    # Uma linha por CNPJ, com os dados da coleta mais recente do arquivo
    # (um posto pode trocar de bandeira ao longo do semestre).
    """
    INSERT INTO dados.revenda (cnpj, razao_social, bairro, cep, municipio_id, bandeira_id)
    SELECT DISTINCT ON (s.cnpj)
        s.cnpj, LEFT(s.revenda, 150), LEFT(s.bairro, 100), s.cep, m.id, b.id
    FROM staging_coleta s
    JOIN dados.estado e    ON e.sigla = s.uf
    JOIN dados.municipio m ON m.nome = LEFT(s.municipio, 100) AND m.estado_id = e.id
    LEFT JOIN dados.bandeira b ON b.nome = LEFT(s.bandeira, 80)
    ORDER BY s.cnpj, s.data_coleta DESC
    ON CONFLICT (cnpj) DO UPDATE SET
        razao_social = EXCLUDED.razao_social,
        bairro       = EXCLUDED.bairro,
        cep          = EXCLUDED.cep,
        municipio_id = EXCLUDED.municipio_id,
        bandeira_id  = EXCLUDED.bandeira_id
    """,
]

INSERT_COLETAS = text(
    """
    INSERT INTO dados.coleta_preco
        (revenda_id, produto_id, data_coleta, valor_venda, valor_compra, importacao_id)
    SELECT r.id, p.id, s.data_coleta, s.valor_venda, s.valor_compra, :importacao_id
    FROM staging_coleta s
    JOIN dados.revenda r ON r.cnpj = s.cnpj
    JOIN dados.produto p ON p.nome = s.produto
    ON CONFLICT (revenda_id, produto_id, data_coleta) DO NOTHING
    """
)

UPDATE_INSERTED = text(
    "UPDATE dados.importacao SET linhas_inseridas = :inseridas WHERE id = :id"
)

RECORD_FAILURE = text(
    """
    INSERT INTO dados.importacao (arquivo, data_importacao, status, tamanho_bytes, hash_sha256)
    VALUES (:arquivo, NOW(), 'erro', :tamanho, NULL)
    ON CONFLICT (arquivo) DO UPDATE SET
        data_importacao = EXCLUDED.data_importacao,
        status          = 'erro',
        tamanho_bytes   = EXCLUDED.tamanho_bytes,
        hash_sha256     = NULL
    """
)


@dataclass(frozen=True)
class LoadResult:
    importacao_id: int
    rows_inserted: int


def _none_if_nan(value):
    """NaN (ausência de valor no pandas) vira NULL no banco."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return value


def _copy_to_staging(conn: Connection, cleaned: CleanResult) -> None:
    conn.exec_driver_sql("DROP TABLE IF EXISTS staging_coleta")
    conn.exec_driver_sql(CREATE_STAGING)
    columns = ", ".join(STAGING_COLUMNS)
    cursor = conn.connection.dbapi_connection.cursor()
    with cursor.copy(f"COPY staging_coleta ({columns}) FROM STDIN") as copy:
        for row in cleaned.data[STAGING_COLUMNS].itertuples(index=False, name=None):
            copy.write_row([_none_if_nan(v) for v in row])


def load(conn: Connection, cleaned: CleanResult, arquivo: str, size: int | None, sha256: str | None) -> LoadResult:
    """Grava um arquivo já limpo. Não faz commit nem atualiza a visão."""
    importacao_id = conn.execute(
        UPSERT_IMPORTACAO,
        {"arquivo": arquivo, "linhas_lidas": cleaned.rows_read, "tamanho": size, "hash": sha256},
    ).scalar_one()

    _copy_to_staging(conn, cleaned)
    for statement in DIMENSION_STATEMENTS:
        conn.exec_driver_sql(statement)

    inserted = conn.execute(INSERT_COLETAS, {"importacao_id": importacao_id}).rowcount
    conn.execute(UPDATE_INSERTED, {"inseridas": inserted, "id": importacao_id})
    return LoadResult(importacao_id=importacao_id, rows_inserted=inserted)


def record_failure(engine: Engine, arquivo: str, size: int | None) -> None:
    """Registra o erro em uma transação própria (a da carga foi desfeita).

    O hash fica vazio para que a próxima execução tente o arquivo de novo.
    """
    with engine.begin() as conn:
        conn.execute(RECORD_FAILURE, {"arquivo": arquivo, "tamanho": size})


def refresh_view(conn: Connection) -> None:
    """Recalcula as médias mensais sem bloquear quem está lendo a visão."""
    conn.exec_driver_sql("REFRESH MATERIALIZED VIEW CONCURRENTLY dados.preco_medio_mensal")
