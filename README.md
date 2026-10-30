# Conecta

Site onde são disponibilizadas informações sobre combustíveis e notícias relacionadas, de forma mais simples e intuitiva.

> **Status:** 🚧 em desenvolvimento (v1: Painel de Preços de Combustíveis)

## Sobre o projeto

O **Conecta** é um portal de informações e notícias. A primeira versão começa pela editoria de dados, com o **Conecta Dados: Combustíveis**: um painel público e gratuito que mostra a evolução e a comparação dos preços de combustíveis no Brasil.

### O problema

A ANP (Agência Nacional do Petróleo, Gás Natural e Biocombustíveis) publica a série histórica de preços de combustíveis como dados abertos, mas em arquivos CSV grandes e pouco amigáveis. O Conecta transforma esses dados em gráficos, rankings e filtros simples, para qualquer pessoa consultar.

**Público-alvo:** motoristas, motoristas de aplicativo, transportadores, estudantes e jornalistas.

### Funcionalidades planejadas (v1)

- Cards com o preço médio nacional por produto e a variação em relação ao período anterior
- Gráfico da evolução do preço médio ao longo do tempo
- Filtros por produto, estado, município e período
- Rankings dos estados e municípios mais caros e mais baratos
- Indicador "Etanol ou gasolina?" (regra dos 70%)
- Atualização automática dos dados da ANP (job agendado)
- Páginas "Sobre os dados", "Política de Privacidade" (LGPD) e "Sobre o projeto"

## Stack

| Camada | Tecnologia |
|--------|-----------|
| ETL | Python 3.14 + pandas |
| Banco de dados | PostgreSQL |
| Back-end | FastAPI + SQLAlchemy |
| Front-end | React + Vite + TypeScript + Tailwind CSS |
| Gráficos | Recharts |
| Automação | GitHub Actions |

## Estrutura de pastas

```
├── etl/            # download, limpeza e carga dos CSVs da ANP
│   ├── tests/
│   └── data/raw/   # CSVs baixados (não versionados)
├── backend/        # API REST (FastAPI)
│   ├── app/
│   └── tests/
├── db/             # migrações do banco (Alembic) e testes do schema
│   ├── migrations/
│   └── tests/
├── frontend/       # interface web (React + Vite)
├── docs/           # diagramas e prints
└── docker-compose.yml  # PostgreSQL local
```

## Fonte dos dados

[Série Histórica de Preços de Combustíveis, ANP](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis), dados abertos do Governo Federal.

## Como executar

### Pré-requisitos

- [Git](https://git-scm.com/)
- [Python 3.14](https://www.python.org/downloads/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### 1. Configurar as variáveis de ambiente

```bash
cp .env.example .env
# edite o .env e defina POSTGRES_PASSWORD (e a mesma senha na DATABASE_URL)
```

### 2. Subir o banco de dados

```bash
docker compose up -d      # liga o PostgreSQL (porta 5432)
docker compose ps         # deve mostrar "healthy"
```

### 3. Criar o ambiente Python e as tabelas

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate   |   Linux/macOS: source .venv/bin/activate
pip install -r db/requirements.txt
alembic -c db/alembic.ini upgrade head
```

### 4. Rodar os testes

```bash
python -m pytest db/tests -v
```

_As instruções do ETL, da API e do front-end serão adicionadas nas próximas etapas._

## Autor

**Rômulo Ferreira Rego**, estudante de Sistemas de Informação (UNDB).
Contato: romulorego16@gmail.com
