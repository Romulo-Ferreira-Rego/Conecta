"""Limpeza e padronização das linhas lidas dos arquivos da ANP.

Cada regra que descarta linhas registra quantas descartou e por quê, para que
a importação tenha uma contabilidade clara (linhas lidas x válidas).
"""

import logging
import re
import unicodedata
from dataclasses import dataclass, field

import pandas as pd

log = logging.getLogger(__name__)

# Nome normalizado da coluna no arquivo -> nome interno.
# Variações já usadas pela ANP entram aqui quando aparecerem.
COLUMN_ALIASES = {
    "estado - sigla": "uf",
    "estado": "uf",
    "municipio": "municipio",
    "revenda": "revenda",
    "cnpj da revenda": "cnpj",
    "bairro": "bairro",
    "cep": "cep",
    "produto": "produto",
    "data da coleta": "data_coleta",
    "valor de venda": "valor_venda",
    "valor de compra": "valor_compra",
    "unidade de medida": "unidade",
    "bandeira": "bandeira",
}
REQUIRED_COLUMNS = {"uf", "municipio", "revenda", "cnpj", "produto", "data_coleta", "valor_venda"}
OPTIONAL_COLUMNS = {"bairro", "cep", "valor_compra", "unidade", "bandeira"}

# Combustíveis automotivos da v1 (GLP fica de fora) e unidade padrão de cada um.
PRODUCTS = {
    "GASOLINA": "R$ / litro",
    "GASOLINA ADITIVADA": "R$ / litro",
    "ETANOL": "R$ / litro",
    "DIESEL": "R$ / litro",
    "DIESEL S10": "R$ / litro",
    "GNV": "R$ / m³",
}
UFS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
}

CEP_RE = re.compile(r"^\d{5}-\d{3}$")
MAX_PRICE = 100.0  # R$ por litro/m³; acima disso é erro de digitação
# Se mais que isso das linhas não vazias for descartado, o formato do arquivo
# provavelmente mudou: a importação deve falhar em vez de gravar dados parciais.
MAX_DISCARD_RATIO = 0.10

# Motivos de descarte (aparecem no log da importação)
EMPTY_ROW = "linha_vazia"
INVALID_UF = "uf_invalida"
MISSING_FIELD = "campo_obrigatorio_vazio"
INVALID_CNPJ = "cnpj_invalido"
OUT_OF_SCOPE = "produto_fora_do_escopo"
INVALID_DATE = "data_invalida"
INVALID_PRICE = "preco_invalido"
DUPLICATED = "duplicada_no_arquivo"


class SchemaError(Exception):
    """O arquivo não tem as colunas esperadas (a ANP pode ter mudado o formato)."""


class QualityError(Exception):
    """Linhas demais descartadas: provável mudança de formato no arquivo."""


@dataclass
class CleanResult:
    data: pd.DataFrame
    rows_read: int
    discarded: dict[str, int] = field(default_factory=dict)

    @property
    def rows_valid(self) -> int:
        return len(self.data)

    def check_quality(self) -> None:
        """Falha se a proporção de linhas descartadas (fora as vazias) for alta."""
        non_empty = self.rows_read - self.discarded.get(EMPTY_ROW, 0)
        rejected = non_empty - self.rows_valid
        if non_empty and rejected / non_empty > MAX_DISCARD_RATIO:
            raise QualityError(
                f"{rejected} de {non_empty} linhas descartadas "
                f"({rejected / non_empty:.0%}): {self.discarded}"
            )


