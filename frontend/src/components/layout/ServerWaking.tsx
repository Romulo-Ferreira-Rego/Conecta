import { useIsFetching } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { EASE_OUT } from '../../lib/motion'

/** Depois de quanto tempo carregando o aviso aparece. */
export const WAKING_DELAY_MS = 5000

/**
 * No plano gratuito do Render, a API "dorme" após 15 minutos sem acesso e leva
 * até um minuto para acordar. Em vez de deixar os blocos carregando sem explicação,
 * este aviso aparece se alguma requisição demorar mais que 5 segundos.
 */
export function ServerWaking() {
  const fetching = useIsFetching() > 0
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!fetching) return
    const timer = setTimeout(() => setSlow(true), WAKING_DELAY_MS)
    return () => {
      clearTimeout(timer)
      setSlow(false)
    }
  }, [fetching])

  return (
    <AnimatePresence>
      {fetching && slow && (
        <motion.div
          role="status"
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="fixed top-20 left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-[0_16px_40px_-20px_rgb(15_23_42/0.45)] sm:top-28"
        >
          <span className="relative mt-1.5 flex size-2.5 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
          </span>
          <span>
            <span className="font-medium text-ink">Conectando ao servidor de dados…</span>
            <span className="block text-ink-2">
              Ele fica em espera quando não há acessos e pode levar até um minuto para responder.
            </span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
