import { motion } from 'motion/react'

import { useEtanolGasolina } from '../../api/hooks'
import { formatMonthLong, formatNumber, formatPrice } from '../../lib/format'
import { Panel } from '../../components/ui/Panel'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { useFiltros } from './useFiltros'
import { useLocalNome } from './useLocalNome'

// Faixa exibida na régua (em % do preço da gasolina)
const SCALE_MIN = 50
const SCALE_MAX = 90
const position = (pct: number) => `${((Math.min(Math.max(pct, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`

/** "Etanol ou gasolina?" (RF08): régua com o limite de 70% e o marcador deslizando até o valor atual. */
export function EtanolIndicator() {
  const { local } = useFiltros()
  const lugar = useLocalNome(local)
  const { data, isPending, isError, error, refetch } = useEtanolGasolina(local)
  const compensa = data?.recomendacao === 'etanol'

  return (
    <Panel id="etanol" eyebrow="Na bomba" title="Etanol ou gasolina?" description={`Média ${lugar.frase}`} className="h-full">
      {isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !data ? (
        <EmptyState hint="Não há preços de etanol e gasolina no mesmo mês para este local." />
      ) : (
        <div className="flex h-full flex-col">
          <p className="text-[26px] leading-tight font-semibold tracking-[-0.025em] text-ink">
            {compensa ? 'Abasteça com etanol' : 'Abasteça com gasolina'}
          </p>
          <p className="mt-1.5 text-sm text-ink-2">
            O etanol custa <strong className="font-semibold text-ink">{formatNumber(data.percentual, 1)}%</strong> do preço da
            gasolina{compensa ? ', abaixo' : ', acima'} do limite de 70%.
          </p>

          {/* Régua */}
          <div className="mt-7" aria-hidden="true">
            <div className="relative h-2 rounded-full bg-surface-2">
              <div className="absolute inset-y-0 left-0 rounded-l-full bg-[var(--chart-series)]/25" style={{ width: position(70) }} />
              <div className="absolute -top-1.5 -bottom-1.5 w-px bg-ink-2" style={{ left: position(70) }} />
              <motion.div
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-[var(--chart-highlight)] shadow-[0_0_0_1px_var(--line-strong)]"
                initial={{ left: position(70) }}
                animate={{ left: position(data.percentual) }}
                transition={{ type: 'spring', stiffness: 120, damping: 18, mass: 0.8 }}
              />
            </div>
            <div className="relative mt-2.5 h-4 text-[11px] text-muted">
              <span className="absolute left-0">{SCALE_MIN}%</span>
              <span className="absolute -translate-x-1/2 font-medium text-ink-2" style={{ left: position(70) }}>70%</span>
              <span className="absolute right-0">{SCALE_MAX}%</span>
            </div>
            <div className="mt-1 flex justify-between text-[11px] font-medium">
              <span className="text-down">← etanol compensa</span>
              <span className="text-ink-2">gasolina compensa →</span>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <div className="bg-surface p-3">
              <dt className="text-xs text-muted">Etanol</dt>
              <dd className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-ink">{formatPrice(data.preco_etanol)}</dd>
            </div>
            <div className="bg-surface p-3">
              <dt className="text-xs text-muted">Gasolina</dt>
              <dd className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-ink">{formatPrice(data.preco_gasolina)}</dd>
            </div>
          </dl>

          <p className="mt-auto pt-5 text-xs leading-relaxed text-muted">
            Regra prática: o etanol rende cerca de 70% da gasolina. Médias de {formatMonthLong(data.mes)}; o consumo real
            varia conforme o carro.
          </p>
        </div>
      )}
    </Panel>
  )
}
