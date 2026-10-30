"""Formato das respostas da API (também documentado automaticamente no /docs)."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class Produto(BaseModel):
    codigo: str = Field(examples=["diesel-s10"], description="Usado nos filtros (?produto=)")
    nome: str = Field(examples=["DIESEL S10"])
    unidade: str = Field(examples=["R$ / litro"])


class Estado(BaseModel):
    sigla: str = Field(examples=["MA"])
    nome: str = Field(examples=["Maranhão"])
    regiao: str = Field(examples=["Nordeste"])


class Municipio(BaseModel):
    id: int = Field(description="Usado nos filtros (?municipio=)")
    nome: str = Field(examples=["SAO LUIS"])
    uf: str = Field(examples=["MA"])


class Resumo(BaseModel):
    produto: str = Field(examples=["gasolina"])
    nome: str
    unidade: str
    mes: date = Field(description="Mês de referência (o mais recente com dados)")
    preco_medio: float
    qtd_coletas: int
    mes_anterior: date | None = None
    preco_anterior: float | None = None
    variacao: float | None = Field(None, description="Diferença em R$ para o mês anterior")
    variacao_percentual: float | None = None


class PontoSerie(BaseModel):
    mes: date
    preco_medio: float
    preco_min: float
    preco_max: float
    qtd_coletas: int


class Serie(BaseModel):
    produto: str
    unidade: str
    pontos: list[PontoSerie]


class ItemRanking(BaseModel):
    posicao: int
    nome: str
    uf: str
    municipio_id: int | None = None
    preco_medio: float
    qtd_coletas: int


class Ranking(BaseModel):
    produto: str
    nivel: Literal["uf", "municipio"]
    ordem: Literal["asc", "desc"]
    mes: date | None
    itens: list[ItemRanking]


class EtanolGasolina(BaseModel):
    mes: date
    preco_etanol: float
    preco_gasolina: float
    razao: float = Field(description="Preço do etanol dividido pelo da gasolina")
    percentual: float = Field(examples=[68.5])
    limite: float = Field(0.70, description="Abaixo deste valor, o etanol compensa")
    recomendacao: Literal["etanol", "gasolina"]


class Meta(BaseModel):
    ultima_importacao: datetime | None
    primeira_coleta: date | None = Field(description="Início dos dados disponíveis (limite do período personalizado)")
    ultima_coleta: date | None
    fonte: str
