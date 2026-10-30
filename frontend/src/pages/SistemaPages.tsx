import { motion } from 'motion/react'
import { Link } from 'react-router'

import { Skeleton } from '../components/ui/States'
import { fadeUp, stagger } from '../lib/motion'

/** Exibido por uma fração de segundo enquanto o código do painel é baixado. */
export function PageLoading() {
  return (
    <div className="max-w-4xl space-y-4 pt-14" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-12 w-4/5" />
      <Skeleton className="h-5 w-3/5" />
    </div>
  )
}

export function NotFoundPage() {
  return (
    <>
      <title>Página não encontrada — Conecta</title>
      <motion.div initial="hidden" animate="show" variants={stagger} className="max-w-2xl py-16 sm:py-24">
        <motion.p variants={fadeUp} className="eyebrow">Erro 404</motion.p>
        <motion.h1 variants={fadeUp} className="mt-3 text-4xl font-semibold tracking-[-0.03em]">Página não encontrada</motion.h1>
        <motion.p variants={fadeUp} className="mt-4 text-lg text-ink-2">
          O endereço pode ter mudado ou não existir mais.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8">
          <Link to="/" className="text-sm font-semibold text-brand-ink underline underline-offset-4">
            Voltar ao início
          </Link>
        </motion.div>
      </motion.div>
    </>
  )
}
