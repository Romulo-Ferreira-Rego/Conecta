# Conecta — Especificação do Projeto

> **Visão de longo prazo:** o Conecta será um portal de informações e notícias (estilo site de jornal).
> **v1 (este documento):** começa pela editoria de dados com o Painel de Preços de Combustíveis.

> Documento de referência para o Claude Code. Leia este arquivo inteiro antes de começar qualquer tarefa.
> Autor: Rômulo (Engenharia de Software — UNDB). Objetivo: projeto de portfólio.

---

## 1. Visão geral

Site público e gratuito que mostra a evolução e a comparação dos preços de combustíveis no Brasil a partir dos **dados abertos da ANP** (Série Histórica de Preços de Combustíveis).

**Problema que resolve:** os dados da ANP existem, mas estão em CSVs grandes e pouco amigáveis. O site transforma esses dados em gráficos, rankings e filtros simples para qualquer pessoa.

**Público-alvo:** motoristas, motoristas de aplicativo, transportadores, estudantes e jornalistas.

**Fonte oficial dos dados:**
https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis
(arquivos CSV semestrais, ex.: `ca-2025-01.csv` para combustíveis automotivos do 1º semestre)

---

## 2. Escopo

### 2.1 Dentro do escopo (v1 — MVP)
- Importação (ETL) dos CSVs semestrais da ANP para o banco de dados.
- Dashboard com gráficos e filtros (produto, estado, município, período).
- Rankings de estados e municípios mais caros e mais baratos.
- Página "Sobre os dados" com fonte, metodologia e limitações.
- Política de Privacidade e aviso de cookies (LGPD).
- Site responsivo (celular e desktop).

### 2.2 Fora do escopo (v1)
- Cadastro e login de usuários.
- Preços em tempo real (a ANP publica com atraso; o site deixa isso claro).
- App mobile nativo.
- Previsão de preços com machine learning (possível v3).

### 2.3 Roadmap futuro (não implementar agora)
- **v2:** busca de postos por município, comparação lado a lado de dois estados, exportação de gráfico/CSV filtrado, mapa coroplético do Brasil.
- **v3:** alertas por e-mail (exigiria consentimento LGPD e cadastro), previsão de tendência.
- **v4 — Portal de notícias Conecta:** home estilo jornal (manchete, destaques, últimas notícias), editorias (ex.: Economia, Tecnologia, Cidades, Dados), páginas de matéria, autores, busca, tags e painel administrativo (CMS) para publicar notícias. O painel de combustíveis vira a editoria **"Conecta Dados"**.

### 2.4 Preparar o terreno para o portal (já na v1)
Sem implementar o portal agora, a v1 deve evitar decisões que dificultem a expansão:
- Rotas organizadas por seção: o painel fica em `/dados/combustiveis`, deixando `/` livre para a futura home de notícias (na v1, `/` pode redirecionar para o painel).
- Layout com cabeçalho e menu de navegação reutilizáveis, prontos para receber novas editorias.
- Componentes de UI genéricos (cards, grid, tipografia) pensados para servir também a matérias.
- Banco organizado em schemas: `dados` (tabelas da ANP) e, no futuro, `conteudo` (notícias, autores, editorias).
- SEO básico desde o início: `<title>`, meta description e Open Graph por página.

---

## 3. Requisitos funcionais

| ID | Requisito | Prioridade |
|----|-----------|-----------|
| RF01 | Importar CSVs da ANP via script, tratando separador `;`, decimal `,` e encoding | Alta |
| RF02 | Evitar duplicidade ao reimportar o mesmo arquivo (importação idempotente) | Alta |
| RF03 | Exibir cards de resumo: preço médio nacional atual por produto e variação vs. período anterior | Alta |
| RF04 | Gráfico de linha da evolução do preço médio ao longo do tempo | Alta |
| RF05 | Filtros por produto, estado (UF), município e intervalo de datas | Alta |
| RF06 | Ranking das 10 UFs e 10 municípios mais caros e mais baratos | Alta |
| RF07 | Gráfico de barras comparando o preço médio entre UFs | Média |
| RF08 | Comparação gasolina × etanol (indicador dos 70%: quando etanol ≤ 70% da gasolina, compensa) | Média |
| RF09 | Página "Sobre os dados" com fonte, data da última atualização e limitações | Alta |
| RF10 | Página de Política de Privacidade e banner de cookies | Alta |
| RF11 | API REST pública somente leitura para alimentar o front-end | Alta |
| RF12 | Exibir data da última importação no rodapé | Baixa |
| RF13 | Atualização automática: job agendado verifica, baixa e importa novos dados da ANP sem intervenção manual (ver seção 9.1) | Alta |

