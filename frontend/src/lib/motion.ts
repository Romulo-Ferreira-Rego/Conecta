// Linguagem de movimento do site: curta, suave e com propósito (nada pisca ou quica à toa).
// Quem pede menos movimento no sistema operacional recebe só as trocas de opacidade (MotionConfig).

import type { Variants } from 'motion/react'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Contêiner que revela os filhos em sequência. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

/** Entrada padrão: sobe 14px e aparece. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
}
