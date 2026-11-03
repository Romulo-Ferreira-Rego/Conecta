import { formatNumber, formatPercent } from '../../../lib/format'
import type { Faixa, Metrica } from './escala'

/**
 * Legenda em faixas: cada cor com o limite escrito embaixo. Na variação,
 * as pontas dizem o sentido (▼ queda, ▲ alta), para não depender só da cor.
 */
export function Legenda({ faixas, metrica, patternId }: { faixas: Faixa[]; metrica: Metrica; patternId: string }) {
  const limite = (v: number) => (metrica === 'preco' ? formatNumber(v) : formatPercent(v, 0))
  // Na variação, os limites de ±0,25% (a faixa "estável") ficam sem número para não amontoar.
  const escrito = (v: number | null): v is number => v !== null && (metrica === 'preco' || Number.isInteger(v))
  return (
    <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 text-[11px] text-muted" aria-hidden="true">
      <div className="w-full max-w-sm min-w-0 sm:w-auto sm:flex-1">
        <p className="mb-1.5 font-medium text-ink-2">
          {metrica === 'preco' ? 'Preço médio (R$)' : 'Variação em relação ao mês anterior'}
        </p>
        <div className="flex max-w-sm gap-0.5">
          {faixas.map((f, i) => (
            <div key={i} className="min-w-0 flex-1">
              <div className="h-2.5 rounded-[2px]" style={{ background: f.cor }} />
              <div className="tnum relative mt-1 h-3.5">
                {i === 0 && escrito(f.de) && <span className="absolute left-0">{limite(f.de)}</span>}
                {escrito(f.ate) && (
                  <span className={`absolute ${i === faixas.length - 1 ? 'right-0' : 'right-0 translate-x-1/2'}`}>
                    {limite(f.ate)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {metrica === 'variacao' && (
          <div className="mt-0.5 flex max-w-sm justify-between">
            <span className="text-down">▼ queda</span>
            <span>● estável</span>
            <span className="text-up">▲ alta</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <svg width="14" height="10" className="rounded-[2px]">
          <defs>
            <pattern id={`${patternId}-legenda`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="var(--map-empty)" />
              <line x1="0" y1="0" x2="0" y2="4" stroke="var(--map-hatch)" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="14" height="10" fill={`url(#${patternId}-legenda)`} />
        </svg>
        Dados insuficientes
      </div>
    </div>
  )
}
