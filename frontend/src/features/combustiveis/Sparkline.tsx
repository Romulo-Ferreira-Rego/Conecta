import { motion } from 'motion/react'

import type { PontoSerie } from '../../api/types'

/** Minigráfico da tendência (12 meses) no tom discreto, com o mês atual em destaque. */
export function Sparkline({ pontos, width = 96, height = 28 }: { pontos: PontoSerie[]; width?: number; height?: number }) {
  if (pontos.length < 2) return <div style={{ width, height }} />

  const values = pontos.map((p) => p.preco_medio)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = 3
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2)
  const y = (v: number) => (max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - pad * 2))
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const last = values.length - 1

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <motion.path
        key={d}
        d={d}
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.circle
        cx={x(last)}
        cy={y(values[last])}
        r="3"
        fill="var(--chart-series)"
        stroke="var(--surface)"
        strokeWidth="1.5"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.75, type: 'spring', stiffness: 400, damping: 20 }}
      />
    </svg>
  )
}
