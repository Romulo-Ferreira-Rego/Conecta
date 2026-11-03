"""Adiciona o código IBGE aos municípios (usado pelo mapa interativo).

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-03

A ANP identifica o município só pelo nome. O mapa desenha as formas oficiais
do IBGE, identificadas pelo código de 7 dígitos (ex.: 2111300 = São Luís).
O ETL preenche a coluna comparando nomes (etl/ibge.py); municípios ainda sem
par ficam com NULL e simplesmente não aparecem pintados no mapa.

Depois de aplicar esta migração num banco que já tem dados, rode
`python -m etl.ibge --vincular` para preencher os municípios existentes.
"""

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE dados.municipio ADD COLUMN codigo_ibge INT UNIQUE")
    op.execute(
        "ALTER TABLE dados.municipio ADD CONSTRAINT ck_municipio_codigo_ibge "
        "CHECK (codigo_ibge BETWEEN 1000000 AND 9999999)"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE dados.municipio DROP COLUMN codigo_ibge")
