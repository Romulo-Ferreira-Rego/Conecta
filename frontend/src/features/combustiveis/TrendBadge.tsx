import { formatPercent, trendOf } from '../../lib/format'

const STYLE = {
  alta: { icon: '▲', className: 'text-up', label: 'alta' },
  queda: { icon: '▼', className: 'text-down', label: 'queda' },
  estavel: { icon: '●', className: 'text-muted', label: 'estável' },
}

/**
 * Variação de preço com seta, sinal e cor (nunca só a cor — seção 8.2).
 * Para o consumidor, alta de preço é ruim (vermelho) e queda é boa (verde).
 */
export function TrendBadge({ percent, className = '' }: { percent: number | null; className?: string }) {
  if (percent === null) return <span className={`text-sm text-muted ${className}`}>sem mês anterior</span>
  const trend = trendOf(percent)
  const style = STYLE[trend]
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${style.className} ${className}`}>
      <span aria-hidden="true" className="text-[10px]">{style.icon}</span>
      <span className="tnum">{trend === 'estavel' ? '0,0%' : formatPercent(percent)}</span>
      <span className="sr-only">({style.label})</span>
    </span>
  )
}