## 4. Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF01 | Responsivo, mobile-first (funcionar bem a partir de 360px) |
| RNF02 | Respostas da API em menos de 1s para consultas agregadas (usar índices e tabelas agregadas) |
| RNF03 | Acessibilidade: contraste AA, textos alternativos em gráficos, navegação por teclado |
| RNF04 | Código versionado no GitHub com README completo (portfólio) |
| RNF05 | Variáveis sensíveis (string de conexão etc.) somente em `.env`, nunca commitadas |
| RNF06 | Interface toda em português do Brasil, valores em R$ com vírgula decimal |
| RNF07 | Testes automatizados no ETL (leitura e limpeza) e nos endpoints principais |
| RNF08 | Conformidade com a LGPD (ver seção 7) |

---

## 5. Stack sugerida

> Decisão provisória — pode ser ajustada antes de iniciar o código.

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| ETL | Python 3.14 + pandas | Ótimo para tratar CSV grande |
| Banco | PostgreSQL | Relacional, gratuito, fácil de hospedar (Supabase/Neon) |
| Back-end | Python + FastAPI + SQLAlchemy | Mesmo idioma do ETL, documentação automática (Swagger) |
| Front-end | React + Vite + TypeScript + Tailwind CSS | Padrão de mercado |
| Gráficos | Recharts | Simples e integrado ao React |
| Deploy | Front: Vercel · API: Render · Banco: Supabase ou Neon | Planos gratuitos |

### Estrutura de pastas
```
conecta/
├── CLAUDE.md
├── README.md
├── .env.example
├── etl/            # scripts de download, limpeza e carga
│   ├── tests/
│   └── data/raw/   # CSVs baixados (no .gitignore)
├── backend/        # FastAPI
│   ├── app/
│   └── tests/
├── db/             # migrações Alembic (schema dados) e testes do banco
│   ├── migrations/versions/
│   └── tests/
├── frontend/       # React + Vite
├── docs/           # diagramas, prints
└── docker-compose.yml  # PostgreSQL local
```

---

## 6. Banco de dados (modelo inicial)

### 6.1 Formato esperado do CSV da ANP
Colunas conhecidas (**validar no primeiro download**, a ANP já mudou nomes entre anos):
`Regiao - Sigla; Estado - Sigla; Municipio; Revenda; CNPJ da Revenda; Nome da Rua; Numero Rua; Complemento; Bairro; Cep; Produto; Data da Coleta; Valor de Venda; Valor de Compra; Unidade de Medida; Bandeira`

Cuidados: separador `;`, decimal com vírgula, datas `dd/mm/aaaa`, possíveis problemas de encoding e valores vazios em "Valor de Compra".

