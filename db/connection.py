"""Leitura da string de conexão do banco, compartilhada por migrações, ETL e testes."""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _to_psycopg(url: str) -> str:
    # "postgresql://" faria o SQLAlchemy procurar o driver antigo (psycopg2).
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def get_database_url() -> str:
    """Retorna a DATABASE_URL no formato aceito pelo SQLAlchemy com psycopg 3.

    Variáveis já definidas no ambiente (ex.: GitHub Secrets) têm prioridade
    sobre o arquivo .env, que só é usado no desenvolvimento local.
    """
    load_dotenv(PROJECT_ROOT / ".env")
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL não definida. Copie .env.example para .env e preencha."
        )
    return _to_psycopg(url)


def get_test_database_url() -> str:
    """Banco exclusivo dos testes, para eles nunca apagarem dados reais.

    Usa TEST_DATABASE_URL se definida; senão, o mesmo servidor da
    DATABASE_URL com o nome do banco acrescido de "_test".
    """
    load_dotenv(PROJECT_ROOT / ".env")
    if url := os.getenv("TEST_DATABASE_URL"):
        return _to_psycopg(url)
    url = make_url(get_database_url())
    return url.set(database=f"{url.database}_test").render_as_string(hide_password=False)
