"""Referências geográficas do IBGE: lista de municípios e malhas para o mapa.

Uso (a partir da raiz do projeto):
    python -m etl.ibge             # baixa de novo tudo do IBGE (só quando algo mudar)
    python -m etl.ibge --vincular  # liga os municípios do banco aos códigos IBGE

`python -m etl.ibge` gera arquivos versionados no repositório, para o site não
depender do IBGE em tempo real:
- etl/referencias/municipios_ibge.json: código, UF e nome oficial de cada município.
- frontend/public/mapas/brasil.json: contorno das 27 UFs (TopoJSON).
- frontend/public/mapas/municipios/XX.json: municípios de cada UF (TopoJSON),
  baixados pelo site só quando o visitante abre aquele estado.

TopoJSON guarda cada fronteira uma única vez (dois vizinhos compartilham a linha),
por isso fica bem menor que GeoJSON.

A ANP identifica o município só pelo nome; o mapa identifica as formas pelo
código IBGE. `link_municipalities` faz a ponte comparando nomes normalizados.
A carga chama essa função a cada importação, então municípios novos são
ligados automaticamente.
"""

import argparse
import json
import logging
import unicodedata
from functools import cache
from pathlib import Path

import httpx
from sqlalchemy import Connection, create_engine, text

from db.connection import PROJECT_ROOT, get_database_url
from etl.fontes import USER_AGENT

log = logging.getLogger("etl")

API = "https://servicodados.ibge.gov.br/api"
MUNICIPIOS_URL = f"{API}/v1/localidades/municipios?view=nivelado"
ESTADOS_URL = f"{API}/v1/localidades/estados"
# "minima" é a malha mais simplificada: ideal para tela e leve para baixar.
MALHA_BRASIL_URL = f"{API}/v3/malhas/paises/BR?formato=application/json&intrarregiao=UF&qualidade=minima"
MALHA_UF_URL = f"{API}/v3/malhas/estados/{{uf}}?formato=application/json&intrarregiao=municipio&qualidade=minima"

LISTA_PATH = PROJECT_ROOT / "etl" / "referencias" / "municipios_ibge.json"
MAPAS_DIR = PROJECT_ROOT / "frontend" / "public" / "mapas"

# Grafias da ANP que não batem com o IBGE nem depois de normalizar: (UF, nome ANP) -> código.
APELIDOS = {
    ("RS", "SANTANA DO LIVRAMENTO"): 4317103,  # IBGE: Sant'Ana do Livramento
}


def name_key(nome: str) -> str:
    """Chave de comparação de nomes: maiúsculas, sem acentos, sem apóstrofos e hifens.

    A ANP escreve "SANTA BARBARA D OESTE" e o IBGE "Santa Bárbara d'Oeste";
    ambos viram "SANTA BARBARA D OESTE".
    """
    text = unicodedata.normalize("NFKD", nome)
    text = "".join(c for c in text if not unicodedata.combining(c)).upper()
    for char in "'’`´-":
        text = text.replace(char, " ")
    return " ".join(text.split())


@cache
def _codes_by_key() -> dict[tuple[str, str], int]:
    lista = json.loads(LISTA_PATH.read_text(encoding="utf-8"))
    codes = {(uf, name_key(nome)): codigo for codigo, uf, nome in lista}
    codes.update({(uf, name_key(nome)): codigo for (uf, nome), codigo in APELIDOS.items()})
    return codes


def find_code(uf: str, nome: str) -> int | None:
    """Código IBGE de um município pelo nome, ou None se não houver par."""
    return _codes_by_key().get((uf, name_key(nome)))


def link_municipalities(conn: Connection) -> int:
    """Preenche `codigo_ibge` dos municípios que ainda não têm. Devolve quantos foram ligados."""
    pending = conn.execute(
        text(
            "SELECT m.id, m.nome, e.sigla FROM dados.municipio m "
            "JOIN dados.estado e ON e.id = m.estado_id WHERE m.codigo_ibge IS NULL"
        )
    ).all()
    updates = []
    for row in pending:
        if (codigo := find_code(row.sigla, row.nome)) is not None:
            updates.append({"id": row.id, "codigo": codigo})
        else:
            log.warning("Município sem código IBGE (não aparece no mapa): %s/%s", row.nome, row.sigla)
    if updates:
        conn.execute(text("UPDATE dados.municipio SET codigo_ibge = :codigo WHERE id = :id"), updates)
    return len(updates)


def _get_json(client: httpx.Client, url: str):
    response = client.get(url)
    response.raise_for_status()
    return response.json()


def _name_geometries(topology: dict, names: dict[str, dict]) -> dict:
    """Troca as propriedades de cada forma (só `codarea`) pelas que o site usa."""
    for obj in topology["objects"].values():
        for geometry in obj["geometries"]:
            codigo = str(geometry["properties"]["codarea"])
            geometry["properties"] = names[codigo]
    return topology


def _write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    log.info("%s (%.0f KB)", path.relative_to(PROJECT_ROOT), path.stat().st_size / 1024)


def generate() -> None:
    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=120) as client:
        municipios = _get_json(client, MUNICIPIOS_URL)
        estados = _get_json(client, ESTADOS_URL)

        lista = sorted(
            [m["municipio-id"], m["UF-sigla"], m["municipio-nome"]] for m in municipios
        )
        _write(LISTA_PATH, lista)

        nomes_uf = {str(e["id"]): {"sigla": e["sigla"], "nome": e["nome"]} for e in estados}
        _write(MAPAS_DIR / "brasil.json", _name_geometries(_get_json(client, MALHA_BRASIL_URL), nomes_uf))

        nomes_municipio = {str(codigo): {"codigo": codigo, "nome": nome} for codigo, _, nome in lista}
        for estado in sorted(estados, key=lambda e: e["sigla"]):
            sigla = estado["sigla"]
            topology = _get_json(client, MALHA_UF_URL.format(uf=sigla))
            _write(MAPAS_DIR / "municipios" / f"{sigla}.json", _name_geometries(topology, nomes_municipio))

    log.info("%d municípios em %d UFs", len(lista), len(estados))


def main() -> None:
    parser = argparse.ArgumentParser(description="Referências geográficas do IBGE")
    parser.add_argument("--vincular", action="store_true", help="liga os municípios do banco aos códigos IBGE")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-7s %(message)s", datefmt="%H:%M:%S")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    if args.vincular:
        with create_engine(get_database_url()).begin() as conn:
            log.info("%d municípios ligados ao código IBGE", link_municipalities(conn))
    else:
        generate()


if __name__ == "__main__":
    main()
