"""Descoberta dos arquivos de preços publicados na página de dados abertos da ANP.

A ANP não segue um padrão fixo de nomes (há erros de digitação e arquivos sem
extensão), então os arquivos são descobertos lendo os links da página, e o
período de cada um vem do texto do link ("1º semestre de 2026", "Setembro de 2026").
"""

import logging
import re
import unicodedata
from dataclasses import dataclass
from datetime import date

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

PAGE_URL = (
    "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/"
    "serie-historica-de-precos-de-combustiveis"
)
FILES_MARKER = "/arquivos/shpc/"
FILES_BASE_URL = "https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos" + FILES_MARKER
USER_AGENT = "Mozilla/5.0 (compatible; Conecta-ETL; +https://github.com/Romulo-Ferreira-Rego/Conecta)"

MONTHS = {
    "janeiro": 1, "fevereiro": 2, "marco": 3, "abril": 4, "maio": 5, "junho": 6,
    "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12,
}

SEMESTER_RE = re.compile(r"([12])\D*semestre de (\d{4})")
MONTH_RE = re.compile(r"(" + "|".join(MONTHS) + r") de (\d{4})")


@dataclass(frozen=True)
class DataFile:
    """Um arquivo de preços da ANP.

    `name` é o caminho relativo após /arquivos/shpc/ (ex.: "dsas/ca/ca-2026-01.zip").
    É único (há arquivos com o mesmo nome em anos diferentes) e é o valor
    gravado em dados.importacao.arquivo.
    """

    url: str
    name: str
    kind: str  # "semestral" | "mensal"
    start: date  # primeiro dia do período coberto
    end: date  # primeiro dia do último mês coberto

    def covers_month(self, month: date) -> bool:
        return self.start <= month <= self.end


def _normalize(text: str) -> str:
    """Minúsculas, sem acentos e com espaços simples."""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return " ".join(text.lower().split())


def _parse_period(label: str) -> tuple[date, date] | None:
    label = _normalize(label)
    if match := SEMESTER_RE.search(label):
        semester, year = int(match[1]), int(match[2])
        first_month = 1 if semester == 1 else 7
        return date(year, first_month, 1), date(year, first_month + 5, 1)
    if match := MONTH_RE.search(label):
        month = date(int(match[2]), MONTHS[match[1]], 1)
        return month, month
    return None


def _classify(name: str) -> str | None:
    """Tipo do arquivo, ou None se estiver fora do escopo (ex.: GLP)."""
    lower = name.lower()
    if "glp" in lower:
        return None
    if lower.startswith("dsas/ca/"):
        return "semestral"
    if lower.startswith("dsan/") and ("gasolina-etanol" in lower or "diesel-gnv" in lower):
        return "mensal"
    return None


def parse_page(html: str | bytes) -> list[DataFile]:
    """Extrai da página os arquivos de combustíveis automotivos (sem GLP)."""
    soup = BeautifulSoup(html, "html.parser")
    files: dict[str, DataFile] = {}
    for link in soup.find_all("a", href=True):
        url = link["href"].strip()
        if FILES_MARKER not in url:
            continue
        name = url.split(FILES_MARKER, 1)[1]
        kind = _classify(name)
        if kind is None:
            continue
        period = _parse_period(link.get_text(" "))
        if period is None:
            log.warning("Período não reconhecido no link %r (%s); ignorado.", link.get_text(strip=True), name)
            continue
        files[name] = DataFile(url=url, name=name, kind=kind, start=period[0], end=period[1])
    return sorted(files.values(), key=lambda f: (f.start, f.kind != "semestral", f.name))


def fetch_page(client: httpx.Client) -> str:
    response = client.get(PAGE_URL)
    response.raise_for_status()
    return response.text


def new_client() -> httpx.Client:
    return httpx.Client(
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
        timeout=httpx.Timeout(30, read=300),
    )
