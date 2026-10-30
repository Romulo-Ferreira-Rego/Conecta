"""Listas usadas para montar os filtros do painel."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Connection

from backend.app import consultas
from backend.app.database import get_connection
from backend.app.rotas.filtros import require_state
from backend.app.schemas import Estado, Municipio, Produto

router = APIRouter(tags=["Catálogo"])
Conn = Annotated[Connection, Depends(get_connection)]


@router.get("/produtos", response_model=list[Produto], summary="Lista os produtos")
def produtos(conn: Conn):
    return consultas.list_products(conn)


@router.get("/estados", response_model=list[Estado], summary="Lista as 27 UFs")
def estados(conn: Conn):
    return consultas.list_states(conn)


@router.get("/municipios", response_model=list[Municipio], summary="Municípios de uma UF com coletas")
def municipios(
    conn: Conn,
    uf: Annotated[str, Query(pattern=r"^[A-Za-z]{2}$", description="Sigla da UF", examples=["MA"])],
):
    return consultas.list_cities(conn, require_state(conn, uf))
