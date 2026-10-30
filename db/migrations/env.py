"""Ponto de entrada do Alembic: conecta ao banco e executa as migrações."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from db.connection import get_database_url

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

# Os testes passam a URL do banco de testes por aqui; no uso normal, vale a DATABASE_URL.
database_url = config.attributes.get("database_url") or get_database_url()


def run_migrations_offline() -> None:
    """Gera o SQL das migrações sem conectar (alembic upgrade head --sql)."""
    context.configure(url=database_url, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Conecta ao banco e aplica as migrações."""
    engine = create_engine(database_url, poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
