"""Atualização automática dos dados da ANP (RF13).

Fluxo:
1. Lê a página de dados abertos da ANP e lista os arquivos de combustíveis.
2. Mantém só os da janela de interesse (padrão: últimos 24 meses). Arquivos
   mensais cujo mês já está coberto por um semestral são ignorados.
3. Compara com dados.importacao: importa arquivos novos, com erro anterior
   ou cujo tamanho no servidor mudou (a ANP republica arquivos).
4. Após baixar, compara o hash: se o conteúdo for igual, não reimporta.
5. Atualiza a visão preco_medio_mensal e termina com código 1 se houve erro
   (para o GitHub Actions marcar a execução como falha).

Uso (a partir da raiz do projeto):
    python -m etl.atualizar --dry-run           # só mostra o que faria
    python -m etl.atualizar                     # executa
    python -m etl.atualizar --desde 2025-01     # muda o início da janela
    python -m etl.atualizar --verificar-hash    # baixa e compara mesmo com tamanho igual
"""

import argparse
import logging
import sys
from dataclasses import dataclass
from datetime import date

from sqlalchemy import Engine, text

from etl.download import download, remote_size
from etl.fontes import DataFile, fetch_page, new_client, parse_page
from etl.importar import configure_logging, get_engine, import_file, refresh_view

log = logging.getLogger("etl")

DEFAULT_WINDOW_MONTHS = 24

NEW = "novo"
PREVIOUS_ERROR = "erro_anterior"
SIZE_CHANGED = "tamanho_mudou"
SIZE_UNKNOWN = "tamanho_desconhecido"
CHECK_HASH = "verificar_hash"


@dataclass(frozen=True)
class ImportedFile:
    size: int | None
    sha256: str | None
    status: str


def months_ago(today: date, months: int) -> date:
    """Primeiro dia do mês, `months` meses antes de `today`."""
    index = today.year * 12 + (today.month - 1) - months
    return date(index // 12, index % 12 + 1, 1)


def select_candidates(files: list[DataFile], since: date) -> list[DataFile]:
    """Arquivos da janela, sem mensais já cobertos por um semestral."""
    in_window = [f for f in files if f.end >= since]
    semesters = [f for f in in_window if f.kind == "semestral"]
    return [
        f
        for f in in_window
        if f.kind == "semestral" or not any(s.covers_month(f.start) for s in semesters)
    ]


def reason_to_import(
    previous: ImportedFile | None, size_now: int | None, check_hash: bool
) -> str | None:
    """Motivo para (re)importar o arquivo, ou None se nada mudou."""
    if previous is None:
        return NEW
    if previous.status != "sucesso" or previous.sha256 is None:
        return PREVIOUS_ERROR
    if size_now is None:
        return SIZE_UNKNOWN
    if size_now != previous.size:
        return SIZE_CHANGED
    if check_hash:
        return CHECK_HASH
    return None


def load_imported(engine: Engine) -> dict[str, ImportedFile]:
    with engine.connect() as conn:
        rows = conn.execute(
            text("SELECT arquivo, tamanho_bytes, hash_sha256, status FROM dados.importacao")
        )
        return {r.arquivo: ImportedFile(r.tamanho_bytes, r.hash_sha256, r.status) for r in rows}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Baixa e importa os dados novos ou atualizados da ANP.")
    parser.add_argument("--dry-run", action="store_true", help="só mostra o que seria baixado")
    parser.add_argument("--desde", help="início da janela no formato AAAA-MM (padrão: 24 meses atrás)")
    parser.add_argument("--verificar-hash", action="store_true", help="baixa e compara o hash mesmo com tamanho igual")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args(argv)
    configure_logging(args.verbose)

    if args.desde:
        year, month = map(int, args.desde.split("-"))
        since = date(year, month, 1)
    else:
        since = months_ago(date.today(), DEFAULT_WINDOW_MONTHS)

    engine = get_engine()
    imported = load_imported(engine)

    with new_client() as client:
        files = parse_page(fetch_page(client))
        if not files:
            log.error("Nenhum arquivo encontrado na página da ANP: o layout pode ter mudado.")
            return 1
        candidates = select_candidates(files, since)
        log.info(
            "%d arquivos na página; %d na janela desde %s.",
            len(files), len(candidates), since.strftime("%m/%Y"),
        )

        planned: list[tuple[DataFile, str]] = []
        for data_file in candidates:
            previous = imported.get(data_file.name)
            reason = reason_to_import(previous, remote_size(client, data_file.url), args.verificar_hash)
            if reason:
                planned.append((data_file, reason))
            else:
                log.debug("Sem mudanças: %s", data_file.name)

        if not planned:
            log.info("Nada novo para importar.")
            return 0
        for data_file, reason in planned:
            log.info("%s %s (%s)", "Baixaria" if args.dry_run else "Vai importar", data_file.name, reason)
        if args.dry_run:
            return 0

        failures = 0
        changed = False
        for data_file, reason in planned:
            try:
                downloaded = download(client, data_file.url, data_file.name)
                previous = imported.get(data_file.name)
                if previous and previous.status == "sucesso" and previous.sha256 == downloaded.sha256:
                    log.info("Conteúdo igual ao já importado: %s", data_file.name)
                    continue
                import_file(engine, data_file.name, downloaded.path, downloaded.size, downloaded.sha256)
                changed = True
            except Exception:
                failures += 1

    if changed:
        refresh_view(engine)
    if failures:
        log.error("%d arquivo(s) com erro. Os dados anteriores continuam no banco.", failures)
        return 1
    log.info("Atualização concluída.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
