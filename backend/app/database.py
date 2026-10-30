"""Conexão com o banco, entregue às rotas por injeção de dependência do FastAPI."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Connection, Engine, create_engine

from db.connection import get_database_url


@lru_cache
def get_engine() -> Engine:
    # pool_pre_ping descarta conexões que o servidor fechou (comum em bancos na nuvem)
    return create_engine(get_database_url(), pool_pre_ping=True, pool_size=5, max_overflow=5)


def get_connection() -> Iterator[Connection]:
    """Uma conexão por requisição, devolvida ao pool no final.

    Nos testes, esta função é substituída por uma conexão com transação desfeita.
    """
    with get_engine().connect() as conn:
        yield conn
