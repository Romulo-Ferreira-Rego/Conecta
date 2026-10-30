"""Cria (ou renova a senha de) um usuário de banco SOMENTE LEITURA para a API.

Mesmo que surgisse uma falha na API, ela não conseguiria alterar nem apagar
dados: o usuário só tem permissão de SELECT no schema `dados`. O ETL continua
usando o usuário dono (com escrita).

Uso (a partir da raiz, com DATABASE_URL apontando para o banco desejado):
    python -m db.criar_usuario_api --env-file .env.producao

A senha é gerada aleatoriamente e gravada no arquivo indicado como
DATABASE_URL_API. Ela nunca é exibida na tela.
"""

import argparse
import re
import secrets
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url

from db.connection import get_database_url

ROLE = "conecta_api"


def grant_statements(database: str) -> list[str]:
    return [
        f'GRANT CONNECT ON DATABASE "{database}" TO {ROLE}',
        f"GRANT USAGE ON SCHEMA dados TO {ROLE}",
        f"GRANT SELECT ON ALL TABLES IN SCHEMA dados TO {ROLE}",  # inclui a visão materializada
        # Tabelas criadas no futuro (novas migrações) também ficam legíveis
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA dados GRANT SELECT ON TABLES TO {ROLE}",
        # Garantia explícita de que não há escrita nem criação de objetos
        f"REVOKE CREATE ON SCHEMA dados FROM {ROLE}",
        f"REVOKE CREATE ON SCHEMA public FROM {ROLE}",
    ]


def save_url(env_file: Path, url: str) -> None:
    text = env_file.read_text(encoding="utf-8") if env_file.exists() else ""
    line = f"DATABASE_URL_API={url}"
    block = (
        "\n# Usuário SOMENTE LEITURA (conecta_api): usado pela API no Render.\n" + line + "\n"
    )
    if re.search(r"^DATABASE_URL_API=.*$", text, flags=re.M):
        text = re.sub(r"^DATABASE_URL_API=.*$", line, text, flags=re.M)
    else:
        text = text.rstrip("\n") + "\n" + block
    env_file.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--env-file", type=Path, required=True, help="arquivo onde gravar DATABASE_URL_API")
    args = parser.parse_args()

    owner_url = make_url(get_database_url())
    password = secrets.token_urlsafe(32)  # ~256 bits de entropia
    engine = create_engine(owner_url, isolation_level="AUTOCOMMIT")
    with engine.connect() as conn:
        exists = conn.exec_driver_sql("SELECT 1 FROM pg_roles WHERE rolname = %s", (ROLE,)).scalar()
        verb = "ALTER" if exists else "CREATE"
        # Senha como literal: comandos de role não aceitam parâmetros; o token só tem [A-Za-z0-9_-]
        conn.exec_driver_sql(f"{verb} ROLE {ROLE} WITH LOGIN PASSWORD '{password}'")
        for statement in grant_statements(owner_url.database):
            conn.exec_driver_sql(statement)
    engine.dispose()

    api_url = owner_url.set(username=ROLE, password=password, drivername="postgresql")
    save_url(args.env_file, api_url.render_as_string(hide_password=False))
    print(f"Usuário {ROLE} {'atualizado' if exists else 'criado'} (somente leitura); URL gravada em {args.env_file}.")


if __name__ == "__main__":
    main()
