"""Consultas SQL da API, todas sobre a visão materializada dados.preco_medio_mensal.

A visão guarda a média de cada município por mês. Para agregar (UF, Brasil),
a média é PONDERADA pelo número de coletas:

    soma(preco_medio x qtd_coletas) / soma(qtd_coletas)

Isso é igual à média de todas as coletas. A média simples das médias daria
o mesmo peso a uma cidade com 3 coletas e a outra com 3 mil.
"""

import unicodedata
from dataclasses import dataclass
from datetime import date
from typing import Literal

from sqlalchemy import Connection, text

VIEW = "dados.preco_medio_mensal"
WEIGHTED_AVG = "ROUND(SUM(v.preco_medio * v.qtd_coletas) / SUM(v.qtd_coletas), 3)"
ETANOL_LIMIT = 0.70


@dataclass(frozen=True)
class Filters:
    """Filtros opcionais aplicados sobre a visão (alias "v")."""

    produto_id: int | None = None
    estado_id: int | None = None
    municipio_id: int | None = None
    inicio: date | None = None
    fim: date | None = None

    def where(self) -> tuple[str, dict]:
        """Monta o WHERE só com os filtros informados (valores sempre como parâmetros)."""
        clauses, params = [], {}
        for column, value, operator in [
            ("produto_id", self.produto_id, "="),
            ("estado_id", self.estado_id, "="),
            ("municipio_id", self.municipio_id, "="),
            ("mes", self.inicio, ">="),
            ("mes", self.fim, "<="),
        ]:
            if value is not None:
                name = f"p_{len(params)}"
                clauses.append(f"v.{column} {operator} :{name}")
                params[name] = value
        return " AND ".join(clauses) or "TRUE", params


def product_code(nome: str) -> str:
    """'DIESEL S10' -> 'diesel-s10' (código amigável para URLs)."""
    text_ = unicodedata.normalize("NFKD", nome)
    text_ = "".join(c for c in text_ if not unicodedata.combining(c))
    return "-".join(text_.lower().split())


# --- Catálogos ---------------------------------------------------------------

def list_products(conn: Connection) -> list[dict]:
    rows = conn.execute(text("SELECT id, nome, unidade_medida FROM dados.produto ORDER BY nome"))
    return [
        {"id": r.id, "codigo": product_code(r.nome), "nome": r.nome, "unidade": r.unidade_medida}
        for r in rows
    ]


def find_product(conn: Connection, codigo: str) -> dict | None:
    return next((p for p in list_products(conn) if p["codigo"] == codigo.lower()), None)


def list_states(conn: Connection) -> list[dict]:
    rows = conn.execute(
        text(
            "SELECT e.sigla, e.nome, r.nome AS regiao FROM dados.estado e "
            "JOIN dados.regiao r ON r.id = e.regiao_id ORDER BY e.nome"
        )
    )
    return [dict(r._mapping) for r in rows]


def find_state_id(conn: Connection, sigla: str) -> int | None:
    return conn.execute(
        text("SELECT id FROM dados.estado WHERE sigla = :sigla"), {"sigla": sigla.upper()}
    ).scalar()


def list_cities(conn: Connection, estado_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            "SELECT m.id, m.nome, e.sigla AS uf FROM dados.municipio m "
            "JOIN dados.estado e ON e.id = m.estado_id "
            "WHERE m.estado_id = :estado_id ORDER BY m.nome"
        ),
        {"estado_id": estado_id},
    )
    return [dict(r._mapping) for r in rows]


def find_city(conn: Connection, municipio_id: int) -> dict | None:
    row = conn.execute(
        text("SELECT id, estado_id FROM dados.municipio WHERE id = :id"), {"id": municipio_id}
    ).first()
    return dict(row._mapping) if row else None


# --- Preços ------------------------------------------------------------------

def summary(conn: Connection, filters: Filters) -> list[dict]:
    """Preço médio do mês mais recente de cada produto e do mês anterior a ele."""
    where, params = filters.where()
    rows = conn.execute(
        text(
            f"""
            WITH mensal AS (
                SELECT v.produto_id, v.mes, {WEIGHTED_AVG} AS preco_medio,
                       SUM(v.qtd_coletas) AS qtd_coletas
                FROM {VIEW} v
                WHERE {where}
                GROUP BY v.produto_id, v.mes
            ), numerado AS (
                SELECT *, ROW_NUMBER() OVER (PARTITION BY produto_id ORDER BY mes DESC) AS n
                FROM mensal
            )
            SELECT p.nome, p.unidade_medida, atual.mes, atual.preco_medio, atual.qtd_coletas,
                   anterior.mes AS mes_anterior, anterior.preco_medio AS preco_anterior
            FROM numerado atual
            JOIN dados.produto p ON p.id = atual.produto_id
            LEFT JOIN numerado anterior
                   ON anterior.produto_id = atual.produto_id AND anterior.n = 2
            WHERE atual.n = 1
            ORDER BY p.nome
            """
        ),
        params,
    )
    result = []
    for r in rows:
        item = {
            "produto": product_code(r.nome),
            "nome": r.nome,
            "unidade": r.unidade_medida,
            "mes": r.mes,
            "preco_medio": float(r.preco_medio),
            "qtd_coletas": r.qtd_coletas,
            "mes_anterior": r.mes_anterior,
            "preco_anterior": None,
            "variacao": None,
            "variacao_percentual": None,
        }
        if r.preco_anterior is not None:
            atual, anterior = float(r.preco_medio), float(r.preco_anterior)
            item["preco_anterior"] = anterior
            item["variacao"] = round(atual - anterior, 3)
            item["variacao_percentual"] = round((atual - anterior) / anterior * 100, 2)
        result.append(item)
    return result


