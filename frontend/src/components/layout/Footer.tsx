import { Link } from 'react-router'

import { useMeta } from '../../api/hooks'
import { openCookiePreferences } from '../../lib/consent'
import { formatDate } from '../../lib/format'
import { ContactEmail } from '../ui/ContactEmail'
import { LogoMark } from './Logo'

const YEAR = new Date().getFullYear()

export function Footer() {
  const { data: meta } = useMeta()

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-12 lg:px-8">
        <div className="md:col-span-5">
          <div className="flex items-center gap-2.5">
            <LogoMark size={24} />
            <span className="text-[17px] font-[650] tracking-[-0.035em]">conecta</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-2">
            Informação pública traduzida em gráficos claros. Os preços são médias das coletas semanais da ANP e não
            representam valores em tempo real.
          </p>
        </div>

        <nav aria-label="Rodapé" className="text-sm md:col-span-3">
          <p className="eyebrow">Navegação</p>
          <ul className="mt-4 space-y-2.5">
            <li><Link className="text-ink-2 transition-colors hover:text-ink" to="/dados/combustiveis">Combustíveis</Link></li>
            <li><Link className="text-ink-2 transition-colors hover:text-ink" to="/sobre-os-dados">Sobre os dados</Link></li>
            <li><Link className="text-ink-2 transition-colors hover:text-ink" to="/privacidade">Política de Privacidade</Link></li>
            <li><Link className="text-ink-2 transition-colors hover:text-ink" to="/sobre">Sobre o projeto</Link></li>
            <li>
              <button type="button" onClick={openCookiePreferences} className="text-ink-2 transition-colors hover:text-ink">
                Preferências de cookies
              </button>
            </li>
          </ul>
        </nav>

        <div className="text-sm md:col-span-4">
          <p className="eyebrow">Dados</p>
          <p className="mt-4 text-ink-2">
            {meta?.ultima_importacao ? (
              <>Dados atualizados em <time className="font-medium text-ink" dateTime={meta.ultima_importacao}>{formatDate(meta.ultima_importacao)}</time></>
            ) : (
              'Carregando data de atualização…'
            )}
          </p>
          <p className="mt-2 text-ink-2">
            Fonte:{' '}
            <a
              className="text-brand-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-brand"
              href="https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis"
              target="_blank"
              rel="noreferrer"
            >
              ANP — Série Histórica de Preços
            </a>
          </p>
          <p className="mt-2 text-ink-2">
            Contato: <ContactEmail />
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted sm:px-6 lg:px-8">
          © {YEAR} Conecta · Projeto de portfólio de Rômulo Ferreira Rego
        </p>
      </div>
    </footer>
  )
}
