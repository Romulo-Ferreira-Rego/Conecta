import { motion } from 'motion/react'
import { Link } from 'react-router'

import { Article } from '../components/ui/Article'
import { ContactEmail } from '../components/ui/ContactEmail'
import { EASE_OUT } from '../lib/motion'

const GITHUB_URL = 'https://github.com/Romulo-Ferreira-Rego/Conecta'

const ETAPAS = [
  { nome: 'ANP', detalhe: 'Dados abertos (CSV e ZIP)' },
  { nome: 'ETL', detalhe: 'Python + pandas' },
  { nome: 'Banco', detalhe: 'PostgreSQL' },
  { nome: 'API', detalhe: 'FastAPI' },
  { nome: 'Site', detalhe: 'React + Vite' },
]

/** Caminho dos dados, da ANP até a tela; as conexões se desenham em sequência. */
function Diagrama() {
  return (
    <figure className="!mt-6">
      <ol className="grid gap-2 sm:grid-cols-5 sm:gap-0" aria-label="Caminho dos dados: ANP, ETL, banco, API e site">
        {ETAPAS.map((etapa, i) => (
          <li key={etapa.nome} className="relative flex items-center sm:flex-col sm:items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.12, duration: 0.45, ease: EASE_OUT }}
              className="w-full rounded-lg border border-line bg-surface px-3 py-3 sm:mx-1.5 sm:h-full sm:w-auto sm:text-center"
            >
              <p className="text-sm font-semibold text-ink">{etapa.nome}</p>
              <p className="mt-0.5 text-xs text-muted">{etapa.detalhe}</p>
            </motion.div>
            {i < ETAPAS.length - 1 && (
              <motion.span
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.12 + 0.25, duration: 0.35, ease: EASE_OUT }}
                className="absolute top-1/2 -right-1.5 z-10 hidden h-px w-3 origin-left bg-brand sm:block"
              />
            )}
          </li>
        ))}
      </ol>
      <figcaption className="mt-3 text-xs text-muted">
        Um processo agendado busca os arquivos da ANP toda semana, limpa e grava no banco; a API entrega médias prontas ao
        site.
      </figcaption>
    </figure>
  )
}

export function SobreProjetoPage() {
  return (
    <>
      <title>Sobre o projeto — Conecta</title>
      <meta
        name="description"
        content="O Conecta é um projeto de portfólio de Rômulo Ferreira Rego: um painel público de preços de combustíveis feito com Python, PostgreSQL, FastAPI e React."
      />
      <Article
        eyebrow="Conecta · Projeto"
        title="Sobre o projeto"
        lede="O Conecta transforma os dados abertos da ANP, publicados em arquivos grandes e pouco amigáveis, em gráficos, rankings e comparações que qualquer pessoa entende."
        sections={[
          {
            id: 'por-que',
            title: 'Por que existe',
            content: (
              <>
                <p>
                  Os preços de combustíveis afetam o orçamento de motoristas, motoristas de aplicativo, transportadores e
                  de quase toda a economia. A ANP publica esses dados, mas em planilhas com centenas de milhares de linhas.
                  O Conecta organiza essa informação para responder perguntas simples: quanto custa, onde está mais caro e
                  se compensa abastecer com etanol.
                </p>
                <p>
                  O painel de combustíveis é a primeira editoria, <strong>Conecta Dados</strong>, de um portal de
                  informação que deve crescer com novas seções.
                </p>
              </>
            ),
          },
          {
            id: 'autor',
            title: 'Quem fez',
            content: (
              <p>
                <strong>Rômulo Ferreira Rego</strong>, estudante de Engenharia de Software na UNDB. O Conecta é um projeto
                de portfólio, desenvolvido do banco de dados à interface. Contato: <ContactEmail />.
              </p>
            ),
          },
          {
            id: 'como-funciona',
            title: 'Como funciona',
            content: (
              <>
                <p>Os dados percorrem cinco etapas até chegar à tela:</p>
                <Diagrama />
              </>
            ),
          },
          {
            id: 'tecnologias',
            title: 'Tecnologias',
            content: (
              <ul>
                <li>
                  <strong>Dados (ETL):</strong> Python 3.14 e pandas, com importação idempotente (reimportar um arquivo
                  nunca duplica registros) e verificação automática de qualidade.
                </li>
                <li>
                  <strong>Banco:</strong> PostgreSQL, com migrações versionadas (Alembic) e uma visão materializada que
                  guarda as médias mensais prontas.
                </li>
                <li>
                  <strong>API:</strong> FastAPI, somente leitura, com documentação automática, limite de requisições e
                  respostas em poucos milissegundos.
                </li>
                <li>
                  <strong>Site:</strong> React, TypeScript, Tailwind CSS, Recharts e Motion, com tema claro e escuro.
                </li>
                <li>
                  <strong>Qualidade:</strong> mais de 120 testes automatizados (banco, ETL, API e interface).
                </li>
              </ul>
            ),
          },
          {
            id: 'principios',
            title: 'Princípios',
            content: (
              <ul>
                <li>
                  <strong>Acessível:</strong> contraste adequado, navegação por teclado, tabelas alternativas para os
                  gráficos e variações que nunca dependem só da cor.
                </li>
                <li>
                  <strong>Honesto com os números:</strong> barras sempre a partir do zero, médias ponderadas e limitações
                  explicadas em <Link to="/sobre-os-dados">Sobre os dados</Link>.
                </li>
                <li>
                  <strong>Respeito à privacidade:</strong> sem cadastro, sem rastreamento e sem cookies de publicidade
                  (veja a <Link to="/privacidade">Política de Privacidade</Link>).
                </li>
              </ul>
            ),
          },
          {
            id: 'codigo',
            title: 'Código aberto',
            content: (
              <p>
                Todo o código está no GitHub:{' '}
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  github.com/Romulo-Ferreira-Rego/Conecta
                </a>
                .
              </p>
            ),
          },
        ]}
      />
    </>
  )
}