> **Validado na etapa 3 (30/10/2026)** — as colunas acima estão corretas em 2024–2026. Achados:
> - Arquivos em `https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/arquivos/shpc/`:
>   semestrais `dsas/ca/ca-AAAA-0N.zip` (**ZIP** desde 2022; CSV até 2021) e **mensais**
>   `dsan/AAAA/...-gasolina-etanol.csv` e `...-diesel-gnv.csv` (mais recentes que os semestrais).
>   Nomes irregulares (erros de digitação, arquivos sem extensão): descobrir pelos links da página, período pelo texto do link.
> - Encoding UTF-8 com BOM; CNPJ com espaço à esquerda; "Valor de Compra" sempre vazio.
> - `ca-2025-02` traz o CNPJ **só com dígitos** (os demais com pontuação): o ETL padroniza para `00.000.000/0000-00`.
> - `ca-2025-01` termina com ~9 mil linhas totalmente vazias.
> - Há algumas linhas duplicadas (mesmo posto, produto e data) dentro do mesmo arquivo.
> - O servidor recusa `HEAD` (403) e não envia `Last-Modified`; o tamanho é obtido com GET `Range: bytes=0-0`.
>   Por isso `importacao.modificado_em` fica vazio e a detecção de mudança usa tamanho + hash.
> - Volume: ~420 mil linhas e ~60 MB por semestre; 24 meses ≈ 1,9 milhão de linhas e ~275 MB.
> - GLP fica **fora da v1** (decisão do Rômulo).

### 6.2 Tabelas

```sql
-- Dimensões
CREATE TABLE regiao (
    id      SERIAL PRIMARY KEY,
    sigla   VARCHAR(2) UNIQUE NOT NULL,      -- N, NE, CO, SE, S
    nome    VARCHAR(30) NOT NULL
);

CREATE TABLE estado (
    id         SERIAL PRIMARY KEY,
    sigla      CHAR(2) UNIQUE NOT NULL,
    nome       VARCHAR(50) NOT NULL,
    regiao_id  INT NOT NULL REFERENCES regiao(id)
);

CREATE TABLE municipio (
    id         SERIAL PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL,
    estado_id  INT NOT NULL REFERENCES estado(id),
    UNIQUE (nome, estado_id)
);

CREATE TABLE produto (
    id               SERIAL PRIMARY KEY,
    nome             VARCHAR(50) UNIQUE NOT NULL,  -- GASOLINA, ETANOL, DIESEL S10...
    unidade_medida   VARCHAR(20) NOT NULL          -- R$ / litro, R$ / m³
);

CREATE TABLE bandeira (
    id    SERIAL PRIMARY KEY,
    nome  VARCHAR(80) UNIQUE NOT NULL
);

CREATE TABLE revenda (
    id            SERIAL PRIMARY KEY,
    cnpj          VARCHAR(18) UNIQUE NOT NULL,
    razao_social  VARCHAR(150) NOT NULL,
    bairro        VARCHAR(100),
    cep           VARCHAR(9),
    municipio_id  INT NOT NULL REFERENCES municipio(id),
    bandeira_id   INT REFERENCES bandeira(id)
);

-- Fato
CREATE TABLE coleta_preco (
    id             BIGSERIAL PRIMARY KEY,
    revenda_id     INT NOT NULL REFERENCES revenda(id),
    produto_id     INT NOT NULL REFERENCES produto(id),
    data_coleta    DATE NOT NULL,
    valor_venda    NUMERIC(8,3) NOT NULL,
    valor_compra   NUMERIC(8,3),
    importacao_id  INT NOT NULL REFERENCES importacao(id),
    UNIQUE (revenda_id, produto_id, data_coleta)   -- garante idempotência (RF02)
);

-- Controle do ETL
CREATE TABLE importacao (
    id               SERIAL PRIMARY KEY,
    arquivo          VARCHAR(100) UNIQUE NOT NULL,  -- ex.: ca-2025-01.csv
    data_importacao  TIMESTAMP NOT NULL DEFAULT NOW(),
    linhas_lidas     INT,
    linhas_inseridas INT,
    status           VARCHAR(20) NOT NULL          -- sucesso | erro
);
```
> Obs.: criar `importacao` antes de `coleta_preco` na migração.

