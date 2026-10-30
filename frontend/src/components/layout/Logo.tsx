import { motion } from 'motion/react'

/**
 * Marca do Conecta: um "C" aberto cujas pontas são dois nós — duas pontas que se conectam.
 * O nó âmbar é o destaque da paleta. Ao carregar, o traço do "C" se desenha uma vez.
 */
export function LogoMark({ size = 28, animated = false }: { size?: number; animated?: boolean }) {
  const draw = animated
    ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const } }
    : {}
  const pop = (delay: number) =>
    animated
      ? { initial: { scale: 0 }, animate: { scale: 1 }, transition: { delay, type: 'spring' as const, stiffness: 420, damping: 18 } }
      : {}

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="8" fill="var(--brand)" />
      <motion.path
        d="M22.4 9.6a9 9 0 1 0 0 12.8"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        {...draw}
      />
      <motion.circle cx="22.4" cy="9.6" r="2.6" fill="#fff" style={{ originX: '22.4px', originY: '9.6px' }} {...pop(0.55)} />
      <motion.circle cx="22.4" cy="22.4" r="2.6" fill="#F59E0B" style={{ originX: '22.4px', originY: '22.4px' }} {...pop(0.75)} />
    </svg>
  )
}

export function Logo({ section }: { section?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark animated />
      <span className="text-[19px] font-[650] tracking-[-0.035em] text-ink">conecta</span>
      {section && (
        <>
          <span className="h-4 w-px bg-line-strong" aria-hidden="true" />
          <span className="text-[15px] font-medium tracking-[-0.01em] text-muted">{section}</span>
        </>
      )}
    </span>
  )
}
