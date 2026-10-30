import { motion } from 'motion/react'

import { useResumo, useSerie, type Local } from '../../api/hooks'
import type { Resumo } from '../../api/types'
import { formatMonthShort, formatPrice, monthsBefore } from '../../lib/format'
import { PRODUTOS_DESTAQUE, productLabel, unitLabel } from '../../lib/lugares'
import { fadeUp } from '../../lib/motion'
import { AnimatedNumber } from '../../components/ui/AnimatedNumber'
import { ErrorState, Skeleton } from '../../components/ui/States'
import { Sparkline } from './Sparkline'
import { TrendBadge } from './TrendBadge'
import { useFiltros } from './useFiltros'

function CardSparkline({ produto, local, ultimoMes }: { produto: string; local: Local; ultimoMes: string }) {
  const { data } = useSerie(produto, local, monthsBefore(ultimoMes, 11))
  return <Sparkline pontos={data?.pontos ?? []} />
}

interface CardProps {
  codigo: string
  item?: Resumo
  ativo: boolean
  onSelect: () => void
  local: Local
}

function PriceCard({ codigo, item, ativo, onSelect, local }: CardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={ativo}
      className="group relative flex flex-col items-start p-5 text-left transition-colors hover:!bg-surface-2/60 sm:p-6"
    >
      {ativo && (
        <motion.span
          layoutId="card-ativo"
          className="absolute inset-x-0 top-0 h-[2px] bg-brand"
          transition={{ type: 'spring', stiffness: 500, damping: 42 }}
        />
      )}
      <span className={`text-sm font-medium transition-colors ${ativo ? 'text-ink' : 'text-ink-2 group-hover:text-ink'}`}>
        {productLabel(codigo)}
      </span>

      {item ? (
        <>
          <span className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">
            <AnimatedNumber value={item.preco_medio} format={formatPrice} />
          </span>
          <span className="mt-1.5 text-xs text-muted">{unitLabel(item.unidade)} · média de {formatMonthShort(item.mes)}</span>
          <span className="mt-4 flex w-full items-end justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <TrendBadge percent={item.variacao_percentual} />
              {item.mes_anterior && <span className="text-xs text-muted">vs. {formatMonthShort(item.mes_anterior)}</span>}
            </span>
            <CardSparkline produto={codigo} local={local} ultimoMes={item.mes} />
          </span>
        </>
      ) : (
        <span className="mt-3 text-sm text-muted">Sem coletas para este filtro</span>
      )}
    </button>
  )
}

/** Faixa com os 4 combustíveis principais. Clicar num deles muda o combustível do painel. */
export function PriceCards() {
  const { filtros, local, update } = useFiltros()
  const { data: resumo, isPending, isError, error, refetch } = useResumo(local)

  return (
    <motion.section variants={fadeUp} aria-label="Preço médio por combustível" className="overflow-hidden rounded-xl border border-line bg-surface">
      {isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : (
        // gap-px sobre fundo da cor da linha = divisórias finas entre os cards em qualquer grade
        <div className="grid grid-cols-1 gap-px bg-line min-[480px]:grid-cols-2 lg:grid-cols-4 [&>*]:bg-surface">
          {PRODUTOS_DESTAQUE.map((codigo) =>
            isPending ? (
              <div key={codigo} className="p-5 sm:p-6" aria-busy="true">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-4 h-8 w-32" />
                <Skeleton className="mt-3 h-3 w-24" />
                <Skeleton className="mt-5 h-7 w-full" />
              </div>
            ) : (
              <PriceCard
                key={codigo}
                codigo={codigo}
                item={resumo?.find((r) => r.produto === codigo)}
                ativo={filtros.produto === codigo}
                onSelect={() => update({ produto: codigo })}
                local={local}
              />
            ),
          )}
        </div>
      )}
    </motion.section>
  )
}
