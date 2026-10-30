import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useState } from 'react'

import { useRanking } from '../../api/hooks'
import { formatMonthLong, formatNumber, formatPrice, titleCase } from '../../lib/format'
import { productLabel } from '../../lib/lugares'
import { EASE_OUT } from '../../lib/motion'
import { Panel } from '../../components/ui/Panel'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/States'
import { useFiltros } from './useFiltros'
import { useLocalNome } from './useLocalNome'

type Ordem = 'desc' | 'asc'
type Nivel = 'uf' | 'municipio'

/** Rankings dos 10 mais caros e mais baratos. Ao alternar, as linhas deslizam para a nova posição. */
export function Rankings() {
  const { filtros, local } = useFiltros()
  const lugar = useLocalNome({ uf: local.uf })
  const [ordem, setOrdem] = useState<Ordem>('desc')
  const [nivel, setNivel] = useState<Nivel>('municipio')
  const ufDoRanking = nivel === 'municipio' ? filtros.uf : undefined
  const { data, isPending, isError, error, refetch } = useRanking(filtros.produto, nivel, ordem, 10, ufDoRanking)
  const itens = data?.itens ?? []

  const values = itens.map((i) => i.preco_medio)
  const max = Math.max(...values, 0)

  const escopo = nivel === 'municipio' ? (filtros.uf ? `Municípios ${lugar.frase}` : 'Municípios do Brasil') : 'Estados'

  return (
    <Panel
      id="rankings"
      eyebrow="Ranking"
      title={`${ordem === 'desc' ? 'Mais caros' : 'Mais baratos'}: ${productLabel(filtros.produto).toLowerCase()}`}
      description={data?.mes ? `${escopo}, ${formatMonthLong(data.mes)}` : escopo}
      actions={
        <SegmentedControl<Ordem>
          label="Ordem do ranking"
          size="sm"
          value={ordem}
          onChange={setOrdem}
          options={[
            { value: 'desc', label: 'Mais caros' },
            { value: 'asc', label: 'Mais baratos' },
          ]}
        />
      }
    >
      <div className="mb-4">
        <SegmentedControl<Nivel>
          label="Nível do ranking"
          size="sm"
          value={nivel}
          onChange={setNivel}
          options={[
            { value: 'municipio', label: 'Municípios' },
            { value: 'uf', label: 'Estados' },
          ]}
        />
      </div>

      {isError ? (
        <ErrorState message={error.message} onRetry={() => refetch()} />
      ) : isPending ? (
        <div className="space-y-2.5">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : itens.length === 0 ? (
        <EmptyState hint="Municípios só entram no ranking com pelo menos 10 coletas no mês." />
      ) : (
        <LayoutGroup>
          <ol className="divide-y divide-line">
            <AnimatePresence initial={false} mode="popLayout">
              {itens.map((item) => (
                <motion.li
                  layout
                  key={`${item.uf}-${item.municipio_id ?? ''}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5"
                >
                  <span className="tnum text-sm text-muted">{item.posicao}</span>
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-medium text-ink">
                        {nivel === 'municipio' ? titleCase(item.nome) : item.nome}
                      </span>
                      <span className="shrink-0 text-xs text-muted">{item.uf}</span>
                    </span>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                      <motion.span
                        className="block h-full rounded-full bg-[var(--chart-series)]"
                        initial={false}
                        animate={{ width: `${(item.preco_medio / max) * 100}%` }}
                        transition={{ duration: 0.6, ease: EASE_OUT }}
                      />
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="tnum block text-sm font-semibold text-ink">{formatPrice(item.preco_medio)}</span>
                    <span className="tnum block text-[11px] text-muted">{formatNumber(item.qtd_coletas, 0)} coletas</span>
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </LayoutGroup>
      )}
    </Panel>
  )
}
