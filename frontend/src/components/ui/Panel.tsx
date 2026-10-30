import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { fadeUp } from '../../lib/motion'

interface PanelProps {
  title?: string
  eyebrow?: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

/** Bloco de conteúdo com título no estilo editorial: rótulo pequeno, título e linha fina. */
export function Panel({ title, eyebrow, description, actions, children, className = '', id }: PanelProps) {
  return (
    <motion.section
      variants={fadeUp}
      aria-labelledby={title && id ? `${id}-titulo` : undefined}
      className={`rounded-xl border border-line bg-surface ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 border-b border-line px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
            {title && (
              <h2 id={id ? `${id}-titulo` : undefined} className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </motion.section>
  )
}
