"""Cria a visão materializada preco_medio_mensal usada pelos gráficos.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-30

A visão guarda as médias mensais já calculadas, evitando varrer milhões de
linhas de coleta_preco a cada requisição (RNF02). O índice único permite
"REFRESH MATERIALIZED VIEW CONCURRENTLY", que atualiza a visão sem bloquear
leituras: o site continua respondendo enquanto o job de importação roda.
"""

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE MATERIALIZED VIEW dados.preco_medio_mensal AS
        SELECT
            date_trunc('month', c.data_coleta)::date AS mes,
            c.produto_id,
            m.estado_id,
            r.municipio_id,
            AVG(c.valor_venda)  AS preco_medio,
            MIN(c.valor_venda)  AS preco_min,
            MAX(c.valor_venda)  AS preco_max,
            COUNT(*)            AS qtd_coletas
        FROM dados.coleta_preco c
        JOIN dados.revenda r   ON r.id = c.revenda_id
        JOIN dados.municipio m ON m.id = r.municipio_id
        GROUP BY 1, 2, 3, 4
        """
    )
    # Produto primeiro: toda consulta do painel filtra por produto.
    op.execute(
        """
        CREATE UNIQUE INDEX uq_preco_medio_mensal
        ON dados.preco_medio_mensal (produto_id, mes, estado_id, municipio_id)
        """
    )


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW dados.preco_medio_mensal")