> **Implementado na etapa 2 (migrações em `db/migrations/versions/`), com ajustes:**
> - Todas as tabelas ficam no schema `dados` (ex.: `dados.coleta_preco`).
> - `importacao` ganhou `tamanho_bytes BIGINT`, `hash_sha256 CHAR(64)` e `modificado_em TIMESTAMPTZ` (detecção de arquivos republicados, RF13). Ao reimportar um arquivo atualizado, a linha existente é atualizada (o `arquivo` continua `UNIQUE`).
> - Datas de controle usam `TIMESTAMPTZ` (o job roda em UTC).
> - CHECKs: `valor_venda > 0`, `valor_compra > 0`, `status IN ('sucesso','erro')`.
> - Índice extra `idx_revenda_municipio` em `revenda (municipio_id)`.
> - `regiao` e `estado` já vêm carregadas (5 regiões, 27 UFs).
> - A visão `preco_medio_mensal` tem índice único em `(produto_id, mes, estado_id, municipio_id)` e `mes` é do tipo `date`; usar `REFRESH MATERIALIZED VIEW CONCURRENTLY dados.preco_medio_mensal` para não bloquear leituras.

### 6.3 Índices e agregação
```sql
CREATE INDEX idx_coleta_data       ON coleta_preco (data_coleta);
CREATE INDEX idx_coleta_produto    ON coleta_preco (produto_id, data_coleta);

-- Tabela/visão materializada para os gráficos (evita varrer milhões de linhas)
CREATE MATERIALIZED VIEW preco_medio_mensal AS
SELECT
    date_trunc('month', c.data_coleta) AS mes,
    c.produto_id,
    m.estado_id,
    r.municipio_id,
    AVG(c.valor_venda)  AS preco_medio,
    MIN(c.valor_venda)  AS preco_min,
    MAX(c.valor_venda)  AS preco_max,
    COUNT(*)            AS qtd_coletas
FROM coleta_preco c
JOIN revenda r   ON r.id = c.revenda_id
JOIN municipio m ON m.id = r.municipio_id
GROUP BY 1, 2, 3, 4;
```
Atualizar com `REFRESH MATERIALIZED VIEW preco_medio_mensal;` ao final de cada importação.

### 6.4 Diagrama (resumo)
`regiao 1—N estado 1—N municipio 1—N revenda 1—N coleta_preco N—1 produto`
`bandeira 1—N revenda` · `importacao 1—N coleta_preco`

---

## 7. LGPD (Lei nº 13.709/2018)

### 7.1 Dados exibidos (ANP)
- São dados **públicos** divulgados por órgão oficial, sobre **estabelecimentos comerciais** (CNPJ, razão social, endereço do posto). Em regra, não são dados pessoais.
- Mesmo assim: usar os dados apenas para a finalidade de informar preços, citar a fonte (ANP) e não cruzá-los com outras bases para identificar pessoas.
- **Não exibir na v1** detalhes por posto (CNPJ/endereço); trabalhar com médias por município/UF. Isso também simplifica o MVP.

### 7.2 Dados dos visitantes
- **Sem cadastro e sem login** na v1: o site não coleta nome, e-mail ou CPF.
- **Cookies:** usar apenas cookies essenciais. Se adicionar analytics, preferir solução sem cookies e anonimizada (ex.: Plausible, Umami) ou pedir consentimento antes de carregar o script.
- **Banner de cookies** com opções "Aceitar" e "Recusar" (recusar deve ser tão fácil quanto aceitar); guardar a escolha só no navegador.
- **Logs do servidor:** não guardar IP completo além do necessário; definir retenção curta (ex.: 30 dias).
- **Nenhum dado** em parâmetros de URL além dos filtros (produto, UF, datas).

### 7.3 Página de Política de Privacidade (conteúdo mínimo)
1. Quem é o responsável pelo site (Rômulo) e o canal de contato do titular: **romulorego16@gmail.com**.
2. Quais dados são coletados (cookies/logs) e para quê.
3. Base legal e tempo de retenção.
4. Compartilhamento com terceiros (provedores de hospedagem/analytics).
5. Direitos do titular (art. 18 da LGPD) e como exercê-los.
6. Data da última atualização.

> Se no futuro houver cadastro ou alertas por e-mail (v3), será preciso: consentimento explícito, finalidade declarada, opção de excluir a conta e os dados, e senhas com hash (bcrypt/argon2).

