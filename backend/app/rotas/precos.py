"""Preços: resumo dos cards, série temporal, rankings e etanol x gasolina."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Connection

from backend.app import consultas
from backend.app.config import Settings, get_settings
from backend.app.database import get_connection
from backend.app.rotas.filtros import (
    MesParam,
    MunicipioParam,
    ProdutoOpcional,
    ProdutoParam,
    UfParam,
    build_filters,
    require_product,
    require_state,
)
from backend.app.schemas import EtanolGasolina, Mapa, Ranking, Resumo, Serie

router = APIRouter(tags=["Preços"])
Conn = Annotated[Connection, Depends(get_connection)]


@router.get(
    "/resumo",
    response_model=list[Resumo],
    summary="Preço médio atual e variação (cards)",
    description="Preço médio do mês mais recente e variação em relação ao mês anterior. "
    "Sem `produto`, devolve todos os produtos.",
)
def resumo(conn: Conn, produto: ProdutoOpcional = None, uf: UfParam = None, municipio: MunicipioParam = None):
    filters = build_filters(conn, produto=produto, uf=uf, municipio=municipio)
    return consultas.summary(conn, filters)


@router.get("/serie", response_model=Serie, summary="Série mensal do preço médio")
def serie(
    conn: Conn,
    produto: ProdutoParam,
    uf: UfParam = None,
    municipio: MunicipioParam = None,
    inicio: MesParam = None,
    fim: MesParam = None,
):
    filters = build_filters(conn, produto=produto, uf=uf, municipio=municipio, inicio=inicio, fim=fim)
    info = require_product(conn, produto)
    return {"produto": info["codigo"], "unidade": info["unidade"], "pontos": consultas.series(conn, filters)}


@router.get(
    "/ranking",
    response_model=Ranking,
    summary="Ranking de UFs ou municípios mais caros/baratos",
    description="Usa o mês mais recente. No nível município, entram só cidades com o mínimo "
    "de coletas no mês (evita distorções por amostras pequenas); `uf` restringe a um estado.",
)
def ranking(
    conn: Conn,
    produto: ProdutoParam,
    settings: Annotated[Settings, Depends(get_settings)],
    nivel: Literal["uf", "municipio"] = "uf",
    ordem: Literal["asc", "desc"] = "desc",
    limite: Annotated[int, Query(ge=1, le=50)] = 10,
    uf: UfParam = None,
):
    info = require_product(conn, produto)
    estado_id = require_state(conn, uf) if uf else None
    mes = consultas.latest_month(conn, info["id"])
    itens = []
    if mes is not None:
        itens = consultas.ranking(
            conn, info["id"], mes, nivel, ordem, limite,
            estado_id=estado_id, min_coletas=settings.ranking_min_coletas,
        )
    return {"produto": info["codigo"], "nivel": nivel, "ordem": ordem, "mes": mes, "itens": itens}


@router.get(
    "/mapa",
    response_model=Mapa,
    summary="Preço médio por UF ou por município (mapa)",
    description="Usa o mês mais recente. Sem `uf`, devolve as UFs; com `uf`, todos os "
    "municípios com coletas naquele estado. Municípios sem coletas não aparecem na lista.",
)
def mapa(
    conn: Conn,
    produto: ProdutoParam,
    settings: Annotated[Settings, Depends(get_settings)],
    uf: UfParam = None,
):
    info = require_product(conn, produto)
    estado_id = require_state(conn, uf) if uf else None
    mes = consultas.latest_month(conn, info["id"])
    mes_anterior = consultas.previous_month(conn, info["id"], mes) if mes else None
    itens = consultas.map_prices(conn, info["id"], mes, mes_anterior, estado_id) if mes else []
    return {
        "produto": info["codigo"],
        "unidade": info["unidade"],
        "nivel": "municipio" if uf else "uf",
        "uf": uf.upper() if uf else None,
        "mes": mes,
        "mes_anterior": mes_anterior,
        "min_coletas": settings.ranking_min_coletas,
        "itens": itens,
    }


@router.get(
    "/etanol-gasolina",
    response_model=EtanolGasolina | None,
    summary="Etanol ou gasolina? (regra dos 70%)",
    description="Compara os preços médios do mês mais recente. O etanol compensa quando custa "
    "até 70% da gasolina. Devolve `null` se não houver dados para o filtro.",
)
def etanol_gasolina(conn: Conn, uf: UfParam = None, municipio: MunicipioParam = None):
    filters = build_filters(conn, uf=uf, municipio=municipio)
    return consultas.ethanol_vs_gasoline(conn, filters)
