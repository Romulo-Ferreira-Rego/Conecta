"""Validação dos filtros comuns às rotas (produto, UF, município, período).

Filtros inexistentes geram 404 com mensagem em português, indicando onde
consultar os valores válidos.
"""

from datetime import date
from typing import Annotated

from fastapi import HTTPException, Query
from sqlalchemy import Connection

from backend.app import consultas

MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"

ProdutoParam = Annotated[
    str, Query(description="Código do produto (ver /api/produtos)", examples=["gasolina"])
]
ProdutoOpcional = Annotated[
    str | None, Query(description="Código do produto (ver /api/produtos); omita para todos")
]
UfParam = Annotated[
    str | None, Query(pattern=r"^[A-Za-z]{2}$", description="Sigla da UF", examples=["MA"])
]
MunicipioParam = Annotated[
    int | None, Query(gt=0, description="ID do município (ver /api/municipios)")
]
MesParam = Annotated[
    str | None, Query(pattern=MONTH_PATTERN, description="Mês no formato AAAA-MM", examples=["2026-01"])
]


def require_product(conn: Connection, codigo: str) -> dict:
    produto = consultas.find_product(conn, codigo)
    if produto is None:
        raise HTTPException(404, f"Produto '{codigo}' não encontrado. Veja os códigos em /api/produtos.")
    return produto


def require_state(conn: Connection, sigla: str) -> int:
    estado_id = consultas.find_state_id(conn, sigla)
    if estado_id is None:
        raise HTTPException(404, f"UF '{sigla.upper()}' não encontrada. Veja as siglas em /api/estados.")
    return estado_id


def require_city(conn: Connection, municipio_id: int) -> dict:
    municipio = consultas.find_city(conn, municipio_id)
    if municipio is None:
        raise HTTPException(404, f"Município {municipio_id} não encontrado. Veja os IDs em /api/municipios.")
    return municipio


def parse_month(value: str | None) -> date | None:
    if value is None:
        return None
    year, month = map(int, value.split("-"))
    return date(year, month, 1)


def build_filters(
    conn: Connection,
    *,
    produto: str | None = None,
    uf: str | None = None,
    municipio: int | None = None,
    inicio: str | None = None,
    fim: str | None = None,
) -> consultas.Filters:
    """Converte os parâmetros da URL nos IDs usados pelas consultas."""
    produto_id = require_product(conn, produto)["id"] if produto else None
    estado_id = require_state(conn, uf) if uf else None
    if municipio is not None:
        cidade = require_city(conn, municipio)
        if estado_id is not None and cidade["estado_id"] != estado_id:
            raise HTTPException(400, f"O município {municipio} não pertence à UF {uf.upper()}.")
    inicio_date, fim_date = parse_month(inicio), parse_month(fim)
    if inicio_date and fim_date and inicio_date > fim_date:
        raise HTTPException(400, "O início do período deve ser anterior ou igual ao fim.")
    return consultas.Filters(
        produto_id=produto_id,
        estado_id=estado_id,
        municipio_id=municipio,
        inicio=inicio_date,
        fim=fim_date,
    )
