import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router'

import { saveConsent, useCookieBanner } from '../../lib/consent'
import { EASE_OUT } from '../../lib/motion'

/**
 * Aviso de cookies na base da tela. Não bloqueia a navegação, e "Recusar"
 * tem exatamente o mesmo tamanho e destaque de "Aceitar" (seção 7.2).
 */
export function CookieBanner() {
  const { consent, visible } = useCookieBanner()

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          role="region"
          aria-label="Aviso de cookies"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: consent === null ? 0.8 : 0 }}
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border border-line bg-surface p-4 shadow-[0_16px_40px_-20px_rgb(15_23_42/0.45)] sm:inset-x-6 sm:bottom-6 sm:p-5"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="text-sm leading-relaxed">
              <p className="font-semibold text-ink">Sua privacidade</p>
              <p className="mt-1 text-ink-2">
                Usamos apenas o armazenamento essencial do navegador (para lembrar o tema escolhido). Não há cookies de
                publicidade nem rastreamento. Sua escolha vale para recursos opcionais que possam surgir, como
                estatísticas de visitas.{' '}
                <Link to="/privacidade" className="font-medium text-brand-ink underline underline-offset-4">
                  Política de Privacidade
                </Link>
              </p>
              {consent && (
                <p className="mt-1.5 text-xs text-muted">
                  Escolha atual: {consent === 'aceito' ? 'recursos opcionais aceitos' : 'recursos opcionais recusados'}.
                </p>
              )}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-64">
              <button
                type="button"
                onClick={() => saveConsent('recusado')}
                className="h-10 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                Recusar
              </button>
              <button
                type="button"
                onClick={() => saveConsent('aceito')}
                className="h-10 rounded-lg border border-line-strong bg-surface text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                Aceitar
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
