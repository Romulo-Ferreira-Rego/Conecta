"""Leitura dos arquivos da ANP (CSV puro ou CSV dentro de ZIP) para DataFrame."""

import io
import logging
import zipfile
from pathlib import Path

import pandas as pd

log = logging.getLogger(__name__)

ZIP_MAGIC = b"PK\x03\x04"
ENCODINGS = ("utf-8-sig", "latin-1")


class ExtractionError(Exception):
    pass


def _csv_bytes_from_zip(data: bytes) -> bytes:
    """Lê o único CSV de dentro do ZIP, em memória (sem extrair para o disco)."""
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        members = [m for m in archive.infolist() if not m.is_dir()]
        if len(members) != 1:
            names = [m.filename for m in members]
            raise ExtractionError(f"Esperado 1 arquivo dentro do ZIP, encontrados: {names}")
        return archive.read(members[0])


def read_raw(path: Path) -> pd.DataFrame:
    """Lê o arquivo como texto (dtype=str): a conversão de tipos é feita na limpeza.

    O formato é detectado pelo conteúdo, não pela extensão, porque a ANP
    publica alguns arquivos sem extensão.
    """
    data = path.read_bytes()
    if data.startswith(ZIP_MAGIC):
        data = _csv_bytes_from_zip(data)

    for encoding in ENCODINGS:
        try:
            text = data.decode(encoding)
            break
        except UnicodeDecodeError:
            log.info("%s não está em %s; tentando o próximo encoding.", path.name, encoding)
    else:  # latin-1 aceita qualquer byte, mas mantemos a proteção
        raise ExtractionError(f"Encoding não reconhecido em {path.name}")

    return pd.read_csv(
        io.StringIO(text),
        sep=";",
        dtype=str,
        keep_default_na=False,  # células vazias viram "" (tratadas na limpeza)
    )
