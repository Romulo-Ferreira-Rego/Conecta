"""Carrega as 5 regiões e as 27 unidades federativas do Brasil.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-30

São dados fixos: com eles prontos, o ETL só precisa localizar a UF de cada
linha do CSV pela sigla, em vez de criá-la.
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

REGIOES = [
    ("N", "Norte"),
    ("NE", "Nordeste"),
    ("CO", "Centro-Oeste"),
    ("SE", "Sudeste"),
    ("S", "Sul"),
]

# (sigla da UF, nome, sigla da região)
ESTADOS = [
    ("AC", "Acre", "N"),
    ("AP", "Amapá", "N"),
    ("AM", "Amazonas", "N"),
    ("PA", "Pará", "N"),
    ("RO", "Rondônia", "N"),
    ("RR", "Roraima", "N"),
    ("TO", "Tocantins", "N"),
    ("AL", "Alagoas", "NE"),
    ("BA", "Bahia", "NE"),
    ("CE", "Ceará", "NE"),
    ("MA", "Maranhão", "NE"),
    ("PB", "Paraíba", "NE"),
    ("PE", "Pernambuco", "NE"),
    ("PI", "Piauí", "NE"),
    ("RN", "Rio Grande do Norte", "NE"),
    ("SE", "Sergipe", "NE"),
    ("DF", "Distrito Federal", "CO"),
    ("GO", "Goiás", "CO"),
    ("MT", "Mato Grosso", "CO"),
    ("MS", "Mato Grosso do Sul", "CO"),
    ("ES", "Espírito Santo", "SE"),
    ("MG", "Minas Gerais", "SE"),
    ("RJ", "Rio de Janeiro", "SE"),
    ("SP", "São Paulo", "SE"),
    ("PR", "Paraná", "S"),
    ("RS", "Rio Grande do Sul", "S"),
    ("SC", "Santa Catarina", "S"),
]


def upgrade() -> None:
    conn = op.get_bind()
    conn.exec_driver_sql(
        "INSERT INTO dados.regiao (sigla, nome) VALUES (%s, %s)", REGIOES
    )
    conn.exec_driver_sql(
        """
        INSERT INTO dados.estado (sigla, nome, regiao_id)
        SELECT %s, %s, id FROM dados.regiao WHERE sigla = %s
        """,
        ESTADOS,
    )


def downgrade() -> None:
    op.execute("DELETE FROM dados.estado")
    op.execute("DELETE FROM dados.regiao")
