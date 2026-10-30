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
├── etl/            # download, limpeza e carga dos arquivos da ANP
│   ├── tests/
│   └── data/raw/   # arquivos baixados (não versionados)
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
pip install -r db/requirements.txt -r etl/requirements.txt
alembic -c db/alembic.ini upgrade head
```

### 4. Carregar os dados da ANP

```bash
python -m etl.atualizar --dry-run   # mostra o que seria baixado
python -m etl.atualizar             # baixa e importa os últimos 24 meses (~5 min)
```

O `atualizar` lê a página da ANP, compara com o que já foi importado e só baixa o que é novo ou mudou. Outras opções:

```bash
python -m etl.atualizar --desde 2025-01        # muda o início da janela
python -m etl.atualizar --verificar-hash       # confere o conteúdo mesmo com tamanho igual
python -m etl.importar dsas/ca/ca-2026-01.zip  # importa um arquivo específico
```

### 5. Rodar a API

```bash
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

A documentação interativa (Swagger) fica em <http://localhost:8000/docs>.

| Rota | Descrição |
|------|-----------|
| `GET /api/produtos` | Produtos e seus códigos (`gasolina`, `diesel-s10`…) |
| `GET /api/estados` | As 27 UFs |
| `GET /api/municipios?uf=MA` | Municípios de uma UF |
| `GET /api/resumo?produto=&uf=&municipio=` | Preço médio do último mês e variação sobre o anterior |
| `GET /api/serie?produto=&uf=&municipio=&inicio=AAAA-MM&fim=AAAA-MM` | Série mensal (média, mínimo, máximo) |
| `GET /api/ranking?produto=&nivel=uf\|municipio&ordem=asc\|desc&limite=10&uf=` | UFs ou municípios mais caros/baratos |
| `GET /api/etanol-gasolina?uf=&municipio=` | Etanol ou gasolina? (regra dos 70%) |
| `GET /api/meta` | Data da última atualização dos dados |

Decisões importantes:

- **Média ponderada:** médias de UF e do Brasil pesam cada município pelo número de coletas (equivale à média de todas as coletas).
- **Ranking de municípios:** só entram cidades com pelo menos 10 coletas no mês, para evitar distorções por amostras pequenas.
- **Proteções:** somente `GET`, CORS restrito ao front-end, limite de 60 requisições/minuto por IP, cache HTTP de 1 hora e logs sem IP (LGPD).

### 6. Rodar o site (front-end)

Com a API ligada, em outro terminal:

```bash
cd frontend
npm install
npm run dev        # abre em http://localhost:5173
```

O endereço da API vem de `VITE_API_URL` no `.env` da raiz (padrão: `http://localhost:8000`).

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm test` | Testes (Vitest + Testing Library) |
| `npm run lint` | Verificação de código (oxlint) |
| `npm run build` | Versão de produção em `frontend/dist/` |

Destaques do front-end:

- **Filtros na URL** (`?produto=etanol&uf=MA`): qualquer consulta pode ser compartilhada por link.
- **Manchete gerada dos dados**, em linguagem jornalística ("Gasolina cai 1,6% no Maranhão em setembro").
- **Acessibilidade:** variação com seta e sinal (nunca só cor), tabela alternativa para cada gráfico, navegação por teclado, respeito à preferência por menos movimento.
- **Tema claro e escuro**, com a escolha guardada só no navegador.
- **Privacidade:** fonte Inter hospedada no próprio site (o navegador do visitante não contata o Google).

### 7. Rodar os testes

```bash
python -m pytest -v          # banco, ETL e API
cd frontend && npm test      # front-end
```

Os testes Python usam um banco separado (`conecta_test`), criado automaticamente no mesmo PostgreSQL, e nunca alteram os dados de desenvolvimento.

### Como o ETL funciona

| Etapa | Módulo | O que faz |
|-------|--------|-----------|
| Descoberta | `etl/fontes.py` | Lê os links da página da ANP; o período vem do texto do link |
| Download | `etl/download.py` | Baixa para `etl/data/raw/` e calcula o hash SHA-256 |
| Extração | `etl/extracao.py` | Lê CSV ou CSV dentro de ZIP (UTF-8 ou latin-1) |
| Limpeza | `etl/limpeza.py` | Padroniza textos, CNPJ, datas e preços; descarta e conta linhas inválidas |
| Carga | `etl/carga.py` | `COPY` para tabela temporária + `INSERT ... ON CONFLICT DO NOTHING` (idempotente) |

Se mais de 10% das linhas de um arquivo forem descartadas, a importação falha de propósito: provavelmente a ANP mudou o formato, e é melhor avisar do que gravar dados incompletos.

## Autor

**Rômulo Ferreira Rego**, estudante de Engenharia de Software (UNDB).
Contato: romulorego16@gmail.com