---

## 8. Design (UI/UX)

### 8.1 Identidade
- **Nome:** **Conecta** (marca do portal). O painel aparece como "Conecta Dados — Combustíveis".
- **Tom:** limpo, informativo e confiável, com linguagem jornalística. Na v1 os dados são os protagonistas.
- O logo e o cabeçalho devem funcionar tanto para o painel quanto para o futuro portal de notícias.
- **Tema claro e escuro.**

### 8.2 Paleta
| Uso | Cor |
|-----|-----|
| Primária | `#0F766E` (verde-petróleo) |
| Destaque / alerta de alta | `#F59E0B` (âmbar) |
| Queda de preço | `#16A34A` (verde) |
| Alta de preço | `#DC2626` (vermelho) |
| Fundo claro / escuro | `#F8FAFC` / `#0F172A` |
| Texto | `#0F172A` / `#E2E8F0` |

Nunca usar só a cor para indicar alta/queda: incluir seta (▲▼) e sinal (+/−).

### 8.3 Tipografia
- Fonte: **Inter** (Google Fonts). Números com `font-variant-numeric: tabular-nums`.

### 8.4 Páginas
1. **Início (Dashboard)**
   - Cabeçalho com logo, navegação e alternância de tema.
   - Barra de filtros (produto, UF, município, período).
   - 4 cards: Gasolina, Etanol, Diesel S10, GNV — preço médio e variação.
   - Gráfico de linha: evolução do preço.
   - Gráfico de barras: preço médio por UF.
   - Rankings: mais caros / mais baratos.
   - Indicador "Etanol ou gasolina?".
2. **Sobre os dados:** fonte, metodologia da ANP, frequência de atualização, limitações.
3. **Política de Privacidade.**
4. **Sobre o projeto:** autor, tecnologias usadas, link do GitHub (vitrine de portfólio) e contato.

**Contato do site:** romulorego16@gmail.com
- Exibir no **rodapé de todas as páginas**, na página **Sobre o projeto** e na **Política de Privacidade**.
- Usar link `mailto:`, mas montar o endereço via JavaScript ou de forma ofuscada no HTML, para reduzir a coleta por robôs de spam.

### 8.5 Layout
- Mobile: tudo em coluna única, filtros em gaveta (drawer).
- Desktop: grid de 12 colunas, cards em 4 colunas, gráficos lado a lado.
- Estados de carregamento (skeleton), vazio ("Sem dados para este filtro") e erro.

### 8.6 Implementado na etapa 5 (`frontend/`)
- **Stack:** React 19 + Vite 8 + TypeScript 7 + Tailwind 4 + Recharts 3 + TanStack Query 5 + React Router 8 + Motion (animações). Lint: oxlint. Testes: Vitest + Testing Library.
- **Direção visual:** editorial e contida (portal de notícias): linhas finas (hairlines) em vez de sombras, rótulos pequenos em caixa alta ("eyebrow"), manchete gerada dos dados, sem gradientes decorativos nem "glassmorphism".
- **Logo:** "C" aberto cujas pontas são dois nós (um branco, um âmbar), sobre quadrado verde-petróleo; o traço se desenha ao carregar. Arquivo: `frontend/public/favicon.svg` e `components/layout/Logo.tsx`.
- **Tokens de cor** em `src/index.css` (variáveis CSS por tema; componentes usam papéis como `bg-surface`, `text-ink`).
  Ajustes de contraste AA: texto de queda usa `#15803D` (o `#16A34A` não atinge 4,5:1 em fundo branco).
  Cores de gráfico validadas com o script do guia de dataviz: série `#0D9488` (claro) / `#0D9E8F` (escuro), destaque `#D97706`.