def series(conn: Connection, filters: Filters) -> list[dict]:
    where, params = filters.where()
    rows = conn.execute(
        text(
            f"""
            SELECT v.mes, {WEIGHTED_AVG} AS preco_medio,
                   MIN(v.preco_min) AS preco_min, MAX(v.preco_max) AS preco_max,
                   SUM(v.qtd_coletas) AS qtd_coletas
            FROM {VIEW} v
            WHERE {where}
            GROUP BY v.mes
            ORDER BY v.mes
            """
        ),
        params,
    )
    return [
        {
            "mes": r.mes,
            "preco_medio": float(r.preco_medio),
            "preco_min": float(r.preco_min),
            "preco_max": float(r.preco_max),
            "qtd_coletas": r.qtd_coletas,
        }
        for r in rows
    ]


def latest_month(conn: Connection, produto_id: int) -> date | None:
    return conn.execute(
        text(f"SELECT MAX(v.mes) FROM {VIEW} v WHERE v.produto_id = :p"), {"p": produto_id}
    ).scalar()


def ranking(
    conn: Connection,
    produto_id: int,
    mes: date,
    nivel: Literal["uf", "municipio"],
    ordem: Literal["asc", "desc"],
    limite: int,
    estado_id: int | None = None,
    min_coletas: int = 1,
) -> list[dict]:
    """Ranking do mês informado. Municípios precisam de um mínimo de coletas."""
    direction = "ASC" if ordem == "asc" else "DESC"  # nunca vem do usuário direto
    params = {"p": produto_id, "mes": mes, "limite": limite}
    if nivel == "uf":
        sql = f"""
            SELECT e.nome, e.sigla AS uf, NULL AS municipio_id,
                   {WEIGHTED_AVG} AS preco_medio, SUM(v.qtd_coletas) AS qtd_coletas
            FROM {VIEW} v
            JOIN dados.estado e ON e.id = v.estado_id
            WHERE v.produto_id = :p AND v.mes = :mes
            GROUP BY e.nome, e.sigla
            ORDER BY preco_medio {direction}, e.sigla
            LIMIT :limite
        """
    else:
        state_filter = ""
        if estado_id is not None:
            state_filter = "AND v.estado_id = :estado_id"
            params["estado_id"] = estado_id
        params["min_coletas"] = min_coletas
        sql = f"""
            SELECT m.nome, e.sigla AS uf, m.id AS municipio_id,
                   {WEIGHTED_AVG} AS preco_medio, SUM(v.qtd_coletas) AS qtd_coletas
            FROM {VIEW} v
            JOIN dados.municipio m ON m.id = v.municipio_id
            JOIN dados.estado e ON e.id = v.estado_id
            WHERE v.produto_id = :p AND v.mes = :mes {state_filter}
            GROUP BY m.id, m.nome, e.sigla
            HAVING SUM(v.qtd_coletas) >= :min_coletas
            ORDER BY preco_medio {direction}, m.nome
            LIMIT :limite
        """
    rows = conn.execute(text(sql), params)
    return [
        {
            "posicao": position,
            "nome": r.nome,
            "uf": r.uf,
            "municipio_id": r.municipio_id,
            "preco_medio": float(r.preco_medio),
            "qtd_coletas": r.qtd_coletas,
        }
        for position, r in enumerate(rows, start=1)
    ]


def recommend_fuel(preco_etanol: float, preco_gasolina: float) -> tuple[float, str]:
    """Regra dos 70%: o etanol compensa se custar até 70% do preço da gasolina.

    (O etanol rende cerca de 70% da gasolina por litro.)
    A razão é arredondada antes de comparar: em ponto flutuante, 4,90 / 7,00
    dá 0,7000000000000001, o que faria o caso "exatamente 70%" falhar.
    """
    ratio = round(preco_etanol / preco_gasolina, 4)
    return ratio, "etanol" if ratio <= ETANOL_LIMIT else "gasolina"


def ethanol_vs_gasoline(conn: Connection, filters: Filters) -> dict | None:
    """Compara etanol e gasolina comum no mês mais recente em que ambos têm dados."""
    where, params = filters.where()
    row = conn.execute(
        text(
            f"""
            WITH mensal AS (
                SELECT p.nome, v.mes, {WEIGHTED_AVG} AS preco_medio
                FROM {VIEW} v
                JOIN dados.produto p ON p.id = v.produto_id
                WHERE p.nome IN ('ETANOL', 'GASOLINA') AND {where}
                GROUP BY p.nome, v.mes
            )
            SELECT e.mes, e.preco_medio AS etanol, g.preco_medio AS gasolina
            FROM mensal e
            JOIN mensal g ON g.mes = e.mes AND g.nome = 'GASOLINA'
            WHERE e.nome = 'ETANOL'
            ORDER BY e.mes DESC
            LIMIT 1
            """
        ),
        params,
    ).first()
    if row is None:
        return None
    etanol, gasolina = float(row.etanol), float(row.gasolina)
    ratio, recommendation = recommend_fuel(etanol, gasolina)
    return {
        "mes": row.mes,
        "preco_etanol": etanol,
        "preco_gasolina": gasolina,
        "razao": round(ratio, 4),
        "percentual": round(ratio * 100, 1),
        "limite": ETANOL_LIMIT,
        "recomendacao": recommendation,
    }


def meta(conn: Connection) -> dict:
    row = conn.execute(
        text(
            """
            SELECT
                (SELECT MAX(data_importacao) FROM dados.importacao WHERE status = 'sucesso')
                    AS ultima_importacao,
                (SELECT MIN(data_coleta) FROM dados.coleta_preco) AS primeira_coleta,
                (SELECT MAX(data_coleta) FROM dados.coleta_preco) AS ultima_coleta
            """
        )
    ).one()
    return dict(row._mapping)
