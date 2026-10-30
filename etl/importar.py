"""Importa arquivos específicos da ANP.

Uso (a partir da raiz do projeto):
    python -m etl.importar dsas/ca/ca-2026-01.zip
    python -m etl.importar dsan/2026/09-dados-abertos-precos-2026-09-gasolina-etanol.csv

O nome é o caminho do arquivo no site da ANP (após /arquivos/shpc/), como
aparece em dados.importacao. Se o arquivo ainda não estiver em etl/data/raw/,
ele é baixado. Para descobrir e importar automaticamente o que mudou, use
`python -m etl.atualizar`.
"""

import argparse
import logging
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import Engine, create_engine

from db.connection import get_database_url
from etl import carga
from etl.download import download, file_hash, local_path
from etl.extracao import read_raw
from etl.fontes import FILES_BASE_URL, new_client
from etl.limpeza import clean

log = logging.getLogger("etl")


@dataclass
class ImportResult:
    name: str
    rows_read: int
    rows_valid: int
    rows_inserted: int
    discarded: dict[str, int] = field(default_factory=dict)
    seconds: float = 0.0


def configure_logging(verbose: bool = False) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)


def get_engine() -> Engine:
    return create_engine(get_database_url())


def import_file(engine: Engine, name: str, path: Path, size: int | None, sha256: str | None) -> ImportResult:
    """Lê, limpa e carrega um arquivo em uma única transação."""
    started = time.perf_counter()
    log.info("Importando %s", name)
    try:
        cleaned = clean(read_raw(path))
        cleaned.check_quality()
        with engine.begin() as conn:
            loaded = carga.load(conn, cleaned, name, size, sha256)
    except Exception:
        log.exception("Falha ao importar %s; nada foi gravado.", name)
        carga.record_failure(engine, name, size)
        raise

    result = ImportResult(
        name=name,
        rows_read=cleaned.rows_read,
        rows_valid=cleaned.rows_valid,
        rows_inserted=loaded.rows_inserted,
        discarded=cleaned.discarded,
        seconds=time.perf_counter() - started,
    )
    log.info(
        "%s: %d lidas, %d válidas, %d inseridas (%.1fs)%s",
        name, result.rows_read, result.rows_valid, result.rows_inserted, result.seconds,
        f"; descartadas: {result.discarded}" if result.discarded else "",
    )
    return result


def refresh_view(engine: Engine) -> None:
    started = time.perf_counter()
    with engine.begin() as conn:
        carga.refresh_view(conn)
    log.info("Visão preco_medio_mensal atualizada (%.1fs)", time.perf_counter() - started)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Importa arquivos de preços da ANP.")
    parser.add_argument("arquivos", nargs="+", help="caminho no site da ANP, ex.: dsas/ca/ca-2026-01.zip")
    parser.add_argument("--baixar-novamente", action="store_true", help="baixa mesmo se já houver cópia local")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)
    configure_logging(args.verbose)

    engine = get_engine()
    failures = 0
    with new_client() as client:
        for name in args.arquivos:
            try:
                path = local_path(name)
                if args.baixar_novamente or not path.exists():
                    downloaded = download(client, FILES_BASE_URL + name, name)
                    size, sha256 = downloaded.size, downloaded.sha256
                else:
                    size, sha256 = path.stat().st_size, file_hash(path)
                import_file(engine, name, path, size, sha256)
            except Exception:
                failures += 1

    refresh_view(engine)
    if failures:
        log.error("%d arquivo(s) com erro.", failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
