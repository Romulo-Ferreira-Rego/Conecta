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
├── frontend/       # interface web (React + Vite)
└── docs/           # diagramas e prints
```

## Fonte dos dados

[Série Histórica de Preços de Combustíveis, ANP](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis), dados abertos do Governo Federal.

## Como executar

_Instruções serão adicionadas conforme o projeto avançar._

## Autor

**Rômulo Ferreira Rego**, estudante de Sistemas de Informação (UNDB).
Contato: romulorego16 [arroba] gmail [ponto] com
