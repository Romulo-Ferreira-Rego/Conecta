"""Cria o schema "dados" com as tabelas da ANP e seus índices.

Revision ID: 0001
Revises:
Create Date: 2026-10-30

Modelo da seção 6.2 do CLAUDE.md, com ajustes:
- importacao ganhou tamanho_bytes, hash_sha256 e modificado_em, para o job
  automático (RF13) detectar arquivos republicados pela ANP;
- datas com fuso (TIMESTAMPTZ), pois o job roda em UTC no GitHub Actions;
- CHECKs simples para barrar valores inválidos já no banco.
"""

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

STATEMENTS = [
    "CREATE SCHEMA dados",
    # --- Dimensões ---
    """
    CREATE TABLE dados.regiao (
        id      SERIAL PRIMARY KEY,
        sigla   VARCHAR(2) UNIQUE NOT NULL,
        nome    VARCHAR(30) NOT NULL
    )
    """,
    """
    CREATE TABLE dados.estado (
        id         SERIAL PRIMARY KEY,
        sigla      CHAR(2) UNIQUE NOT NULL,
        nome       VARCHAR(50) NOT NULL,
        regiao_id  INT NOT NULL REFERENCES dados.regiao(id)
    )
    """,
    """
    CREATE TABLE dados.municipio (
        id         SERIAL PRIMARY KEY,
        nome       VARCHAR(100) NOT NULL,
        estado_id  INT NOT NULL REFERENCES dados.estado(id),
        UNIQUE (nome, estado_id)
    )
    """,
    """
    CREATE TABLE dados.produto (
        id              SERIAL PRIMARY KEY,
        nome            VARCHAR(50) UNIQUE NOT NULL,
        unidade_medida  VARCHAR(20) NOT NULL
    )
    """,
    """
    CREATE TABLE dados.bandeira (
        id    SERIAL PRIMARY KEY,
        nome  VARCHAR(80) UNIQUE NOT NULL
    )
    """,
    """
    CREATE TABLE dados.revenda (
        id            SERIAL PRIMARY KEY,
        cnpj          VARCHAR(18) UNIQUE NOT NULL,
        razao_social  VARCHAR(150) NOT NULL,
        bairro        VARCHAR(100),
        cep           VARCHAR(9),
        municipio_id  INT NOT NULL REFERENCES dados.municipio(id),
        bandeira_id   INT REFERENCES dados.bandeira(id)
    )
    """,
    # --- Controle do ETL (antes de coleta_preco, que a referencia) ---
    """
    CREATE TABLE dados.importacao (
        id                SERIAL PRIMARY KEY,
        arquivo           VARCHAR(100) UNIQUE NOT NULL,
        data_importacao   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        linhas_lidas      INT,
        linhas_inseridas  INT,
        status            VARCHAR(20) NOT NULL
                          CHECK (status IN ('sucesso', 'erro')),
        tamanho_bytes     BIGINT,
        hash_sha256       CHAR(64),
        modificado_em     TIMESTAMPTZ
    )
    """,
    # --- Fato ---
    """
    CREATE TABLE dados.coleta_preco (
        id             BIGSERIAL PRIMARY KEY,
        revenda_id     INT NOT NULL REFERENCES dados.revenda(id),
        produto_id     INT NOT NULL REFERENCES dados.produto(id),
        data_coleta    DATE NOT NULL,
        valor_venda    NUMERIC(8,3) NOT NULL CHECK (valor_venda > 0),
        valor_compra   NUMERIC(8,3) CHECK (valor_compra > 0),
        importacao_id  INT NOT NULL REFERENCES dados.importacao(id),
        UNIQUE (revenda_id, produto_id, data_coleta)
    )
    """,
    # --- Índices (seção 6.3) ---
    "CREATE INDEX idx_coleta_data ON dados.coleta_preco (data_coleta)",
    "CREATE INDEX idx_coleta_produto ON dados.coleta_preco (produto_id, data_coleta)",
    # Acelera os JOINs da visão materializada e as buscas por município
    "CREATE INDEX idx_revenda_municipio ON dados.revenda (municipio_id)",
]


def upgrade() -> None:
    for statement in STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    op.execute("DROP SCHEMA dados CASCADE")