- **Gráficos:** barras sempre a partir do zero (nunca cortar o eixo); eixo Y da linha com passos 1/2/5; rótulo só no último valor; tabela alternativa ("Ver tabela") em todo gráfico.
- **Animações:** entrada em cascata, números que "rolam", indicador deslizante (layout animation), gaveta com `<dialog>` nativo, troca de tema com revelação circular (View Transitions). Tudo respeita `prefers-reduced-motion`.
- **Filtros na URL** (`produto`, `uf`, `municipio`, `periodo`); `periodo` = 6m | 12m | 24m | tudo (padrão 12m).
- O painel é carregado sob demanda (`lazy`), separando os gráficos do pacote inicial.
- Páginas institucionais são provisórias ("Em breve") até a etapa 6.

---

## 9. API (endpoints iniciais)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/produtos` | Lista produtos |
| GET | `/api/estados` | Lista UFs |
| GET | `/api/municipios?uf=XX` | Municípios de uma UF |
| GET | `/api/resumo?produto=&uf=` | Preço médio atual e variação |
| GET | `/api/serie?produto=&uf=&municipio=&inicio=&fim=` | Série temporal mensal |
| GET | `/api/ranking?produto=&nivel=uf\|municipio&ordem=asc\|desc&limite=10` | Ranking |
| GET | `/api/meta` | Data da última importação |

Somente leitura, CORS liberado apenas para o domínio do front-end, limite de requisições básico.

> **Implementado na etapa 4** (`backend/app/`, rodar com `uvicorn backend.app.main:app --reload`):
> - Produto é identificado por **código** derivado do nome (`GASOLINA ADITIVADA` → `gasolina-aditivada`); município por **id**.
> - `/api/resumo`: `produto` opcional (sem ele, todos); aceita `municipio`. Compara o mês mais recente com o anterior.
> - `/api/serie`: `inicio`/`fim` no formato `AAAA-MM`.
> - `/api/ranking`: usa o mês mais recente; aceita `uf` para ranquear municípios de um estado; municípios precisam de ≥ 10 coletas no mês (`RANKING_MIN_COLETAS`).
> - Endpoint extra **`/api/etanol-gasolina?uf=&municipio=`** (RF08): razão etanol/gasolina e recomendação; `null` sem dados.
> - Extra **`/api/saude`** (health check para o deploy).
> - Médias agregadas são **ponderadas** por `qtd_coletas`.
> - Limite de requisições **próprio** (`backend/app/limite.py`, 60/min por IP): o slowapi 0.1.10 não encontra rotas do FastAPI 0.16x (`_IncludedRouter`) e deixava tudo sem limite.
> - Log de acesso do uvicorn desligado (grava IP); o log próprio registra só método, rota, status e tempo.
> - **Deploy (etapa 7):** atrás de proxy (Render), rodar o uvicorn com `--proxy-headers --forwarded-allow-ips="*"` para o limite usar o IP real; criar usuário de banco só leitura para a API.

### 9.1 Atualização automática (RF13)

**Fluxo do job:**
1. Acessar a página de dados abertos da ANP e listar os arquivos disponíveis.
2. Comparar com a tabela `importacao`: identificar arquivos novos **ou atualizados** (a ANP republica o semestre corrente conforme novas coletas; comparar data de modificação/tamanho ou hash do arquivo).
3. Baixar apenas o que mudou, rodar a limpeza e a carga (idempotente, graças ao `UNIQUE` em `coleta_preco`).
4. Executar `REFRESH MATERIALIZED VIEW preco_medio_mensal`.
5. Registrar o resultado em `importacao` (sucesso/erro, linhas inseridas).
6. Em caso de erro, o site continua no ar com os dados anteriores, e o job falha de forma visível (notificação por e-mail do GitHub).

**Agendamento:** GitHub Actions com `schedule` (cron), gratuito para repositórios públicos.
```yaml
# .github/workflows/atualizar-dados.yml
name: Atualizar dados ANP
on:
  schedule:
    - cron: "0 9 * * 1"   # toda segunda, 06h de Brasília (cron em UTC)
  workflow_dispatch:       # permite rodar manualmente pelo GitHub
jobs:
  etl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.14"
      - run: pip install -r etl/requirements.txt
      - run: python -m etl.atualizar
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```
- A string de conexão do banco fica em **GitHub Secrets**, nunca no código.
- O script `etl/atualizar.py` deve ter logs claros e um modo `--dry-run` (só mostra o que baixaria).
- Investigar também se a ANP publica levantamentos semanais em formato aberto; se sim, usá-los para ter dados mais recentes que os arquivos semestrais.
- O rodapé do site mostra "Dados atualizados em dd/mm/aaaa" (RF12), lido de `/api/meta`.

