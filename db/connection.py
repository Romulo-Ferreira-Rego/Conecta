"""Leitura da string de conexão do banco, compartilhada por migrações e testes."""

import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]


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
    # "postgresql://" faria o SQLAlchemy procurar o driver antigo (psycopg2).
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url