def _strip_accents(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    return "".join(c for c in text if not unicodedata.combining(c))


def _normalize_header(name: str) -> str:
    return " ".join(_strip_accents(name).lower().split())


def _normalize_text(series: pd.Series, *, remove_accents: bool = False) -> pd.Series:
    """Maiúsculas, sem espaços duplicados; opcionalmente sem acentos."""
    series = series.str.strip().str.upper().str.replace(r"\s+", " ", regex=True)
    if remove_accents:
        series = series.map(_strip_accents)
    return series


def _format_cnpj(series: pd.Series) -> pd.Series:
    """Padroniza o CNPJ como 00.000.000/0000-00; inválidos viram "".

    A ANP já publicou com pontuação e só com dígitos (ex.: 2º sem. 2025).
    """
    digits = series.str.replace(r"\D", "", regex=True)
    formatted = digits.str.replace(
        r"^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$", r"\1.\2.\3/\4-\5", regex=True
    )
    return formatted.where(digits.str.len() == 14, "")


def _parse_price(series: pd.Series) -> pd.Series:
    """'6,29' -> 6.29. Valores vazios ou inválidos viram NaN."""
    cleaned = series.str.strip().str.replace(",", ".", regex=False)
    return pd.to_numeric(cleaned, errors="coerce")


def _rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    mapping = {}
    for column in df.columns:
        internal = COLUMN_ALIASES.get(_normalize_header(column))
        if internal and internal not in mapping.values():
            mapping[column] = internal
    df = df.rename(columns=mapping)
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise SchemaError(
            f"Colunas obrigatórias ausentes: {sorted(missing)}. "
            f"Colunas encontradas: {list(mapping) or list(df.columns)}"
        )
    for column in OPTIONAL_COLUMNS - set(df.columns):
        df[column] = ""
    return df[sorted(REQUIRED_COLUMNS | OPTIONAL_COLUMNS)]


def clean(raw: pd.DataFrame) -> CleanResult:
    df = _rename_columns(raw)
    result = CleanResult(data=df, rows_read=len(df))

    def discard(mask: pd.Series, reason: str) -> None:
        nonlocal df
        count = int(mask.sum())
        if count:
            result.discarded[reason] = result.discarded.get(reason, 0) + count
            df = df[~mask]

    df = df.apply(lambda col: col.str.strip())
    discard((df == "").all(axis=1), EMPTY_ROW)

    df["uf"] = df["uf"].str.upper()
    discard(~df["uf"].isin(UFS), INVALID_UF)

    # Município sem acentos: "São Luís" e "SAO LUIS" viram o mesmo registro.
    df["municipio"] = _normalize_text(df["municipio"], remove_accents=True)
    df["revenda"] = _normalize_text(df["revenda"])
    df["produto"] = _normalize_text(df["produto"], remove_accents=True)
    df["bandeira"] = _normalize_text(df["bandeira"])
    df["bairro"] = _normalize_text(df["bairro"])
    discard((df["municipio"] == "") | (df["revenda"] == ""), MISSING_FIELD)

    df["cnpj"] = _format_cnpj(df["cnpj"])
    discard(df["cnpj"] == "", INVALID_CNPJ)
    discard(~df["produto"].isin(PRODUCTS), OUT_OF_SCOPE)

    df["data_coleta"] = pd.to_datetime(df["data_coleta"], format="%d/%m/%Y", errors="coerce").dt.date
    discard(df["data_coleta"].isna(), INVALID_DATE)

    df["valor_venda"] = _parse_price(df["valor_venda"])
    discard(~df["valor_venda"].between(0, MAX_PRICE, inclusive="neither"), INVALID_PRICE)

    # Valor de compra é opcional: se inválido, fica vazio em vez de descartar a linha.
    compra = _parse_price(df["valor_compra"])
    df["valor_compra"] = compra.where(compra.between(0, MAX_PRICE, inclusive="neither"))

    df["cep"] = df["cep"].where(df["cep"].str.match(CEP_RE))
    df["bandeira"] = df["bandeira"].where(df["bandeira"] != "")
    df["bairro"] = df["bairro"].where(df["bairro"] != "")
    # Unidade padronizada pelo produto (o arquivo às vezes traz "m³" com encoding quebrado).
    df["unidade"] = df["produto"].map(PRODUCTS)

    discard(df.duplicated(["cnpj", "produto", "data_coleta"]), DUPLICATED)

    result.data = df.reset_index(drop=True)
    return result