---

## 10. Plano de execução (ordem sugerida para o Claude Code)

1. Criar a estrutura de pastas, `.gitignore`, `.env.example` e `README.md` inicial.
2. Subir PostgreSQL local (Docker Compose) e criar as tabelas da seção 6.
3. Escrever o ETL: baixar 1 CSV, inspecionar colunas reais, limpar e carregar. Testar com um semestre antes de carregar vários.
4. Criar a API FastAPI com os endpoints da seção 9 + testes.
5. Criar o front-end: layout, filtros, cards, gráficos.
6. Páginas institucionais (Sobre os dados, Privacidade, Sobre o projeto) e banner de cookies.
7. Deploy e README final com prints, link do site e instruções de execução.

## 11. Git e repositório

**Repositório oficial:** https://github.com/Romulo-Ferreira-Rego/Conecta

### 11.1 Configuração inicial (executar na etapa 1)
1. Se a pasta ainda não for um repositório Git, rodar `git init` e criar a branch `main`.
2. Verificar se o remoto `origin` existe (`git remote -v`). Se não existir:
   `git remote add origin https://github.com/Romulo-Ferreira-Rego/Conecta.git`
3. Se o repositório remoto já tiver conteúdo (ex.: README criado pelo GitHub), fazer `git pull origin main --allow-unrelated-histories` antes do primeiro push, sem apagar nada.
4. Confirmar que o `.gitignore` exclui `.env`, `etl/data/raw/`, `node_modules/`, `__pycache__/` e ambientes virtuais **antes** do primeiro commit.

### 11.2 Regra obrigatória: commit ao fim de cada etapa
Ao concluir **cada etapa** do plano de execução (seção 10):
1. Rodar os testes da etapa. **Só commitar com os testes passando.** Se falharem, corrigir antes ou explicar o problema ao Rômulo.
2. Rodar `git status` e conferir que nenhum arquivo sensível (`.env`, senhas, CSVs brutos) será incluído.
3. Fazer o commit no padrão **Conventional Commits**, em português, com título e corpo descritivo:
   ```
   feat(etl): implementa importação dos CSVs da ANP

   - Lê CSV com separador ";" e decimal ","
   - Normaliza estados, municípios e produtos
   - Importação idempotente via UNIQUE em coleta_preco
   - Testes de limpeza e carga adicionados

   Etapa 3 do plano de execução (CLAUDE.md, seção 10).
   ```
4. Enviar para o GitHub com `git push origin main`.
5. Informar ao Rômulo o hash e o título do commit.

Prefixos: `feat` (funcionalidade), `fix` (correção), `test` (testes), `docs` (documentação), `refactor`, `chore` (configuração), `ci` (GitHub Actions).
Commits intermediários dentro de uma etapa são permitidos, seguindo o mesmo padrão.

## 12. Convenções
- Código e nomes de variáveis em português ou inglês, mas **consistentes** (sugestão: código em inglês, interface em português).
- Commits conforme a seção 11.
- Antes de cada etapa grande, explicar o plano e esperar confirmação do Rômulo.
- Explicar decisões técnicas de forma didática: o autor é estudante e quer aprender com o projeto.

## 13. Critérios de pronto (v1)
- [ ] ETL carrega ao menos os últimos 2 anos de dados sem duplicar.
- [ ] Dashboard funciona com todos os filtros no celular e no desktop.
- [ ] Páginas institucionais e banner de cookies publicados.
- [ ] Site no ar com link público.
- [ ] README com descrição, prints, stack, como rodar e fonte dos dados.
