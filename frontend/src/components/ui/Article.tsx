import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { fadeUp, stagger } from '../../lib/motion'

export interface ArticleSection {
  id: string
  title: string
  content: ReactNode
}

interface Props {
  eyebrow: string
  title: string
  lede: ReactNode
  meta?: ReactNode
  sections: ArticleSection[]
}

/**
 * Página de texto no estilo de matéria: abertura, índice lateral (desktop) e seções.
 * Pensado para servir também às futuras matérias do portal (seção 2.4).
 */
export function Article({ eyebrow, title, lede, meta, sections }: Props) {
  return (
    <motion.article initial="hidden" animate="show" variants={stagger} className="pt-10 pb-8 sm:pt-14">
      <motion.header variants={fadeUp} className="max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="h-px w-6 bg-brand" aria-hidden="true" />
          <p className="eyebrow !text-brand-ink">{eyebrow}</p>
        </div>
        <h1 className="mt-5 text-[32px] leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-5xl">{title}</h1>
        <p className="mt-4 text-base leading-relaxed text-pretty text-ink-2 sm:text-lg">{lede}</p>
        {meta && <p className="mt-4 text-sm text-muted">{meta}</p>}
      </motion.header>

      <div className="mt-10 grid gap-10 border-t border-line pt-10 lg:grid-cols-12">
        <motion.nav variants={fadeUp} aria-label="Nesta página" className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-32">
            <p className="eyebrow">Nesta página</p>
            <ol className="mt-4 space-y-2.5 border-l border-line text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="-ml-px block border-l border-transparent pl-4 text-ink-2 transition-colors hover:border-brand hover:text-ink"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </motion.nav>

        <div className="space-y-12 lg:col-span-8 lg:col-start-5">
          {sections.map((section) => (
            <motion.section key={section.id} variants={fadeUp} id={section.id} className="scroll-mt-32">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{section.title}</h2>
              <div className="prose-conecta mt-4">{section.content}</div>
            </motion.section>
          ))}
        </div>
      </div>
    </motion.article>
  )
}
