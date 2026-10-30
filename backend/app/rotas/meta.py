"""Informações sobre os dados (rodapé do site) e verificação de saúde."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from backend.app import consultas
from backend.app.database import get_connection
from backend.app.schemas import Meta

router = APIRouter(tags=["Sobre os dados"])
Conn = Annotated[Connection, Depends(get_connection)]

FONTE = (
    "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/"
    "serie-historica-de-precos-de-combustiveis"
)


@router.get("/meta", response_model=Meta, summary="Data da última atualização dos dados")
def meta(conn: Conn):
    return {**consultas.meta(conn), "fonte": FONTE}


@router.get("/saude", summary="Verifica se a API e o banco estão respondendo")
def saude(conn: Conn):
    conn.exec_driver_sql("SELECT 1")
    return {"status": "ok"}
