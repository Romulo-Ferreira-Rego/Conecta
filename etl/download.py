"""Download dos arquivos da ANP para etl/data/raw/, com tamanho e hash."""

import hashlib
import logging
from dataclasses import dataclass
from pathlib import Path

import httpx

log = logging.getLogger(__name__)

RAW_DIR = Path(__file__).resolve().parent / "data" / "raw"
CHUNK_SIZE = 1024 * 1024


@dataclass(frozen=True)
class DownloadedFile:
    path: Path
    size: int
    sha256: str


def local_path(name: str, raw_dir: Path = RAW_DIR) -> Path:
    """Caminho local que espelha o caminho do arquivo no site da ANP."""
    path = (raw_dir / name).resolve()
    if not path.is_relative_to(raw_dir.resolve()):
        raise ValueError(f"Nome de arquivo inválido: {name!r}")
    return path


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(CHUNK_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def remote_size(client: httpx.Client, url: str) -> int | None:
    """Tamanho do arquivo no servidor sem baixá-lo inteiro.

    O servidor da ANP recusa HEAD (403), então pedimos só o primeiro byte
    (Range) e lemos o total em "Content-Range: bytes 0-0/<total>".
    """
    try:
        response = client.get(url, headers={"Range": "bytes=0-0"})
        response.raise_for_status()
    except httpx.HTTPError as error:
        log.warning("Não foi possível consultar o tamanho de %s: %s", url, error)
        return None
    content_range = response.headers.get("Content-Range", "")
    if "/" in content_range:
        total = content_range.rsplit("/", 1)[1]
        return int(total) if total.isdigit() else None
    return None


def download(client: httpx.Client, url: str, name: str, raw_dir: Path = RAW_DIR) -> DownloadedFile:
    """Baixa o arquivo (sobrescrevendo a cópia local) e calcula seu hash."""
    path = local_path(name, raw_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    partial = path.with_name(path.name + ".part")
    digest = hashlib.sha256()
    size = 0
    with client.stream("GET", url) as response:
        response.raise_for_status()
        with partial.open("wb") as f:
            for chunk in response.iter_bytes(CHUNK_SIZE):
                f.write(chunk)
                digest.update(chunk)
                size += len(chunk)
    partial.replace(path)
    log.info("Baixado %s (%.1f MB)", name, size / 1e6)
    return DownloadedFile(path=path, size=size, sha256=digest.hexdigest())
